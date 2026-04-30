const ARTICLES = [
  {
    id: 1,
    title: "Blanson SkillsUSA Champions the Future Through Santa Donations Project",
    author: "Staff Report",
    date: "December 2024",
    category: "campus",
    subcategory: "SkillsUSA",
    featured: true,
    excerpt: "Members of Blanson CTE's SkillsUSA chapter gave back to the Houston community this winter, organizing donations and volunteering their time in a project that drew praise from faculty and administrators across Aldine ISD.",
    content: `Members of Blanson CTE's SkillsUSA chapter gave back to the Houston community this winter, organizing a Santa Donations Project that collected gifts and supplies for families in need throughout the Aldine ISD community.\n\nThe project, driven entirely by student volunteers, saw SkillsUSA members coordinate donation drives, sort and package gifts, and distribute them to families who needed them most heading into the holiday season.\n\nFaculty and administrators across Aldine ISD praised the effort, highlighting it as an example of the real-world civic engagement that CTE programs aim to develop in students. Blanson's SkillsUSA chapter has long been recognized for combining technical skills with community leadership.\n\nThe project required months of planning, outreach, and coordination — skills that mirror what students learn in their CTE programs every day. For many participants, it was one of the most meaningful experiences of their high school career.`,
    tags: ["SkillsUSA", "Community", "Campus"]
  },
  {
    id: 2,
    title: "Blanson SkillsUSA Students Return to Grantham to Champion the Future",
    author: "Staff Report",
    date: "November 2024",
    category: "campus",
    subcategory: "SkillsUSA",
    featured: false,
    excerpt: "Blanson CTE SkillsUSA students returned to Grantham for another year of competition and community engagement, representing their school with distinction.",
    content: `Blanson CTE SkillsUSA students made the trip back to Grantham this year, continuing a tradition of competition and community leadership that has defined the chapter's identity.\n\nStudents competed across multiple categories, showcasing the technical and professional skills they've developed through Blanson's CTE programs. The event brought together students from across the region for a day of hands-on challenges and industry exposure.\n\nFor the Blanson delegation, the experience reinforced what their programs teach every day: that technical skills, teamwork, and civic responsibility go hand in hand. Advisors and coaches expressed pride in how students represented the school throughout the day.`,
    tags: ["SkillsUSA", "Campus", "Competition"]
  },
  {
    id: 3,
    title: "Meet Mr. Jenkins: A Loud and Proud Passion for Film",
    author: "Jason Borrego",
    date: "October 2024",
    category: "campus",
    subcategory: "Interviews",
    featured: false,
    excerpt: "A man with a loud and proud passion for film, Mr. Jenkins is widely known for being the primary teacher of Audio/Video Production here at Blanson through thick and thin. But where does this passion come from?",
    content: `A man with a loud and proud passion for film, Mr. Jenkins is widely known for being the primary teacher of Audio/Video Production here at Blanson through thick and thin. But where does this passion come from, and how did it land him in the spotlight that we all see him in today? These are just some of the questions that I got the chance to sit down and ask him in this exclusive interview.\n\nFrom the moment he started talking about film, it was clear this wasn't just a job for Mr. Jenkins — it was a calling. He spoke about growing up captivated by storytelling, by the way a camera could frame an emotion or a moment in a way that words alone couldn't capture.\n\nHis path to teaching wasn't a straight line, but every turn in it brought him closer to what he was meant to do: share that passion with the next generation of creators. At Blanson, he's found a place where students are hungry to learn, ready to create, and genuinely excited about the work.\n\n"These kids have so much to say," he told me. "My job is just to give them the tools to say it." For a teacher who leads with that kind of philosophy, it's no surprise that Audio/Video Production has become one of Blanson's most energized programs.`,
    tags: ["Interviews", "Faculty", "Film", "Campus"]
  },
  {
    id: 4,
    title: "All The Bright Places — Book Review",
    author: "Keydith Manjarres",
    date: "September 2024",
    category: "articles",
    subcategory: "Book Reviews",
    featured: false,
    excerpt: "This book is filled with drama and romance. From the beginning, they go into detail about Violet Markey's life and her struggles. If you love drama and romance, this one is for you.",
    content: `This book is filled with drama and romance. This book starts off with introducing the main character, Violet Markey. From the beginning, they go into detail about Violet's life and her struggles.\n\nThe story pulls you in quickly — Violet is dealing with grief, with loss, with the kind of pain that doesn't announce itself loudly but sits quietly in everything you do. The way the author writes her internal world is what makes this book worth reading.\n\nThe romance that develops feels earned rather than forced. It's built on two people who understand each other in ways that most people in their lives don't, and that dynamic gives the book its emotional core.\n\nI recommend you read this book and watch the movie if you love drama and romance series and movies. It's the kind of story that stays with you after you finish it — the characters, their choices, and the way it ends.`,
    tags: ["Books", "Romance", "Drama", "Review"]
  },
  {
    id: 5,
    title: "A Night in the Woods: Growing Up, Anxiety, and Feeling Stuck",
    author: "Monzerrat Palacios",
    date: "October 2024",
    category: "articles",
    subcategory: "Gaming",
    featured: false,
    excerpt: "A story driven adventure game that focuses on exploring, growing up, and learning how to deal with change. While the game has a lot of humor and laid back moments it also deals with deeper topics like depression, anxiety, identity, and feeling 'stuck' when everyone else is moving forward in life.",
    content: `A story driven adventure game that focuses on exploring, growing up, and learning how to deal with change. While the game has a lot of humor and laid back moments it also deals with deeper topics like depression, anxiety, identity, and feeling "stuck" when everyone else is moving forward in life.\n\nThe game follows Mae, a college dropout who returns home to find that everything has changed — her friends, her town, her sense of where she fits in the world. The writing is sharp and honest in a way that doesn't feel forced.\n\nWhat makes Night in the Woods stand out is how it balances its tone. One moment you're jumping across rooftops and playing bass in a band with your friends, the next you're sitting with a character through a genuinely painful conversation about mental health. It never feels jarring because the game trusts you to hold both things at once.\n\nFor anyone who has ever felt like life moved on without them, or who has struggled to name what they're feeling, this game speaks to that experience directly and without judgment.`,
    tags: ["Gaming", "Review", "Indie"]
  },
  {
    id: 6,
    title: "Emissary Zero: Isolation, Mystery, and a Bloody First Scene",
    author: "Monzerrat Palacios",
    date: "October 2024",
    category: "articles",
    subcategory: "Gaming",
    featured: false,
    excerpt: "Emissary Zero begins with players preparing inside a research facility as they get ready to get deployed on a new mission to a remote planet. Once they arrive the team encounters a bloody scene making it clear that something went wrong.",
    content: `Emissary Zero begins with players preparing inside a research facility as they get ready to get deployed on a new mission to a remote planet. Once they arrive the team encounters a bloody scene making it clear that something went wrong. From there the story slowly builds tension as the mystery deepens making the player feel more isolated with each discovery.\n\nThe game does something interesting with pacing — it never rushes you to answers. Instead it lets the dread accumulate slowly, leaving you to piece together what happened through environmental storytelling and fragments of logs and data left behind by the crew that didn't make it.\n\nThe atmosphere is one of Emissary Zero's strongest elements. The remote planet setting feels genuinely alien and threatening, and the sound design amplifies every moment of uncertainty. By the time you understand what you're dealing with, you're already deep enough in that turning back feels impossible.`,
    tags: ["Gaming", "Review", "Horror", "Sci-Fi"]
  },
  {
    id: 7,
    title: "Paincore: Fast, Chaotic, and Constantly Pushing Forward",
    author: "Monzerrat Palacios",
    date: "November 2024",
    category: "articles",
    subcategory: "Gaming",
    featured: false,
    excerpt: "This game is a fast paced horror action game that throws players into a chaotic world filled with monstrous creatures and unpredictable dangers. Set in a collapsed industrial facility where experiments have gone horribly wrong.",
    content: `This game is a fast paced horror action game that throws players into a chaotic world filled with monstrous creatures and unpredictable dangers. Set in a collapsed industrial facility where experiments have gone horribly wrong. The tone of this game is intense, chaotic, and constantly pushing the player forward.\n\nPaincore doesn't give you time to breathe. From the first moments you're dropped into the facility, the game makes clear that survival means keeping moving. Standing still is how you die.\n\nThe monster design is genuinely unsettling — creatures that feel like they were designed by someone who wanted to make sure you'd remember them. The industrial facility setting works well for this kind of horror, all rust and broken machinery and flickering lights.\n\nIf you're looking for a game that challenges your reflexes and your nerves at the same time, Paincore delivers. It's not subtle, but it doesn't need to be.`,
    tags: ["Gaming", "Review", "Horror", "Action"]
  },
  {
    id: 8,
    title: "Malignant Review: James Wan's Horror Film Is Not What You Expect",
    author: "Keydith Manjarres",
    date: "September 2024",
    category: "articles",
    subcategory: "Movie & Show Reviews",
    featured: false,
    excerpt: "Malignant is a 2021 horror film directed by James Wan. The movie starts off with the main character, Madison Mitchell, arguing and getting into a fight with her abusive partner. She is pushed into a wall and injures her head and ever since that day, she has been experiencing horrific nightmares that are visions of murders happening across town.",
    content: `Malignant is a 2021 horror film directed by James Wan. The movie starts off with the main character, Madison Mitchell, arguing and getting into a fight with her abusive partner. She is pushed into a wall and injures her head and ever since that day, she has been experiencing headaches and along with that she is also experiencing horrific nightmares that are visions of murders happening across town.\n\nWhat follows is a horror mystery that gets stranger and more unsettling as it goes — in the best possible way. James Wan is clearly having fun here, leaning into camp and genuine terror in equal measure.\n\nThe third act in particular goes somewhere most mainstream horror films wouldn't dare, and it either works for you completely or it doesn't. For me, it worked. Wan commits to the concept fully and the result is one of the more memorable horror films of the last decade.\n\nIf you go in expecting a conventional ghost story or slasher, you'll be caught off guard. That's exactly the point.`,
    tags: ["Film", "Horror", "Review"]
  },
  {
    id: 9,
    title: "Mid 90s: Skateboarding, Friendship, and Coming of Age in LA",
    author: "Josue Reyes",
    date: "October 2024",
    category: "articles",
    subcategory: "Movie & Show Reviews",
    featured: false,
    excerpt: "A 13-year-old in the 1990s LA grapples with a turbulent home life during summer. Meanwhile, he finds solace in newfound friends at a Motor Avenue skateboard shop.",
    content: `"A 13-year-old in the 1990s LA grapples with a turbulent home life during summer. Meanwhile, he finds solace in newfound friends at a Motor Avenue skateboard shop." Mid90s is a coming-of-age and drama film both written and directed by Jonah Hill. It follows its main character, Stevie, as he goes through life with his newfound friend group, consisting of Ray, Ruben, F*cksh*t (Yes, that is his actual name in the movie), and Fourth Grade.\n\nThe film is shot on 16mm which gives it a texture that feels genuinely like memory — grainy and warm and slightly unstable, the way summers from childhood actually feel when you look back on them.\n\nJonah Hill's script is better than anyone expected from a first-time director. He doesn't moralize or explain what the movie is about. He just shows Stevie moving through the world, making bad choices and good ones, finding something like belonging in a group of older kids who don't ask too much of him.\n\nIt's a short film — barely 80 minutes — and it earns every one of them.`,
    tags: ["Film", "Coming of Age", "Drama", "Review"]
  }
];

// Save to localStorage so admin panel can read/write
function loadArticles() {
  const stored = localStorage.getItem('blanson_articles');
  if (stored) {
    const parsed = JSON.parse(stored);
    // Merge: keep originals, append any admin-added ones
    const ids = ARTICLES.map(a => a.id);
    const extras = parsed.filter(a => !ids.includes(a.id));
    return [...ARTICLES, ...extras];
  }
  return [...ARTICLES];
}

function saveArticles(articles) {
  // Only save admin-added ones (id > 100)
  const adminAdded = articles.filter(a => a.id > 100);
  localStorage.setItem('blanson_articles', JSON.stringify(adminAdded));
}
