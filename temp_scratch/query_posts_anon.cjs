const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log("Supabase URL:", supabaseUrl);
console.log("Anon key exists:", !!anonKey);

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const { data: posts, error } = await supabase
    .from('bulletin_posts')
    .select('*');

  if (error) {
    console.error("Error fetching posts with anon key:", error);
  } else {
    console.log("Posts count (anon):", posts.length);
    console.log("Posts (anon):", JSON.stringify(posts, null, 2));
  }
}

run();
