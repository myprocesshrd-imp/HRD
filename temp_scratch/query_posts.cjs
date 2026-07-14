const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: posts, error } = await supabase
    .from('bulletin_posts')
    .select('*');

  if (error) {
    console.error("Error fetching posts:", error);
  } else {
    console.log("Posts count:", posts.length);
    console.log("Posts:", JSON.stringify(posts, null, 2));
  }
}

run();
