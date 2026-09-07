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
  // CHECKED ON 6 SEPTEMBER 2026, each one on the organisation's own site.
  //
  // Two kinds of entry, and the difference matters:
  //
  //   `deadline`  a firm date published for the CURRENT cycle. Trustworthy.
  //   `window`    no date out yet, so this is the month range the programme has
  //               run to before. A guide for planning, NOT a date to rely on.
  //
  // Never turn a `window` into a `deadline` because it looks tidier. A wrong
  // date here costs somebody a scholarship.
  //
  // `verified` is the day a person last opened the official page and checked.
  // The page shows it, so a reader can see how stale the list is.
  const CHECKED = '2026-09-06';

  const SCHOLARSHIPS = [
    // ── open now, firm dates ────────────────────────────────────────────
    { name: 'The Gates Scholarship', org: 'Bill & Melinda Gates Foundation',
      amount: 'Full cost of attendance', awards: 300, deadline: '2026-09-15',
      who: 'Seniors who are Pell-eligible, US citizens or permanent residents, minimum 3.3 GPA',
      url: 'https://www.thegatesscholarship.org/scholarship', verified: CHECKED },

    { name: 'Coca-Cola Scholars', org: 'Coca-Cola Scholars Foundation',
      amount: '$20,000', awards: 150, deadline: '2026-09-30',
      who: 'Seniors graduating in 2026–27. Judged on leadership and service',
      note: 'Closes 5 p.m. Eastern — that is 4 p.m. here.',
      url: 'https://www.coca-colascholarsfoundation.org/apply/', verified: CHECKED },

    { name: 'QuestBridge National College Match', org: 'QuestBridge',
      amount: 'Full four-year scholarship, over $360,000', awards: null, deadline: '2026-10-01',
      who: 'High-achieving seniors from low-income households, matched with 55 top colleges',
      url: 'https://www.questbridge.org/high-school-students/national-college-match', verified: CHECKED },

    { name: 'Work Ethic Scholarship', org: 'mikeroweWORKS Foundation',
      amount: 'Varies', awards: null, deadline: '2026-10-31',
      who: 'Anyone training for a skilled trade — welding, plumbing, electrical, HVAC, construction and more',
      note: 'Awarded four times a year, so missing one round is not the end of it.',
      url: 'https://www.mikeroweworks.org/scholarship/', verified: CHECKED },

    { name: 'Cooke College Scholarship', org: 'Jack Kent Cooke Foundation',
      amount: 'Up to $55,000 a year', awards: null, deadline: '2026-11-11',
      who: 'Seniors with financial need and strong grades, heading to a four-year college',
      url: 'https://www.jkcf.org/our-scholarships/college-scholarship-program/', verified: CHECKED },

    { name: 'Most Valuable Student', org: 'Elks National Foundation',
      amount: '$4,000 – $30,000', awards: 500, deadline: '2026-11-12',
      who: 'Seniors who are US citizens, heading to a four-year degree. No need to know an Elks member',
      note: 'Closes 11:59 p.m. Pacific.',
      url: 'https://www.elks.org/scholars/scholarships/mvs.cfm', verified: CHECKED },

    { name: 'Burger King Scholars', org: 'Burger King Foundation',
      amount: '$1,000 – $60,000', awards: null, deadline: '2026-12-15', opens: '2026-10-15',
      who: 'Seniors heading to college OR to a vocational/technical school',
      note: 'Closes at 30,000 applications or 15 December, whichever comes first — apply early.',
      url: 'https://www.burgerkingfoundation.org/programs/burger-king-sm-scholars', verified: CHECKED },

    // ── dates for this cycle not published yet ───────────────────────────
    { name: 'Houston-Area Rodeo Scholars', org: 'Houston Livestock Show and Rodeo',
      amount: '$20,000 over four years', awards: 350, window: 'Usually opens 1 December, closes early February',
      who: 'Texas residents graduating from a Houston-area school, going to a Texas university. FAFSA and SAT/ACT required',
      note: 'One of the biggest scholarship providers in the country — 350 Houston-area awards alone. The Rodeo said 2027 dates arrive in autumn 2026, so check now.',
      url: 'https://www.rodeohouston.com/scholarships-and-grants/how-to-apply/', verified: CHECKED },

    { name: 'Dell Scholars', org: 'Michael & Susan Dell Foundation',
      amount: '$20,000 plus a laptop and ongoing support', awards: 500,
      window: 'Usually opens 15 December, closes 15 February',
      who: 'Seniors with financial need who have shown determination through hardship',
      url: 'https://www.dellscholars.org/scholarship/', verified: CHECKED },

    { name: 'Horatio Alger National Scholarship', org: 'Horatio Alger Association',
      amount: 'Varies', awards: null, window: '1 December – 15 February for seniors',
      who: 'Seniors who have overcome real adversity and have critical financial need',
      url: 'https://horatioalger.org/scholarships/', verified: CHECKED },

    { name: 'Horatio Alger Career & Technical Scholarship', org: 'Horatio Alger Association',
      amount: 'Varies', awards: null, window: '15 March – 15 June',
      who: 'Seniors heading for an associate degree or a certificate — not a four-year degree',
      note: 'Built for exactly the path a lot of Blanson students take.',
      url: 'https://horatioalger.org/scholarships/', verified: CHECKED },

    { name: 'HSF Scholar Program', org: 'Hispanic Scholarship Fund',
      amount: 'Varies, plus mentoring and career support', awards: 10000,
      window: 'Usually opens early January, closes mid-February',
      who: 'Students of Hispanic heritage, 3.0 GPA, must complete FAFSA or TASFA',
      url: 'https://www.hsf.net/scholarship', verified: CHECKED },

    { name: 'Terry Foundation Traditional Scholarship', status: 'Ask the university', org: 'The Terry Foundation',
      amount: 'Full ride, up to eight semesters', awards: null,
      window: 'Deadlines are set by each university, not the Foundation',
      who: 'Texas seniors admitted to a Terry-affiliated Texas public university, with financial need',
      note: 'Houston-based, and the largest private scholarship provider in Texas. You apply through the university, so check that university’s page.',
      url: 'https://terryfoundation.org/apply/', verified: CHECKED },

    { name: 'FAFSA — Free Application for Federal Student Aid', status: 'Opens in autumn', org: 'U.S. Department of Education',
      amount: 'Grants, work-study and loans', awards: null,
      window: 'Opens in the autumn for the next school year',
      who: 'Everyone. It is free, and half the scholarships on this page require it',
      note: 'Not a scholarship, the gateway to most of them. If you cannot file a FAFSA, ask your counsellor about the TASFA instead.',
      url: 'https://studentaid.gov/h/apply-for-aid/fafsa', verified: CHECKED },

    // ── from the old Wix page, kept but never verified ───────────────────
    // These came across from the old site with no links and no way to check
    // them. They are marked so nobody mistakes them for a checked entry.
    { name: 'Be Bold Scholarship', amount: '$25,000', awards: 1, deadline: '2026-03-01', archived: true },
    { name: 'Hunt Heroes Foundation Scholarship Program', amount: '$5,000', awards: 26,
      deadline: '2026-03-04', archived: true },
    { name: 'FEEA', amount: '', awards: 200, deadline: '2026-03-12', archived: true },
    { name: 'NLHA Education Fund', amount: '$3,500', awards: 4, deadline: '2026-03-13', archived: true },
    { name: 'IMANA', amount: '', awards: 12, deadline: '2026-03-15', archived: true },
    { name: 'Dolphin', org: 'Niche', amount: '$4,000', awards: 113, deadline: '2026-03-31', archived: true }
  ];

  // ── Where to look for more ──────────────────────────────────────────────
  // No page can list every scholarship — there are thousands, and hundreds are
  // local to one city or one trade. These are the free searches that do the
  // finding, so the paper points at them instead of pretending to be one.
  const FINDERS = [
    { name: 'BigFuture Scholarship Search', by: 'College Board',
      url: 'https://bigfuture.collegeboard.org/scholarship-search',
      note: 'Free, no account needed to browse.' },
    { name: 'Federal Student Aid', by: 'U.S. Department of Education',
      url: 'https://studentaid.gov/',
      note: 'FAFSA, grants and the official word on federal aid.' },
    { name: 'College for All Texans', by: 'Texas Higher Education Coordinating Board',
      url: 'https://www.collegeforalltexans.com/',
      note: 'Texas-only grants and aid, including the TASFA.' },
    { name: 'Fastweb', by: '', url: 'https://www.fastweb.com/',
      note: 'Long-running free search; matches you against your profile.' },
    { name: 'Scholarships.com', by: '', url: 'https://www.scholarships.com/',
      note: 'Large free database you can filter by state and field of study.' }
  ];

  // Worth saying out loud on a page like this. Scholarship scams target
  // students who are already worried about paying for college.
  const WARNINGS = [
    'A real scholarship never charges a fee to apply. If a site wants money, close it.',
    'Nobody can guarantee you will win one. Anyone who promises that is selling something.',
    'Never give a bank account or card number to a scholarship application.',
    'Check the deadline on the official site before you rely on it — including this page.'
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
  // `credit` is the line the old site printed, kept word for word. `by` is the
  // same person as a name the code can group on, so every photographer gets a
  // page the way every writer does — nine of these photos are Joseph Zapata's
  // and until now his name appeared once, in small type, linking to nothing.
  const GALLERIES = [
    { title: 'Homecoming', year: '2025 – 2026', credit: 'Provided by Clarissa Ortega',
      by: 'Clarissa Ortega',
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
      by: 'Mr. Martin',
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
      by: 'Mr. Peel',
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
      by: 'Joseph Zapata',
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

  // ── What's on ───────────────────────────────────────────────────────────
  // Events an editor adds in the newsroom. Unlike everything else in this file
  // they are not written here — they live in storage, because the whole point
  // is that the club can change them without a developer.
  //
  // An event is { id, title, date, time, place, note }. Only title and date are
  // required; the rest are left out of the display when empty.

  // Yesterday's assembly is not news. Anything before today drops off on its
  // own, so nobody has to remember to delete it — which is the difference
  // between a calendar people trust and one they stop reading.
  function upcoming(events, limit) {
    const today = midnight(new Date());
    const live = (events || [])
      .filter(e => e && e.title && e.date)
      .map(e => ({ ...e, at: Blocks.parseDate(e.date) }))
      .filter(e => e.at && midnight(e.at) >= today)
      .sort((a, b) => a.at - b.at);
    return limit ? live.slice(0, limit) : live;
  }

  // "Today" and "Tomorrow" beat a date somebody has to work out.
  function whenText(e) {
    const d = Blocks.parseDate(e && e.date);
    if (!d) return '';
    const days = Math.round((midnight(d) - midnight(new Date())) / 86400000);
    const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow'
              : days > 1 && days < 7 ? DAYS[d.getDay()]
              : Blocks.dateText({ date: e.date });
    return e.time ? day + ' · ' + e.time : day;
  }

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Blocks keeps its own copy for article dates but does not export it, and one
  // IIFE reaching into another's locals is how you get a ReferenceError that
  // only shows up on the one page that uses it.
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];

  // A short badge for the corner of a card.
  function dayBadge(e) {
    const d = Blocks.parseDate(e && e.date);
    if (!d) return { top: '', bottom: '' };
    return { top: MONTHS[d.getMonth()].slice(0, 3).toUpperCase(), bottom: String(d.getDate()) };
  }

  const newEventId = () => 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const newTaskId  = () => 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ── Writers ─────────────────────────────────────────────────────────────
  // Every byline gets a page, whether or not the person is on the About page.
  // Six people wrote for the paper this year without a profile, and a byline
  // that goes nowhere is the same as no credit at all.
  const writerSlug = name => String(name || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Built from the bylines that actually exist, so it stays right when someone
  // new publishes without being added to STAFF.
  function writer(slug) {
    if (typeof ARTICLES === 'undefined') return null;
    const stories = ARTICLES.filter(a => a.author && writerSlug(a.author) === slug);
    if (!stories.length) return null;
    const name = stories[0].author;
    return { name, slug, stories, profile: STAFF.find(m => m.name === name) || null };
  }

  // ── Reviews ─────────────────────────────────────────────────────────────
  // The paper has a pile of rated reviews and no way to ask "what was good?".
  // Ratings are stored out of different maximums, so they are compared as a
  // fraction rather than as the raw number — 8/10 must not beat 4.5/5.
  function bestReviews(limit) {
    if (typeof ARTICLES === 'undefined') return [];
    return ARTICLES
      .filter(a => a.rating != null && a.ratingMax)
      .map(a => ({ article: a, score: Number(a.rating) / Number(a.ratingMax) }))
      .filter(x => Number.isFinite(x.score))
      .sort((a, b) => b.score - a.score ||
        String(a.article.title).localeCompare(String(b.article.title)))
      .slice(0, limit || 999);
  }

  // ── Topics ─────────────────────────────────────────────────────────────────
  // A section says where an article lives; a topic says what it is about, and
  // an article can carry several. That is the whole point — a horror game is
  // filed under Gaming and a horror film under Film, and until now there was no
  // way to ask for both.
  //
  // Read out of ARTICLES rather than kept in a list, so a topic the newsroom
  // invents next week works with no edit here, and a topic whose last article
  // is taken down stops existing instead of leading to an empty page.

  // Must stay identical to topic_slug() in tools/build-articles.pl.
  const topicSlug = name => String(name || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const topicsOf = a => (a && Array.isArray(a.topics) ? a.topics : [])
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .map(name => ({ name, slug: topicSlug(name) }))
    .filter(t => t.slug);

  // Counted, and ordered by how much has been written about each — a topic with
  // five articles behind it is worth more of the reader's attention than one
  // somebody used once. Ties break alphabetically so the order is stable.
  function allTopics() {
    if (typeof ARTICLES === 'undefined') return [];
    const found = new Map();
    ARTICLES.forEach(a => topicsOf(a).forEach(t => {
      const hit = found.get(t.slug);
      // First spelling seen wins the label, the way the build warns it will.
      if (hit) hit.count++;
      else found.set(t.slug, { slug: t.slug, name: t.name, count: 1 });
    }));
    return [...found.values()]
      .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
  }

  const byTopic = slug => (typeof ARTICLES === 'undefined' ? []
    : ARTICLES.filter(a => topicsOf(a).some(t => t.slug === slug)));

  // Falls back to the address itself rather than to nothing, so a link that has
  // gone stale still says what it was looking for.
  const topicName = slug =>
    (allTopics().find(t => t.slug === slug) || {}).name || String(slug || '');

  // Other topics that turn up on the same articles — how a reader gets from
  // Horror to Sci-Fi without going back to the index.
  function relatedTopics(slug, limit) {
    const near = new Map();
    byTopic(slug).forEach(a => topicsOf(a).forEach(t => {
      if (t.slug !== slug) near.set(t.slug, (near.get(t.slug) || 0) + 1);
    }));
    return [...near.entries()]
      .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
      .slice(0, limit || 6)
      .map(([s]) => ({ slug: s, name: topicName(s) }));
  }

  // ── Photographers ──────────────────────────────────────────────────────────
  // A byline is a byline whether it is on words or on pictures. Writers have
  // had a page each since the archive went up; the people who took the photos
  // had a line of small print.
  //
  // Slugs come from writerSlug, so somebody who does both is the same person at
  // #/w/ and #/p/ and the two pages can point at each other.
  function photographers() {
    const found = new Map();
    const get = name => {
      const slug = writerSlug(name);
      if (!slug) return null;
      if (!found.has(slug)) found.set(slug, { name, slug, galleries: [], artwork: [] });
      return found.get(slug);
    };
    GALLERIES.forEach(g => { const p = g.by && get(g.by); if (p) p.galleries.push(g); });
    ARTWORK.forEach(a => { const p = a.by && get(a.by); if (p) p.artwork.push(a); });
    return [...found.values()]
      .map(p => ({ ...p, count: p.galleries.reduce((n, g) => n + g.photos.length, 0) + p.artwork.length }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  const photographer = slug => photographers().find(p => p.slug === slug) || null;

  // ── Corrections ────────────────────────────────────────────────────────────
  // Every correction the paper has run, in one place. Real papers keep this
  // page, and it is the whole reason for having a correction rather than a
  // quiet edit: the record is public, or it is not a record.
  //
  // Newest first, on the day it was made rather than the day the story ran.
  function corrections() {
    if (typeof ARTICLES === 'undefined') return [];
    const out = [];
    ARTICLES.forEach(a => (a.corrections || []).forEach(c => {
      if (c && String(c.text || '').trim()) out.push({ article: a, ...c });
    }));
    return out.sort((x, y) => String(y.at || '').localeCompare(String(x.at || '')));
  }

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

  // An entry with no firm date for this cycle gets its own state rather than
  // being squeezed into the open/closed ones — "we do not know yet" is a real
  // answer and pretending otherwise is how a student misses a deadline.
  function statusOf(row) {
    // Most undated rows are waiting on next year's dates, but not all — the
    // Terry deadlines exist, they are just set by each university. A row can
    // set `status` to say which it is rather than being labelled wrongly.
    if (!row.deadline) return { state: 'window', label: row.status || 'Dates not out yet',
                                when: row.window || '', days: null };
    const due = deadline(row.deadline);
    // Published, but not open for applications quite yet.
    if (due.state !== 'closed' && row.opens) {
      const from = Blocks.parseDate(row.opens);
      if (from && midnight(from) > midnight(new Date())) {
        return { state: 'soon', label: 'Opens ' + Blocks.dateText({ date: row.opens }),
                 when: due.when, days: due.days, notYet: true };
      }
    }
    return due;
  }

  // Soonest first among the ones you can actually act on; everything without a
  // date next; last year's unverified leftovers at the bottom where they cannot
  // be mistaken for something current.
  // 'open' and 'soon' share a rank on purpose: both are things a student can
  // act on, so they belong in one run sorted by date. Ranking "opens in
  // October" above "closes in three weeks" would bury the urgent one.
  const RANK = { open: 0, soon: 0, window: 1, closed: 2, unknown: 3 };
  const scholarships = () => SCHOLARSHIPS
    .map(r => ({ ...r, due: statusOf(r) }))
    .sort((a, b) => {
      if (!!a.archived !== !!b.archived) return a.archived ? 1 : -1;
      const ra = RANK[a.due.state] ?? 9, rb = RANK[b.due.state] ?? 9;
      if (ra !== rb) return ra - rb;
      return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'));
    });

  // Counts only what a student could act on today — an unverified leftover from
  // last year is not an opportunity.
  const openCount = () => scholarships()
    .filter(s => !s.archived && (s.due.state === 'open' || s.due.state === 'soon')).length;

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
    finders: () => FINDERS.slice(),
    warnings: () => WARNINGS.slice(),
    // Shown on the page, so a reader can judge how stale the list is.
    dateChecked: () => Blocks.dateText({ date: CHECKED }),
    galleries: () => GALLERIES.slice(),
    artwork: () => ARTWORK.slice(),
    fc: () => FC,
    photoCount: () => GALLERIES.reduce((n, g) => n + g.photos.length, 0) + ARTWORK.length,
    upcoming, whenText, dayBadge, newEventId, newTaskId,
    writerSlug, writer,
    bestReviews,
    photographers, photographer, corrections,
    topicSlug, topicsOf, allTopics, byTopic, topicName, relatedTopics,
    search, highlight,
    scholarships, openCount, deadline, storiesBy, contributors, initials
  };
})();
