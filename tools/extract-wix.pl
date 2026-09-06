#!/usr/bin/perl
# Extract readable article text from saved Wix page HTML.
#
#   perl tools/extract-wix.pl <raw-html-dir> <out-dir>
#
# Wix wraps each line in its own element, so short lines (poem lines, verse
# breaks) are real content — never filter by length. Site furniture is removed
# by exact match against the nav/footer strings instead.

use strict;
use warnings;
use utf8;
binmode(STDOUT, ':encoding(UTF-8)');

my ($raw, $out) = @ARGV;
die "usage: extract-wix.pl <raw-dir> <out-dir>\n" unless $raw && $out;
mkdir $out unless -d $out;

# Exact-match site furniture: nav items, footer, Wix chrome.
my %CHROME = map { lc($_) => 1 } (
    'top of page', 'bottom of page', 'The Blanson Post', 'Articles',
    'Book Reviews', 'Gaming', 'Movie & Show Reviews', 'Poetry & Short Stories',
    'Sports', 'Houston', 'Campus', 'Alumni', 'Art/Photography', 'Blanson F.C.',
    'Life At Blanson', 'Interviews', 'Staff', 'Scholarships', 'About', 'Home',
    'Log In', 'More', 'Instagram', 'Twitter', 'YouTube', 'Facebook', 'TikTok',
    'Use tab to navigate through the menu items.', '-->', 'VIEW MORE',
    'View More', 'Read More', 'Blanson Career and Technical Education Highschool',
    'Skip to Main Content', 'Get Started', 'Enter your email here', 'Subscribe',
    'Time is TBD', 'Location is TBD',
    # footer block, repeated on every page
    '311 West Road', 'Houston, TX 77038', '281.591.4950',
);

opendir(my $D, $raw) or die "cannot read $raw: $!";
my @files = sort grep { /\.html$/ } readdir $D;
closedir $D;

for my $f (@files) {
    (my $slug = $f) =~ s/\.html$//;
    local $/;
    open my $H, '<:encoding(UTF-8)', "$raw/$f" or next;
    my $h = <$H>;
    close $H;

    $h =~ s{<script\b.*?</script>}{}gsi;
    $h =~ s{<style\b.*?</style>}{}gsi;
    $h =~ s{<noscript\b.*?</noscript>}{}gsi;
    $h =~ s{<!--.*?-->}{}gs;

    $h =~ s{<br\s*/?>}{\n}gi;
    $h =~ s{</(p|div|h[1-6]|li|span|td|tr|section|article)>}{\n}gi;
    $h =~ s{<[^>]+>}{ }gs;

    $h =~ s/&nbsp;/ /g;      $h =~ s/&amp;/&/g;
    $h =~ s/&quot;/"/g;      $h =~ s/&lt;/</g;    $h =~ s/&gt;/>/g;
    $h =~ s/&#0?39;|&#8217;|&rsquo;|&lsquo;/'/g;
    $h =~ s/&#8220;|&#8221;|&ldquo;|&rdquo;/"/g;
    $h =~ s/&hellip;/.../g;  $h =~ s/&mdash;|&ndash;/--/g;
    $h =~ s/&eacute;/é/g;    $h =~ s/&aacute;/á/g;  $h =~ s/&atilde;/ã/g;
    $h =~ s/&iacute;/í/g;    $h =~ s/&oacute;/ó/g;  $h =~ s/&uacute;/ú/g;
    $h =~ s/&ntilde;/ñ/g;    $h =~ s/&ccedil;/ç/g;
    $h =~ s/&#(\d+);/chr($1)/ge;

    my (@lines, %seen);
    for my $l (split /\n/, $h) {
        $l =~ s/[ \t]+/ /g;
        $l =~ s/^\s+|\s+$//g;
        next unless length $l;
        next if $CHROME{ lc $l };
        next if $l =~ /wixstatic|parastorage|^\W+$/;
        next if $l =~ /This (site|website) was (created|built) (with|on) (the )?Wix/i;
        next if $seen{$l}++;                 # de-dupe, keep first occurrence
        push @lines, $l;
    }

    # Wix splits sentences across elements. Re-join a line onto the previous one
    # when it clearly continues it (starts lowercase or with punctuation).
    my @joined;
    for my $l (@lines) {
        if (@joined && $l =~ /^[a-z,;:.\)]/ && $joined[-1] !~ /[.!?:"]$/) {
            $joined[-1] .= ($l =~ /^[,;:.\)]/ ? '' : ' ') . $l;
        } else {
            push @joined, $l;
        }
    }

    open my $O, '>:encoding(UTF-8)', "$out/$slug.txt" or die $!;
    print $O "$_\n" for @joined;
    close $O;
}
printf "extracted %d pages to %s\n", scalar @files, $out;
