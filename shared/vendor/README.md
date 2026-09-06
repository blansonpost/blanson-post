# Vendored third-party code

## supabase.js

- Package: `@supabase/supabase-js`
- Version: **2.39.7**
- Source: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/supabase.js
- Build: UMD, defines the global `supabase`

Vendored rather than loaded from a CDN so that:

1. the newsroom works on a school laptop with no internet,
2. there is no third-party script running on the page where staff sign in,
3. the Content-Security-Policy can stay `script-src 'self'`.

The trade-off is that updates are deliberate. To update: download the new UMD
build to this path, bump the version above, and re-test sign-in and publishing.
