// The Blanson Post — backend configuration
//
// UNTIL THESE ARE FILLED IN, the site runs in "local" mode: articles and photos
// are saved in the browser you are using and nobody else can see them. That is
// fine for trying the editor out, but it is NOT a real website yet.
//
// To go live:
//   1. Make a free account at https://supabase.com with the club Gmail
//   2. New project -> name it "blanson-post"
//   3. Project Settings -> Data API -> copy "Project URL" and the "anon public" key
//   4. Paste them below and save this file
//   5. Run the SQL in docs/supabase-setup.sql in the Supabase SQL editor
//
// The anon key is SAFE to put here — it is designed to be public, and the
// database rules decide what it may actually do. Never paste the "service_role"
// key anywhere in this project; that one bypasses every rule.

const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const BACKEND = (SUPABASE_URL && SUPABASE_ANON_KEY) ? 'supabase' : 'local';
