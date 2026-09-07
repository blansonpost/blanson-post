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
my $conf = "$root/content/site.conf";

# ── where the site lives ─────────────────────────────────────────────────────
# The shareable pages need the site's real address. Facebook, iMessage and every
# other thing that draws a link preview fetches the page from its own servers,
# so every address in those pages has to be absolute.
my %site = (base_url => '', design => 'traditional');
if (open my $C, '<:encoding(UTF-8)', $conf) {
    while (<$C>) {
        next if /^\s*#/ || !/\S/;
        $site{lc $1} = $2 if /^\s*(\w+)\s*=\s*(.*?)\s*$/;
    }
    close $C;
}
$site{base_url} =~ s{/*$}{/} if $site{base_url};
unless ($site{base_url}) {
    warn "  no base_url in content/site.conf - skipping the shareable pages,\n" .
         "  sitemap and feed. Nothing else is affected.\n";
}

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

# A topic's web address. Kept in step with Paper.topicSlug in shared/paper.js:
# if these two ever disagree, a link built by the build points at a page the
# site cannot find.
sub topic_slug {
    my $s = lc shift;
    $s =~ s/[^a-z0-9]+/-/g;
    $s =~ s/^-|-$//g;
    return $s;
}

# Two spellings of the same topic ("Sci-Fi" and "sci fi") collapse to one
# address, so the second one silently files its articles under the first one's
# name. Worth a warning: it is invisible in the TSV and obvious on the page.
my %topic_label;

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
    my ($slug, $section, $title, $author, $rating, $featured, $lead, $form, $interviewer,
        $date, $topics) = split /\t/, $line, 11;
    next unless $slug && $section;
    $_ //= '' for ($author, $rating, $featured, $lead, $form, $interviewer, $date, $topics);
    s/^\s+|\s+$//g for ($lead, $form, $interviewer, $date, $topics);

    # Topics cut across sections: a horror game and a horror film share one.
    # Free text in the TSV, an address here. Order is kept as typed — the first
    # one is the one shown when there is only room for one.
    my @topics;
    my %seen_topic;
    for my $t (split /,/, $topics) {
        $t =~ s/^\s+|\s+$//g;
        next unless length $t;
        my $ts = topic_slug($t);
        unless ($ts) { warn "  topic '$t' on '$slug' has no letters or digits in it. Ignored.\n"; next; }
        next if $seen_topic{$ts}++;
        if (exists $topic_label{$ts} && $topic_label{$ts} ne $t) {
            warn "  '$t' and '$topic_label{$ts}' are the same address ($ts) - " .
                 "they will share a page. Pick one spelling.\n";
        }
        $topic_label{$ts} //= $t;
        push @topics, $t;
    }

    # The old Wix site never recorded publication dates, so this column is blank
    # for all 41 archived articles. Blank stays blank: the site prints no date
    # rather than inventing one. Fill a row in as the club remembers it.
    # Checked for a real calendar day, not just the shape: "2025-13-45" and a
    # day/month swap both match the pattern, and JavaScript would silently roll
    # them over into a wrong date months away rather than reject them.
    if ($date) {
        my $ok = 0;
        if (my ($y, $m, $d) = $date =~ /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/) {
            my @len = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
            $len[1] = 29 if $y % 4 == 0 && ($y % 100 != 0 || $y % 400 == 0);
            $ok = $m >= 1 && $m <= 12 && $d >= 1 && $d <= $len[$m - 1];
        }
        unless ($ok) {
            warn "  bad date for '$slug': '$date' - want a real YYYY-MM-DD. Ignored.\n";
            $date = '';
        }
    }

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
        date => $date, topics => \@topics,
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
    print $O "    date: " . jstr($a->{date}) . ",\n" if $a->{date};
    print $O "    topics: [" . join(', ', map { jstr($_) } @{ $a->{topics} }) . "],\n"
        if @{ $a->{topics} };
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
// Dates. `dateTag(a)` gives a relative <time> for cards ("Yesterday",
// "3 days ago", "Mar 12"); pass true for the full date on an article page.
// All of them return '' for the archived 41, which have no known date.
const dateTag     = Blocks.dateTag;
const dateText    = Blocks.dateText;
const updatedText = Blocks.updatedText;
TAIL
close $O;

printf "wrote %s\n  %d articles\n", $out, scalar @rows;
my %c; $c{ $_->{section} }++ for @rows;
printf "  %-11s %d\n", $_, $c{$_} for sort keys %c;
my @noby = grep { !$_->{author} } @rows;
printf "  %d article(s) still need a byline\n", scalar @noby if @noby;

my %tc;
$tc{$_}++ for map { @{ $_->{topics} } } @rows;
if (%tc) {
    printf "  %d topics across %d article(s)\n",
        scalar keys %tc, scalar grep { @{ $_->{topics} } } @rows;
}
my @untopiced = grep { !@{ $_->{topics} } } @rows;
printf "  %d article(s) have no topic yet\n", scalar @untopiced if @untopiced;

# ── Shareable pages ──────────────────────────────────────────────────────────
# The site is one page with #/a/<slug> addresses, which is fine for a reader and
# useless for everyone else: Facebook, iMessage, Instagram and Google Classroom
# never run the JavaScript, so every story shared anywhere showed the same bare
# "The Blanson Post" with no headline and no photo. Google saw one page too.
#
# So each story also gets a small real page of its own at a/<slug>/. It carries
# that story's headline, opening lines and lead photo in the tags a link preview
# reads, it is readable on its own with no JavaScript at all, and a browser that
# does run JavaScript is handed straight on to the paper proper.
#
# It is a fallback, not a second copy of the design: plain type, no layout
# tricks, nothing that has to be kept in step with three stylesheets.

sub hesc {
    my $s = shift // '';
    $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g;
    $s =~ s/"/&quot;/g; $s =~ s/'/&#39;/g;
    return $s;
}

# XML is stricter than HTML about what may appear as text at all: a raw control
# character makes the whole feed unparseable rather than just looking wrong.
sub xesc {
    my $s = hesc(shift);
    $s =~ s/[\x00-\x08\x0b\x0c\x0e-\x1f]//g;
    return $s;
}

our @share_pages;

my %SECTION_NAME = (
    campus => 'Campus', life => 'Life at Blanson', interviews => 'Interviews',
    sports => 'Sports', gaming => 'Gaming', books => 'Books', film => 'Film & TV',
    poetry => 'Poetry', alumni => 'Alumni', houston => 'Houston',
);
sub section_name { return $SECTION_NAME{ $_[0] } || $_[0] }

# A description for a preview card. Two lines of a phone screen is the whole
# budget, so it is cut on a word rather than mid-syllable.
sub preview_text {
    my ($s, $limit) = @_;
    $s //= '';
    $s =~ s/\s+/ /g;
    $s =~ s/^\s+|\s+$//g;
    return $s if length($s) <= $limit;
    $s = substr($s, 0, $limit);
    $s =~ s/\s+\S*$//;
    return $s . '...';
}

# The archive records a day, never a time, so every item lands at midnight
# Houston time. A feed reader shows the day, which is all we actually know.
sub iso_date {                       # YYYY-MM-DD -> RFC 822, for the feed
    my $d = shift or return '';
    my ($y, $m, $dd) = $d =~ /^(\d{4})-(\d{2})-(\d{2})$/ or return '';
    my @mon = qw(Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec);
    return sprintf('%02d %s %04d 00:00:00 -0600', $dd, $mon[$m - 1], $y);
}

if ($site{base_url}) {
    my $base   = $site{base_url};
    my $design = $site{design} || 'traditional';
    my $pages  = 0;
    @share_pages = ();

    for my $a (@rows) {
        # The slug becomes a directory name and goes inside a JavaScript string
        # literal, so it is checked rather than trusted. Nothing in the TSV is
        # hostile today; a slug with a quote or a "../" in it would be, and the
        # check costs one line.
        unless ($a->{slug} =~ /^[A-Za-z0-9][A-Za-z0-9._-]*$/) {
            warn "  slug '$a->{slug}' has characters that cannot go in an address " .
                 "- no shareable page for it.
";
            next;
        }
        my $dir = "$root/a/$a->{slug}";
        unless (-d $dir) {
            # mkdir one level at a time: no File::Path needed, and it says which
            # one failed rather than dying on the whole path.
            mkdir "$root/a" unless -d "$root/a";
            mkdir $dir or do { warn "  cannot make $dir: $!\n"; next; };
        }

        my $url   = $base . 'a/' . $a->{slug} . '/';
        my $img   = @{ $a->{images} } ? $base . 'assets/media/' . $a->{images}[0] : '';
        my $desc  = preview_text($a->{excerpt}, 200);
        my $who   = $a->{author} || 'The Blanson Post';
        my $app   = "../../$design/#/a/$a->{slug}";

        my $body = '';
        if ($a->{form} eq 'verse') {
            $body = '<div class="verse">' .
                    join('<br>', map { hesc($_) } @{ $a->{body} }) . '</div>';
        } else {
            for my $line (@{ $a->{body} }) {
                # An interview reads as a transcript even here, or the questions
                # and answers run together into one wall of text.
                if ($a->{form} eq 'qa' && $line =~ /^([A-Z][A-Za-z.'-]{1,24}):\s*(.*)$/) {
                    $body .= '<p class="qa"><b>' . hesc($1) . '</b> ' . hesc($2) . "</p>\n";
                } else {
                    $body .= '<p>' . hesc($line) . "</p>\n";
                }
            }
        }
        # Everything after the lead, which is already at the top.
        for my $f (@{ $a->{images} }[1 .. $#{ $a->{images} }]) {
            next unless $f;
            $body .= '<img src="../../assets/media/' . hesc($f) . '" alt="">' . "\n";
        }

        my $topics = '';
        if (@{ $a->{topics} }) {
            $topics = '<p class="topics">Filed under ' .
                join(', ', map { hesc($_) } @{ $a->{topics} }) . '</p>';
        }

        open my $P, '>:encoding(UTF-8)', "$dir/index.html"
            or do { warn "  cannot write $dir/index.html: $!\n"; next; };
        print $P <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@{[ hesc($a->{title}) ]} — The Blanson Post</title>
<meta name="description" content="@{[ hesc($desc) ]}">
<link rel="canonical" href="@{[ hesc($url) ]}">

<!-- What a link preview reads. Everything absolute: the site fetching this
     page has no idea where our relative paths point. -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="The Blanson Post">
<meta property="og:title" content="@{[ hesc($a->{title}) ]}">
<meta property="og:description" content="@{[ hesc($desc) ]}">
<meta property="og:url" content="@{[ hesc($url) ]}">
@{[ $img ? qq{<meta property="og:image" content="} . hesc($img) . qq{">} : '' ]}
<meta property="article:section" content="@{[ hesc(section_name($a->{section})) ]}">
<meta property="article:author" content="@{[ hesc($who) ]}">
@{[ $a->{date} ? qq{<meta property="article:published_time" content="} . hesc($a->{date}) . qq{">} : '' ]}
<meta name="twitter:card" content="@{[ $img ? 'summary_large_image' : 'summary' ]}">
<meta name="twitter:title" content="@{[ hesc($a->{title}) ]}">
<meta name="twitter:description" content="@{[ hesc($desc) ]}">
@{[ $img ? qq{<meta name="twitter:image" content="} . hesc($img) . qq{">} : '' ]}

<style>
  :root{color-scheme:light}
  body{margin:0 auto;padding:34px 22px 60px;max-width:44rem;background:#f7f4ed;color:#14110d;
    font:17px/1.65 "Spectral",Georgia,"Times New Roman",serif}
  a{color:#8f1d1d}
  .home{font:600 12px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;
    color:#736a5c;text-decoration:none;display:inline-block;margin-bottom:24px}
  .kicker{font:600 12px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;
    color:#8f1d1d;margin-bottom:9px}
  h1{font-family:"Playfair Display",Georgia,serif;font-size:2.05rem;line-height:1.14;margin:0 0 12px}
  .by{font:14px/1.5 system-ui,sans-serif;color:#3c362d;border-bottom:1px solid #cfc7b6;
    padding-bottom:16px;margin-bottom:22px}
  img{max-width:100%;height:auto;display:block;margin:22px 0}
  .verse{white-space:normal;font-style:italic}
  .qa b{font-family:system-ui,sans-serif;font-size:14px}
  .topics{font:14px/1.5 system-ui,sans-serif;color:#736a5c}
  footer{margin-top:34px;padding-top:18px;border-top:1px solid #cfc7b6;
    font:14px/1.6 system-ui,sans-serif;color:#736a5c}
</style>
</head>
<body>

<a class="home" href="../../@{[ hesc($design) ]}/">The Blanson Post</a>

<article>
  <div class="kicker">@{[ hesc(section_name($a->{section})) ]}</div>
  <h1>@{[ hesc($a->{title}) ]}</h1>
  <div class="by">By @{[ hesc($who) ]}@{[ $a->{date} ? ' &middot; ' . hesc($a->{date}) : '' ]}</div>
@{[ @{ $a->{images} } ? '  <img src="../../assets/media/' . hesc($a->{images}[0]) . '" alt="">' : '' ]}
$body
  $topics
</article>

<footer>
  The student newspaper of Blanson CTE High School, Houston, Texas.
  <a href="../../@{[ hesc($design) ]}/">Read the rest of the paper</a>.
</footer>

<!-- A reader with JavaScript goes straight to the paper. replace(), not
     assign(): this page must not sit in the history and swallow the back
     button. Everything above stays put for anything that does not run scripts,
     which is every link preview and most of what crawls the web. -->
<script>location.replace(@{[ "'" . $app . "'" ]});</script>
</body>
</html>
HTML
        close $P;
        push @share_pages, $a->{slug};
        $pages++;
    }

    # ── sitemap ──────────────────────────────────────────────────────────────
    open my $SM, '>:encoding(UTF-8)', "$root/sitemap.xml" or die "cannot write sitemap: $!";
    print $SM qq{<?xml version="1.0" encoding="UTF-8"?>\n};
    print $SM qq{<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n};
    print $SM "  <url><loc>" . xesc($base) . "</loc></url>\n";
    for my $a (@rows) {
        print $SM "  <url><loc>" . xesc($base . 'a/' . $a->{slug} . '/') . "</loc>" .
            ($a->{date} ? "<lastmod>" . xesc($a->{date}) . "</lastmod>" : '') . "</url>\n";
    }
    print $SM "</urlset>\n";
    close $SM;

    # ── feed ─────────────────────────────────────────────────────────────────
    open my $FD, '>:encoding(UTF-8)', "$root/feed.xml" or die "cannot write feed: $!";
    print $FD qq{<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n};
    print $FD "  <title>The Blanson Post</title>\n";
    print $FD "  <link>" . xesc($base) . "</link>\n";
    print $FD "  <description>The student newspaper of Blanson CTE High School, Houston, Texas.</description>\n";
    print $FD "  <language>en-us</language>\n";
    for my $a (@rows) {
        my $u = $base . 'a/' . $a->{slug} . '/';
        print $FD "  <item>\n";
        print $FD "    <title>" . xesc($a->{title}) . "</title>\n";
        print $FD "    <link>" . xesc($u) . "</link>\n";
        print $FD "    <guid isPermaLink=\"true\">" . xesc($u) . "</guid>\n";
        print $FD "    <description>" . xesc(preview_text($a->{excerpt}, 400)) . "</description>\n";
        print $FD "    <category>" . xesc(section_name($a->{section})) . "</category>\n";
        my $rfc = iso_date($a->{date});
        print $FD "    <pubDate>$rfc</pubDate>\n" if $rfc;
        print $FD "  </item>\n";
    }
    print $FD "</channel>\n</rss>\n";
    close $FD;

    # ── robots ───────────────────────────────────────────────────────────────
    # The newsroom is already marked noindex in its own <head>; this says the
    # same thing to anything that reads robots.txt first and never gets there.
    # Neither is a lock - see docs/going-live.md.
    open my $RB, '>:encoding(UTF-8)', "$root/robots.txt" or die "cannot write robots: $!";
    print $RB "# GENERATED by tools/build-articles.pl - do not edit.\n";
    print $RB "User-agent: *\n";
    print $RB "Disallow: /admin/\n";
    print $RB "Allow: /\n\n";
    print $RB "Sitemap: ${base}sitemap.xml\n";
    close $RB;

    printf "  %d shareable page(s) -> a/<slug>/, opening in %s/\n", $pages, $design;
    print  "  sitemap.xml, feed.xml, robots.txt\n";
}

# ── Slug lists for the newsroom and the designs ──────────────────────────────
# Written last, because one of the two lists is only known once the shareable
# pages have been written.
#
# RESERVED_SLUGS: every address the archive already uses, so a student naming a
# review "Alien" cannot make Josue Reyes's poem unreachable. Its own small file
# because the newsroom should not have to load 160 KB of article bodies to find
# out whether a name is free.
#
# SHARE_PAGES: the stories that have a page of their own at a/<slug>/, and so a
# link worth pasting anywhere a preview will be drawn. Only what was really
# written — a slug the build refused is reserved but has no page — so the Share
# button never hands anybody an address that 404s.
open my $S, '>:encoding(UTF-8)', "$root/shared/reserved-slugs.js" or die $!;
print $S "// GENERATED by tools/build-articles.pl \x{2014} do not edit.\n";
print $S "// Web addresses already used by the archived articles.\n";
print $S "window.RESERVED_SLUGS = [\n";
print $S join(",\n", map { "  " . jstr($_->{slug}) } @rows);
print $S "\n];\n\n";
print $S "// Stories that also have a shareable page at a/<slug>/.\n";
print $S "window.SHARE_PAGES = [\n";
print $S join(",\n", map { "  " . jstr($_) } @share_pages);
print $S "\n];\n";
close $S;
