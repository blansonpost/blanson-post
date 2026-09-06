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
  //
  // `photo` is their headshot in assets/media/. The pairing came from the live
  // About page, where each photo sits immediately before its name — and nine of
  // the twelve filenames (jason, cardenas, choudja, martinez, clarissa, ramirez,
  // reyes, romero, zapata) name the person outright, which confirms the order
  // for the three that were saved as "Untitled design".
  const STAFF = [
    { name: "Jason Borrego",
      photo: "6deed7_335e5d6e02134698ac51da187c7b038d.jpg",
      beats: "Poetry & Interviews",
      bio: "I'm a senior in the Audio/Video Production program here at Blanson. I enjoy watching competitive reality TV, writing, and am a huge fan of Honkai: Star Rail and Animal Crossing: New Horizons." },
    { name: "Melanie Cardenas",
      photo: "ad9c70_c92297f1ac0b48b79a3055f1e5aac7ae.jpg",
      beats: "Art, Short Stories, & Houston Hotspots",
      bio: "Hello, I'm Melanie Cardenas and currently a senior at Blanson CTE High School! I'm interested in writing Short Stories, making Art, and writing about the Hotspots of Houston too! I really love to draw and I've also wrote scripts for my own comics." },
    { name: "Nathaniel Castro",
      photo: "ad9c70_565d8c8c31c54efbb6712cfb55f9982e.jpg",
      beats: "Interviews, Life At Blanson, & Movie Reviews",
      bio: "Hello! I am a Senior attending Blanson CTE High School, currently enrolled in the Audio/Video Production program. I am deeply interested in the creation of expressionism, whether it's through music, poetry, or scriptwriting- I hope to find myself further indulging in this art form. Also I think penguins are the cutest animals to roam the Earth." },
    { name: "Ashley Choudja",
      photo: "ad9c70_992a441ce9244501ab0eb615b55a4249.png",
      beats: "Movie Reviews",
      bio: "Hiii, I am a senior at Blanson and I work under the movies section. I am a big fan of horror and 80's based movies." },
    { name: "Jean Folgar",
      photo: "ad9c70_48d3bcc740c74c2589b7022c8ab9c8d1.jpg",
      beats: "Life at Blanson, Interviews, & Movies",
      bio: "I am a member of the newspaper club, National Arts Honor Society, debate and more. I am a junior, my program of study is Dental Assistant. I love to watch movies, bake and spend time with my family." },
    { name: "Kelly Martinez",
      photo: "ad9c70_b637d4abaa8741179d13ef2f10545a05.png",
      beats: "Movie Reviews & Art",
      bio: "Hello, I'm Kelly, I am currently a junior and I am a very talkative and friendly person. I love all things creative!" },
    { name: "Clarissa Ortega",
      photo: "ad9c70_cecdfad0ba3a4cb5b4a7e6abe44e7056.png",
      beats: "Photography & Life at Blanson",
      bio: "I am currently a junior here at Blanson CTE and in the A/V Program. I enjoy baking and sleeping, and I'm looking forward to this year!" },
    { name: "Esther Ramirez",
      photo: "ad9c70_eee2be44a3364a66b30e50c63f1442a5.jpg",
      beats: "Short Stories",
      bio: "Hi!!! I am Esther Ramirez. I am currently a junior in the Dental Assistant Program. I am very jolly and full of energy (even though I do fall asleep in class). My favorire hobbies are sewing and anything arts & crafts related." },
    { name: "Martha Ramirez",
      photo: "ad9c70_75ddbea7410241baa2fb0d1e9c1f70a2.png",
      beats: "Art & Photography",
      bio: "Hey I'm Martha or also called Martita. People know me as a jolly person & a nerd! I enjoy drawing in my own free time or playing games with my friends ( ˶°ㅁ°) !!" },
    { name: "Josue Reyes",
      photo: "ad9c70_a1dec543f0c1484d9ec2d917ad8d494b.png",
      beats: "Photography & Poetry",
      bio: "I am a junior here at Blanson. I am a Photography 2 student that wants to share and develop his photos, and also pursue poetry as a hobby. I spend most of my time right now playing video games with friends and stressing about assignments." },
    { name: "Oliver Romero",
      photo: "ad9c70_5f0df340c4054c559959bb0d0a691fb2.png",
      beats: "Movie & Anime Reviews, Interviews",
      bio: "Hi, I'm Oliver Romero. I am a super big nerd who has a lot to say. I love video games, movies and anime and all the above and more. And if anyone wants to debate opinions I am here to hear. (=w=)/" },
    { name: "Joseph Zapata",
      photo: "ad9c70_8324b532ff2749159adef746064305e0.png",
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

  // ── Art & photography ───────────────────────────────────────────────────
  // The old Art/Photography page. Event galleries are credited exactly as it
  // credited them — the heading sits above the run of photos, the credit below.
  //
  // The three single pieces were checked by opening the files, not by trusting
  // the page order: the comic really is a comic, "Intruder" really is the dark
  // bedroom scene, and Clarissa's is a designed photography spread.
  const GALLERIES = [
    { title: 'Homecoming', year: '2025 – 2026', credit: 'Provided by Clarissa Ortega',
      photos: [
        "ad9c70_e0ec9b20751f4f5fb246463afdcaafcb.jpg",
        "ad9c70_da772cb6ab8e43bcbe170b1190be8cd0.jpg",
        "ad9c70_260051f48fc64272b0773333fa145e87.jpg",
        "ad9c70_7dd6a75577434fbc86f12d6e26cde957.jpg",
        "ad9c70_49ac285ef12645889c826417fd85ffa1.jpg",
        "ad9c70_cb563f9054774967a097b0d919d073c3.jpg",
        "ad9c70_4d62b034e05c40ba8c6da9fc7d197fd5.jpg",
        "ad9c70_a50b6dcea0774dcab37db6f8e681fef0.jpg",
        "ad9c70_7f64e6f5f94046b49cf8f69f436e3fba.jpg",
        "ad9c70_ed8dc3b24e504a01916be8dc840ff86d.jpg"
      ] },
    { title: 'Trunk or Treat', year: '2025 – 2026', credit: 'Provided by Mr. Martin',
      photos: [
        "ad9c70_c19a2d9467ca4b4694e805e504dd8406.jpg",
        "ad9c70_01f884d277604e7f8fc893f22871fb7c.jpg",
        "ad9c70_bb758620b6e642c1a28a1ce3b0fee2a5.jpg",
        "ad9c70_12acd7df26d94cac983b82c880f3a872.jpg",
        "ad9c70_91ec5caa37d3465e9f78ba5419d6b3c3.jpg",
        "ad9c70_7298cc397e64419d8825ba1b7c3e6bc2.jpg",
        "ad9c70_a0f97f3c465845c784377e01f37e640c.jpg",
        "ad9c70_59575b9356af49b1b5050ec070aa200c.jpg",
        "ad9c70_2a6472e9bb8e4ca2a953dc36594ad351.jpg",
        "ad9c70_f4309af1dffe46c0b432a9a5cf8944c6.jpg",
        "ad9c70_65bea7d125954739ae2d3aa8e7b7d307.jpg",
        "ad9c70_c9bce3de2dbd4cd39d23cd0d18bdd1f5.jpg",
        "ad9c70_6cf235addea84de187f529ede63f9283.jpg",
        "ad9c70_3a73cbd64adf400fab0d5d7041a05149.jpg",
        "ad9c70_f74d083e90d4432b9ccf75dab249b006.jpg"
      ] },
    { title: 'Vase Competition', year: '2024 – 2025', credit: 'Provided by Mr. Peel',
      photos: [
        "ad9c70_84a9873a1ed44ad4a18242fd7b457160.jpg",
        "ad9c70_776ac1da583c40578193e44fc687ab49.jpg",
        "ad9c70_d90acacb895b4b098dd58144304fd15d.jpg",
        "ad9c70_b0874b806e704b0cbf18a604e973de7c.jpg",
        "ad9c70_96a280cbc7ee40ac9fb6b6521ce98751.jpg",
        "ad9c70_4fb3cd97056b46bea02999b448a813d1.jpg",
        "ad9c70_5a3f953eede24d628bf3b53ece615527.jpg",
        "ad9c70_41744c82dfec488db50a67100a6dd3a3.jpg",
        "ad9c70_174917d6e7b44d0c9bce82e6b394d483.jpg",
        "ad9c70_dba0c4068f844a2bb4908c05782a3920.jpg",
        "ad9c70_d8fdd0dff7684adda93add69ba4ba23a.jpg",
        "ad9c70_6d0b70c20aaf42cbbfd7e11e21aed835.jpg",
        "ad9c70_da26e6afb6634762b2c78f846c1817a5.jpg",
        "ad9c70_84d1a0f18e644aa98d4f5f1998449a24.jpg",
        "ad9c70_20ddf53ac4c44daa822009effec741dc.jpg",
        "ad9c70_f71a330115c5400b929a40cc1af05921.jpg",
        "ad9c70_a9b8e836ba084936b8d5a5c8591bade4.jpg",
        "ad9c70_32041b0d206740729c52c38aed1723a0.jpg",
        "ad9c70_3c769d77b74449adba7a2ba62e4b4f8d.jpg",
        "ad9c70_f43c1099bee3441fa9be04721238e144.jpg",
        "ad9c70_ea8318df2b8749e8bbe1523ad095d6cf.jpg",
        "ad9c70_040e96e2d79145638c4aa63340974906.jpg",
        "ad9c70_8608429308dc4f5ea35fd9661572028f.jpg",
        "ad9c70_697740cc519f4da2a4658129b4043d83.jpg",
        "ad9c70_89e1918bfb1a48cda3a3f5e438036c53.jpg",
        "ad9c70_1a73f1ae34cc4446b9e046ff2acb0af5.jpg",
        "ad9c70_63d392edb8b949bbaee88cf20d2d92bc.jpg",
        "ad9c70_4b4baf4fb8804165a58290290c6f0646.jpg",
        "ad9c70_72b5b65ac9a64ae7889708e87e81fbed.jpg",
        "ad9c70_5b1dd3a35a1844a2944a81844c2b84fd.jpg",
        "ad9c70_cebb6fa74e1e4239b66862d4443fb012.jpg"
      ] },
    // Joseph Zapata's night photography. The old page split these between two
    // titles — "Nature is Better at Night" and "The Night of the Lone Wolf in a
    // Pack" — plus shots from a Critical Mass Houston bike ride, but which photo
    // belonged to which series could not be recovered from the archive. They are
    // kept together under his name rather than split up on a guess; move them
    // into separate entries here once someone can say which is which.
    { title: 'Night photography', year: '', credit: 'Photos taken by Joseph Zapata',
      note: 'From “Nature is Better at Night”, “The Night of the Lone Wolf in a Pack”, ' +
            'and a Critical Mass Houston bike ride.',
      photos: [
        "ad9c70_e618d0b21d724693a329e03e8c6f14c1.jpg",
        "ad9c70_74ee76e9c6c44c83a60b7847adacb4ed.jpg",
        "ad9c70_f7d4a026d55843dfb35c4f453a71febd.jpg",
        "ad9c70_9ce0bdec4ba844c7b1056b4b3564a849.jpg",
        "ad9c70_fca3415433d547adb35788e09b2548e4.jpg",
        "ad9c70_9336a3d7670b4bfbae4626bc1c832d13.jpg",
        "ad9c70_5c340ab1203344639ef84d3987b6d6b6.jpg",
        "ad9c70_794141fd7e6f4b348424e5c49d0bdf9d.jpg",
        "ad9c70_bef7b241b9ff47f083591d80c9d8e776.jpg"
      ] }
  ];

  // Single pieces, each by one student.
  const ARTWORK = [
    { title: 'Photography', by: 'Clarissa Ortega', credit: 'Created by Clarissa Ortega',
      file: "ad9c70_279173676e474fbb9cea5187c17f3279.jpg" },
    { title: 'What can I even wear?!', by: 'Martha Ramirez', credit: 'Drawing by Martha Ramirez',
      file: "ad9c70_2103e1801d3340fab227330cbc939030.jpg" },
    { title: 'Intruder', by: 'Marlene Garcia', credit: 'Drawing by Marlene Garcia',
      file: "ad9c70_26f76f052b18492ba36deb487effaf8b.jpg" }
  ];

  // ── Blanson F.C. ────────────────────────────────────────────────────────
  // The team runs its own site now — roster, fixtures, results, awards and
  // photos — so the paper points at it rather than keeping a stale copy.
  const FC = {
    name: 'Blanson F.C.',
    url: 'https://sites.google.com/aldineisd.org/blansonfc/news',
    blurb: 'The team keeps its own site: news, roster, pre-season, regular season, ' +
           'playoffs, player of the game, awards, records and photos.'
  };

  // ── Search ──────────────────────────────────────────────────────────────
  // Everything is already in memory — 41 archived articles plus anything the
  // newsroom has published — so this is a plain scan, no index to keep in step.
  //
  // Accents are folded so "Fogo de Chao" finds "Fogo de Chão" and "gonzalez"
  // finds "González": a student typing on a school keyboard should not have to
  // produce the right diacritic to find a story.
  const fold = t => String(t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

  const textOf = a => [
    a.title, a.author, a.excerpt,
    (a.body || []).join(' '),
    typeof Sections !== 'undefined' ? Sections.name(a.section) : a.section
  ].join(' ');

  // Where the words were found decides the order: a story called "Alien" should
  // beat one that mentions aliens in passing.
  function search(query, limit) {
    const q = fold(query).trim();
    if (q.length < 2 || typeof ARTICLES === 'undefined') return [];
    const words = q.split(/\s+/).filter(Boolean);

    const hits = [];
    for (const a of ARTICLES) {
      const title = fold(a.title), author = fold(a.author);
      const sect  = fold(typeof Sections !== 'undefined' ? Sections.name(a.section) : a.section);
      const body  = fold(textOf(a));
      let score = 0, matchedAll = true;

      for (const w of words) {
        if (!body.includes(w)) { matchedAll = false; break; }
        if (title === q)             score += 120;
        if (title.startsWith(w))     score += 40;
        if (title.includes(w))       score += 30;
        if (author.includes(w))      score += 20;
        if (sect.includes(w))        score += 10;
        score += 1;
      }
      if (!matchedAll) continue;
      hits.push({ article: a, score, snippet: snippetFor(a, words) });
    }
    hits.sort((x, y) => y.score - x.score || String(x.article.title).localeCompare(String(y.article.title)));
    return limit ? hits.slice(0, limit) : hits;
  }

  // A window of the real sentence the word appears in, so a result shows why it
  // matched rather than just repeating the standfirst.
  function snippetFor(a, words) {
    const lines = [a.excerpt].concat(a.body || []).filter(Boolean);
    for (const line of lines) {
      const f = fold(line);
      for (const w of words) {
        const at = f.indexOf(w);
        if (at < 0) continue;
        const from = Math.max(0, at - 60);
        const to   = Math.min(line.length, at + w.length + 90);
        return (from ? '…' : '') + line.slice(from, to).trim() + (to < line.length ? '…' : '');
      }
    }
    return a.excerpt || '';
  }

  // Wraps each match in <mark>. Takes text that is ALREADY escaped, and only
  // ever inserts <mark>/</mark>, so nothing a student typed can become markup.
  function highlight(escapedText, query) {
    const words = fold(query).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return escapedText;
    const folded = fold(escapedText);
    const spans = [];
    for (const w of words) {
      let i = folded.indexOf(w);
      while (i !== -1) { spans.push([i, i + w.length]); i = folded.indexOf(w, i + w.length); }
    }
    if (!spans.length) return escapedText;
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [spans[0]];
    for (const s of spans.slice(1)) {
      const last = merged[merged.length - 1];
      if (s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
      else merged.push(s);
    }
    let out = '', at = 0;
    for (const [a, b] of merged) {
      out += escapedText.slice(at, a) + '<mark>' + escapedText.slice(a, b) + '</mark>';
      at = b;
    }
    return out + escapedText.slice(at);
  }

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
    galleries: () => GALLERIES.slice(),
    artwork: () => ARTWORK.slice(),
    fc: () => FC,
    photoCount: () => GALLERIES.reduce((n, g) => n + g.photos.length, 0) + ARTWORK.length,
    search, highlight,
    scholarships, openCount, deadline, storiesBy, contributors, initials
  };
})();
