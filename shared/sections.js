// The Blanson Post — sections
//
// The one list. The newsroom's dropdown, the site navigation, and (when a
// database is connected) the SQL CHECK constraint all derive from this.
//
// One IIFE, one global. Nothing under shared/ may declare a bare top-level
// `const`: these files load alongside each other and a duplicate declaration is
// a SyntaxError that kills the whole file, not just the line.

const Sections = (() => {
  const LIST = [
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

  return {
    all: () => LIST.slice(),
    slugs: () => LIST.map(s => s.slug),
    // Unknown slugs fall back to themselves rather than to the first section —
    // silently re-filing an article under Campus is worse than showing a slug.
    name: slug => (LIST.find(s => s.slug === slug) || {}).name || slug,
    has: slug => LIST.some(s => s.slug === slug)
  };
})();
