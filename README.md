# The Blanson Post — Student Newspaper Website

## Files
```
blanson-post/
├── index.html       ← Main newspaper site
├── admin.html       ← Staff admin panel (add/edit/delete articles)
├── css/
│   └── style.css    ← All styles (blue/yellow/white school colors)
└── js/
    ├── articles.js  ← All article content + storage logic
    └── main.js      ← Site routing, rendering, dark/light theme
```

## How to Use the Admin Panel

1. Open `admin.html` in your browser (or go to `yoursite.com/admin.html`)
2. Fill in the form on the right to add a new article
3. Click **Publish Article** — it appears on the site instantly
4. To edit or delete articles you added, click Edit or Delete in the list
5. Original articles (written by real students) are locked — you can view but not edit them

## How to Deploy for Free (GitHub Pages)

1. Go to [github.com](https://github.com) and create a free account
2. Click **New Repository** → name it `blanson-post` → click Create
3. Click **Add file → Upload files** and drag all 4 files/folders in
4. Click **Settings → Pages** → set Source to `main branch` → Save
5. Your site will be live at: `https://yourusername.github.io/blanson-post`

That's it. Free hosting, no ads, no Wix branding.

## Adding Articles Permanently

Articles added via the admin panel are stored in the browser (localStorage). To make them permanent so everyone sees them:

**Option A (easiest):** After adding articles, click "Export Articles as JSON" in the admin panel. 
Send the downloaded file to whoever manages the GitHub repo. They paste the contents into `js/articles.js` in the `ARTICLES` array.

**Option B:** Edit `js/articles.js` directly and add articles to the `ARTICLES` array following the existing format.

## School Colors
- Blue: `#003087`
- Yellow: `#F4C300`
- White: `#ffffff`

## Credits
The Blanson Post — Blanson CTE High School, Humble TX
311 West Road, Houston TX 77038 · 281.591.4950
