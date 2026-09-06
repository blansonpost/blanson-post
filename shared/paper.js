// The Blanson Post — the paper's own pages
//
// EDIT THIS FILE BY HAND. Unlike shared/articles.js, nothing generates it.
// When someone joins or leaves the club, or a scholarship deadline changes,
// change it here and the three designs all pick it up.
//
// Everything below was copied word for word from the old Wix site, archived in
// content/wix-export/ (about.txt, scholarships.txt, alumni.txt). The bios are
// what each student wrote about themselves — if you tidy one up, ask them first.
//
// Requires blocks.js (for date parsing). One IIFE, one global.

const Paper = (() => {

  // ── The news team ───────────────────────────────────────────────────────
  // 2025–2026, from the old "About" page. `name` has to match the byline on
  // their articles exactly, or their stories will not be listed next to them.
  const STAFF = [
    { name: "Jason Borrego",
      beats: "Poetry & Interviews",
      bio: "I'm a senior in the Audio/Video Production program here at Blanson. I enjoy watching competitive reality TV, writing, and am a huge fan of Honkai: Star Rail and Animal Crossing: New Horizons." },
    { name: "Melanie Cardenas",
      beats: "Art, Short Stories, & Houston Hotspots",
      bio: "Hello, I'm Melanie Cardenas and currently a senior at Blanson CTE High School! I'm interested in writing Short Stories, making Art, and writing about the Hotspots of Houston too! I really love to draw and I've also wrote scripts for my own comics." },
    { name: "Nathaniel Castro",
      beats: "Interviews, Life At Blanson, & Movie Reviews",
      bio: "Hello! I am a Senior attending Blanson CTE High School, currently enrolled in the Audio/Video Production program. I am deeply interested in the creation of expressionism, whether it's through music, poetry, or scriptwriting- I hope to find myself further indulging in this art form. Also I think penguins are the cutest animals to roam the Earth." },
    { name: "Ashley Choudja",
      beats: "Movie Reviews",
      bio: "Hiii, I am a senior at Blanson and I work under the movies section. I am a big fan of horror and 80's based movies." },
    { name: "Jean Folgar",
      beats: "Life at Blanson, Interviews, & Movies",
      bio: "I am a member of the newspaper club, National Arts Honor Society, debate and more. I am a junior, my program of study is Dental Assistant. I love to watch movies, bake and spend time with my family." },
    { name: "Kelly Martinez",
      beats: "Movie Reviews & Art",
      bio: "Hello, I'm Kelly, I am currently a junior and I am a very talkative and friendly person. I love all things creative!" },
    { name: "Clarissa Ortega",
      beats: "Photography & Life at Blanson",
      bio: "I am currently a junior here at Blanson CTE and in the A/V Program. I enjoy baking and sleeping, and I'm looking forward to this year!" },
    { name: "Esther Ramirez",
      beats: "Short Stories",
      bio: "Hi!!! I am Esther Ramirez. I am currently a junior in the Dental Assistant Program. I am very jolly and full of energy (even though I do fall asleep in class). My favorire hobbies are sewing and anything arts & crafts related." },
    { name: "Martha Ramirez",
      beats: "Art & Photography",
      bio: "Hey I'm Martha or also called Martita. People know me as a jolly person & a nerd! I enjoy drawing in my own free time or playing games with my friends ( ˶°ㅁ°) !!" },
    { name: "Josue Reyes",
      beats: "Photography & Poetry",
      bio: "I am a junior here at Blanson. I am a Photography 2 student that wants to share and develop his photos, and also pursue poetry as a hobby. I spend most of my time right now playing video games with friends and stressing about assignments." },
    { name: "Oliver Romero",
      beats: "Movie & Anime Reviews, Interviews",
      bio: "Hi, I'm Oliver Romero. I am a super big nerd who has a lot to say. I love video games, movies and anime and all the above and more. And if anyone wants to debate opinions I am here to hear. (=w=)/" },
    { name: "Joseph Zapata",
      beats: "Sports & Photography",
      bio: "I am a funny and energetic person who enjoys playing sports and video games. I believe everyone should be informed about the sports world!" }
  ];

  // ── Scholarships ────────────────────────────────────────────────────────
  // Every deadline here is from the old site and has already gone by, so the
  // page marks them closed rather than sending anyone to a dead form. Put the
  // new year's dates in and they light up again on their own.
  //
  // `url` is empty because the old page's APPLY buttons were images — the link
  // addresses were not in the archive. Paste them in as you find them.
  const SCHOLARSHIPS = [
    { name: 'Be Bold Scholarship',                     amount: '$25,000', awards: 1,   deadline: '2026-03-01', url: '' },
    { name: 'Hunt Heroes Foundation Scholarship Program', amount: '$5,000', awards: 26, deadline: '2026-03-04', url: '' },
    { name: 'FEEA',                                    amount: '',        awards: 200, deadline: '2026-03-12', url: '' },
    { name: 'NLHA Education Fund',                     amount: '$3,500',  awards: 4,   deadline: '2026-03-13', url: '' },
    { name: 'IMANA',                                   amount: '',        awards: 12,  deadline: '2026-03-15', url: '' },
    // The old page listed "Dolphin" and "Niche" on two lines under one deadline.
    // Recorded exactly as it appeared; check which is the scholarship and which
    // is the provider before anyone relies on it.
    { name: 'Dolphin',                                 amount: '$4,000',  awards: 113, deadline: '2026-03-31', url: '', provider: 'Niche' }
  ];

  // ── Alumni ──────────────────────────────────────────────────────────────
  // Graduates' own ventures, as the club listed them. The car detailing entry
  // also carried a personal mobile number on the old site; it is deliberately
  // left out here rather than republished to a new address without asking.
  const ALUMNI = [
    { what: 'Florist',        handle: '@dippedberrys',      note: 'Custom bouquets and berries.' },
    { what: 'Magazine',       handle: '',                   name: 'Angela Hernandez',
      note: 'Featured in Bowlegged H Magazine.' },
    { what: 'Video Creator',  handle: '@inspirevisionmedia', note: 'Creative content.' },
    { what: 'Car Detailing',  handle: '@1sickdetailer',     note: 'Detailing service for cars.' }
  ];

  // The alumni page also pointed at one of our own articles.
  const ALUMNI_STORY = 'life-after-blanson';

  // ── helpers ─────────────────────────────────────────────────────────────
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  // Says where a deadline stands today, so nobody has to remember to take an
  // expired scholarship down by hand.
  function deadline(iso) {
    const d = Blocks.parseDate(iso);
    if (!d) return { state: 'unknown', label: '', when: '', days: null };
    const days = Math.round((midnight(d) - midnight(new Date())) / 86400000);
    const when = Blocks.dateText({ date: iso });
    if (days <  0) return { state: 'closed', label: 'Closed',            when, days };
    if (days === 0) return { state: 'soon',  label: 'Closes today',      when, days };
    if (days <= 21) return { state: 'soon',  label: days + ' days left', when, days };
    return { state: 'open', label: 'Open', when, days };
  }

  const scholarships = () => SCHOLARSHIPS
    .map(s => ({ ...s, ...{ due: deadline(s.deadline) } }))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));

  const openCount = () => scholarships().filter(s => s.due.state !== 'closed').length;

  // Their own stories, so the team page is not just a list of names. Matched on
  // the byline exactly — see the note on STAFF.
  const storiesBy = name => (typeof ARTICLES === 'undefined' ? []
    : ARTICLES.filter(a => a.author && a.author === name));

  // Six people had bylines this year without ever being added to the About
  // page — some joined after it was written, one is a graduate. They are listed
  // separately rather than dropped: everyone who wrote for the paper gets their
  // name on the team page, and the club can move them up as bios come in.
  const contributors = () => {
    if (typeof ARTICLES === 'undefined') return [];
    const onTeam = new Set(STAFF.map(p => p.name));
    const seen = new Map();
    ARTICLES.forEach(a => {
      if (a.author && !onTeam.has(a.author)) seen.set(a.author, (seen.get(a.author) || 0) + 1);
    });
    return [...seen.entries()].sort((x, y) => x[0].localeCompare(y[0]))
      .map(([name, count]) => ({ name, count }));
  };

  // Initials for the designs that draw a little avatar.
  const initials = name => (String(name).match(/\b[A-Za-z]/g) || ['B'])
    .slice(0, 2).join('').toUpperCase();

  return {
    staff: () => STAFF.slice(),
    alumni: () => ALUMNI.slice(),
    alumniStory: () => ALUMNI_STORY,
    scholarships, openCount, deadline, storiesBy, contributors, initials
  };
})();
