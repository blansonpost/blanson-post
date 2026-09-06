#!/usr/bin/perl
# Build shared/articles.js from the Wix content archive.
#
# Body text is copied verbatim from content/wix-export/<slug>.txt — never
# retyped or paraphrased. Metadata comes from content/articles.tsv.
# Re-run after editing either one:  perl tools/build-articles.pl

use strict;
use warnings;
use utf8;
binmode(STDOUT, ':encoding(UTF-8)');

my $root = shift // '.';
my $tsv  = "$root/content/articles.tsv";
my $txt  = "$root/content/wix-export";
my $imap = "$root/content/image-map.txt";
my $out  = "$root/shared/articles.js";

# ── image map: slug -> [files] ───────────────────────────────────────────────
my (%images, $cur);
open my $M, '<', $imap or die "no image map: $!";
while (<$M>) {
    chomp;
    $cur = $1 if /^\s+slug:\s*(\S+)/;
    push @{ $images{$cur} }, $1 if $cur && /^\s+-\s+(\S+)/;
}
close $M;

# what's actually on disk (extension may differ after the resize pass)
my %ondisk;
if (opendir my $D, "$root/assets/media") {
    for (readdir $D) { next if /^\./; my $s = $_; $s =~ s/\.[^.]+$//; $ondisk{$s} = $_; }
    closedir $D;
}

sub jstr {                      # escape a Perl string for a JS double-quoted literal
    my $s = shift // '';
    $s =~ s/\\/\\\\/g; $s =~ s/"/\\"/g;
    $s =~ s/\r//g;    $s =~ s/\n/\\n/g;
    $s =~ s/([\x00-\x1f])/sprintf('\\u%04x', ord $1)/ge;
    return '"' . $s . '"';
}

# lines that are metadata or furniture, not article body
# `rating` is captured structurally from the TSV, so it is dropped here rather
# than kept as a display string (the star glyphs don't survive cleanly anyway).
my $META_RE  = qr/^\s*(genre|platforms?|game release date|release date|director|writers?|publisher|developer|studio|runtime)\s*:/i;
my $DROP_RE  = qr/^\s*rating\s*:/i;
my $BYLINE_RE = qr/^\s*[-–—]?\s*(written(\s+and\s+(edited|directed))?\s+by|reviewed\s+by|interview(ed)?\s+by|photos?\s+taken\s+by|created\s+by|provided\s+by|story\s+by)\b\s*:?/i;

my (@rows, $id);
$id = 1;
open my $T, '<:encoding(UTF-8)', $tsv or die "no tsv: $!";
while (my $line = <$T>) {
    chomp $line;
    next if $line =~ /^\s*#/ || $line !~ /\S/;
    my ($slug, $section, $title, $author, $rating, $featured, $lead, $form, $interviewer)
        = split /\t/, $line, 9;
    next unless $slug && $section;
    $_ //= '' for ($author, $rating, $featured, $lead, $form, $interviewer);
    s/^\s+|\s+$//g for ($lead, $form, $interviewer);

    # `form` replaces two pieces of guesswork: a title-prefix regex for poems
    # and a count of "Word:" lines for interviews. Warn rather than fail, so an
    # un-updated row still builds — but never goes unnoticed.
    if (!$form) {
        $form = ($section eq 'poetry' && $title !~ /^A Thief/) ? 'verse' : 'story';
        warn "  no form for '$slug' — guessed '$form'\n";
    }

    open my $B, '<:encoding(UTF-8)', "$txt/$slug.txt" or do { warn "MISSING body: $slug\n"; next; };
    my @body; my %meta; my $dropped = 0;
    while (my $l = <$B>) {
        chomp $l;
        $l =~ s/^\s+|\s+$//g;
        next unless length $l;
        next if $l =~ /\|\s*blansonpost\s*$/;          # page-title line
        next if $l =~ $BYLINE_RE;                       # byline, captured in tsv
        next if $l =~ /^\s*by\s*:?\s+[A-Z\x{00c0}-\x{00ff}]/i && length($l) < 60;  # bare "By Name"
        # The headline usually repeats as the first body line — sometimes split
        # across several elements ("Meet" / "Mr. Haventine"). Drop those, but
        # only before any real prose has started, and never in verse.
        if (!@body) {
            (my $a = lc $l)     =~ s/[^a-z0-9]//g;
            (my $b = lc $title) =~ s/[^a-z0-9]//g;
            # Only a *short* line can be a repeated headline. Without this guard,
            # an article whose opening sentence starts with its own title (e.g.
            # "Malignant is a 2021 horror film…") loses its entire body.
            my $headline_len = length($l) <= length($title) + 20;
            if ($a && $b && $headline_len && (   $a eq $b
                                              || (length($a) > 6 && index($b, $a) == 0)
                                              || (length($b) > 6 && index($a, $b) == 0))) {
                next;
            }
            # short, unpunctuated leading fragment = part of a split headline
            next if $section ne 'poetry' && length($l) < 45 && $l !~ /[.!?"]$/ && $dropped++ < 3;
        }
        next if $l =~ $DROP_RE;
        if ($l =~ $META_RE) {                           # keep as structured meta
            my ($k, $v) = split /:/, $l, 2;
            $k =~ s/^\s+|\s+$//g; $v =~ s/^\s+|\s+$//g;
            $meta{ lc $k } = $v if defined $v && length $v;
            next;
        }
        push @body, $l;
    }
    close $B;
    next unless @body;

    # Lead with the first line that's actually a sentence, not a stray fragment.
    # Verse is the exception: a poem's opening line is the opening line.
    my $excerpt;
    if ($form eq 'verse') {
        $excerpt = join(' / ', grep { length } @body[0 .. ($#body < 2 ? $#body : 2)]);
    } else {
        ($excerpt) = grep { length($_) >= 60 } @body;
        $excerpt //= $body[0];
    }
    if (length($excerpt) > 300) {
        $excerpt = substr($excerpt, 0, 300);
        $excerpt =~ s/\s+\S*$//;
        $excerpt .= '…';
    }

    my @imgs;
    for my $f (@{ $images{$slug} || [] }) {
        my $stem = $f; $stem =~ s/\.[^.]+$//;
        push @imgs, $ondisk{$stem} if $ondisk{$stem};
    }
    # A page's images come out in DOM order, which is often decorative-first.
    # The `lead` column promotes the one that should head the article.
    if ($lead) {
        @imgs = ((grep { $_ eq $lead } @imgs), (grep { $_ ne $lead } @imgs));
        unshift @imgs, $lead unless grep { $_ eq $lead } @imgs;
    }

    my ($rv, $rmax) = $rating =~ m{^\s*([\d.]+)\s*/\s*(\d+)\s*$} ? ($1, $2) : (undef, undef);

    push @rows, {
        id => $id++, slug => $slug, section => $section, title => $title,
        form => $form, interviewer => $interviewer,
        author => ($author eq '?' ? '' : $author),
        rating => $rv, ratingMax => $rmax,
        featured => ($featured =~ /^y/i ? 1 : 0),
        excerpt => $excerpt, body => \@body, meta => \%meta, images => \@imgs,
    };
}
close $T;

# ── emit ─────────────────────────────────────────────────────────────────────
open my $O, '>:encoding(UTF-8)', $out or die "cannot write $out: $!";
print $O <<'HEAD';
// The Blanson Post — article data
//
// GENERATED FILE — do not edit by hand.
// Body text is copied verbatim from the students' original articles archived in
// content/wix-export/. To change anything, edit content/articles.tsv (metadata)
// or the archive (text), then re-run:  perl tools/build-articles.pl
//
// An empty `author` means the byline could not be found on the old site. Ask the
// club who wrote it — never guess.

const ARTICLES = [
HEAD

for my $a (@rows) {
    print $O "  {\n";
    print $O "    id: $a->{id},\n";
    print $O "    slug: " . jstr($a->{slug}) . ",\n";
    print $O "    section: " . jstr($a->{section}) . ",\n";
    print $O "    form: " . jstr($a->{form}) . ",\n";
    print $O "    interviewer: " . jstr($a->{interviewer}) . ",\n" if $a->{interviewer};
    print $O "    title: " . jstr($a->{title}) . ",\n";
    print $O "    author: " . jstr($a->{author}) . ",\n";
    print $O "    featured: " . ($a->{featured} ? 'true' : 'false') . ",\n";
    if (defined $a->{rating}) {
        print $O "    rating: $a->{rating},\n    ratingMax: $a->{ratingMax},\n";
    }
    if (%{ $a->{meta} }) {
        my @m = map { "      " . jstr($_) . ": " . jstr($a->{meta}{$_}) } sort keys %{ $a->{meta} };
        print $O "    meta: {\n" . join(",\n", @m) . "\n    },\n";
    }
    if (@{ $a->{images} }) {
        print $O "    images: [" . join(', ', map { jstr($_) } @{ $a->{images} }) . "],\n";
    }
    print $O "    excerpt: " . jstr($a->{excerpt}) . ",\n";
    print $O "    body: [\n";
    print $O join(",\n", map { "      " . jstr($_) } @{ $a->{body} });
    print $O "\n    ]\n  },\n";
}

print $O <<'TAIL';
];

// ── Helpers ─────────────────────────────────────────────────────────────────
// These are thin aliases. The real implementations live in shared/blocks.js and
// shared/sections.js, so a rendering bug can be fixed by editing JavaScript
// instead of re-running a Perl build. Load order: sections.js, blocks.js, then
// this file.

const SECTIONS   = Sections.all();
const sectionName= Sections.name;

const bySection  = s  => ARTICLES.filter(a => a.section === s);
// String compare: newsroom articles carry ids like "db-a1z2x", and Number() on
// those is NaN, which never equals anything.
const byId       = id => ARTICLES.find(a => String(a.id) === String(id)) || null;
const bySlug     = s  => ARTICLES.find(a => a.slug === s) || null;
const featured   = () => ARTICLES.find(a => a.featured) || ARTICLES[0];

const esc        = Blocks.esc;
const imageUrl   = Blocks.imageUrl;
const leadImage  = Blocks.leadImage;
const byline     = Blocks.byline;
const readingTime= Blocks.readingTime;
const stars      = Blocks.stars;
const isVerse    = Blocks.isVerse;
const isQA       = Blocks.isQA;
const speakerOf  = Blocks.speakerOf;
const layoutBlocks = Blocks.of;
TAIL
close $O;

printf "wrote %s\n  %d articles\n", $out, scalar @rows;
my %c; $c{ $_->{section} }++ for @rows;
printf "  %-11s %d\n", $_, $c{$_} for sort keys %c;
my @noby = grep { !$_->{author} } @rows;
printf "  %d article(s) still need a byline\n", scalar @noby if @noby;
