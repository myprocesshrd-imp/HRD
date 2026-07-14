const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing URL or SERVICE KEY in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: posts, error: pError } = await supabase.from('bulletin_posts').select('*');
  if (pError) {
    console.error("Error fetching posts:", pError);
  } else {
    console.log("Bulletin posts count:", posts.length);
    console.log("Bulletin posts:", JSON.stringify(posts, null, 2));
  }
}

run();
