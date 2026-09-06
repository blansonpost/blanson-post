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
    my ($slug, $section, $title, $author, $rating, $featured) = split /\t/, $line, 6;
    next unless $slug && $section;
    $_ //= '' for ($author, $rating, $featured);

    open my $B, '<:encoding(UTF-8)', "$txt/$slug.txt" or do { warn "MISSING body: $slug\n"; next; };
    my @body; my %meta;
    while (my $l = <$B>) {
        chomp $l;
        $l =~ s/^\s+|\s+$//g;
        next unless length $l;
        next if $l =~ /\|\s*blansonpost\s*$/;          # page-title line
        next if $l =~ $BYLINE_RE;                       # byline, captured in tsv
        next if $l =~ /^\s*by\s*:?\s+[A-Z\x{00c0}-\x{00ff}]/i && length($l) < 60;  # bare "By Name"
        # the headline often repeats as the first body line
        if (!@body) {
            (my $a = lc $l)     =~ s/[^a-z0-9]//g;
            (my $b = lc $title) =~ s/[^a-z0-9]//g;
            next if $a eq $b || ($a && index($b, $a) == 0 && length($a) > 6);
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

    my $excerpt = $body[0];
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

    my ($rv, $rmax) = $rating =~ m{^\s*([\d.]+)\s*/\s*(\d+)\s*$} ? ($1, $2) : (undef, undef);

    push @rows, {
        id => $id++, slug => $slug, section => $section, title => $title,
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

// ── Sections ────────────────────────────────────────────────────────────────
const SECTIONS = [
  { slug: 'campus',     name: 'Campus'     },
  { slug: 'interviews', name: 'Interviews' },
  { slug: 'sports',     name: 'Sports'     },
  { slug: 'gaming',     name: 'Gaming'     },
  { slug: 'books',      name: 'Books'      },
  { slug: 'film',       name: 'Film & TV'  },
  { slug: 'poetry',     name: 'Poetry'     },
  { slug: 'alumni',     name: 'Alumni'     },
  { slug: 'houston',    name: 'Houston'    }
];

const bySection  = s  => ARTICLES.filter(a => a.section === s);
const byId       = id => ARTICLES.find(a => a.id === Number(id)) || null;
const bySlug     = s  => ARTICLES.find(a => a.slug === s) || null;
const sectionName= s  => (SECTIONS.find(x => x.slug === s) || {}).name || s;
const featured   = () => ARTICLES.find(a => a.featured) || ARTICLES[0];
const byline     = a  => a.author || 'The Blanson Post';
const readingTime= a  => Math.max(1, Math.round(a.body.join(' ').split(/\s+/).length / 200));
const leadImage  = a  => (a.images && a.images.length ? 'assets/media/' + a.images[0] : null);
TAIL
close $O;

printf "wrote %s\n  %d articles\n", $out, scalar @rows;
my %c; $c{ $_->{section} }++ for @rows;
printf "  %-11s %d\n", $_, $c{$_} for sort keys %c;
my @noby = grep { !$_->{author} } @rows;
printf "  %d article(s) still need a byline\n", scalar @noby if @noby;
