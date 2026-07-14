const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  // Check user role for ronnachai_w
  const { data: user, error: uError } = await supabase
    .from('users')
    .select('id, employee_code, name_en, role, is_active')
    .eq('employee_code', 'ronnachai_w')
    .single();
  
  if (uError) {
    console.error("Error fetching user:", JSON.stringify(uError));
  } else {
    console.log("User data:", JSON.stringify(user, null, 2));
  }

  // Try to insert a test bulletin post directly (simulating the edge function)
  if (user) {
    console.log("\n--- Attempting to insert a test bulletin post using service role ---");
    const { data: post, error: pError } = await supabase
      .from('bulletin_posts')
      .insert([{
        title_th: 'ทดสอบประกาศ',
        title_en: 'Test Announcement',
        content_th: 'เนื้อหาทดสอบ',
        content_en: 'Test content',
        category: 'general',
        is_pinned: false,
        posted_by: user.name_en || 'Admin',
        links: [],
      }])
      .select()
      .single();
    
    if (pError) {
      console.error("Error inserting post:", JSON.stringify(pError, null, 2));
    } else {
      console.log("Post inserted successfully:", JSON.stringify(post, null, 2));
      
      // Clean up test post
      const { error: delError } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', post.id);
      if (delError) {
        console.error("Error deleting test post:", delError.message);
      } else {
        console.log("Test post deleted (cleanup complete).");
      }
    }
  }

  // Check if the admin-service edge function is reachable
  console.log("\n--- Checking edge function response ---");
  const resp = await supabase.functions.invoke('admin-service', {
    body: {
      action: 'BULLETIN_CREATE',
      payload: {
        title_th: 'ทดสอบ EF',
        title_en: 'Edge Fn Test',
        content_th: 'ทดสอบ',
        content_en: 'Test',
        category: 'general',
        is_pinned: false,
        posted_by: 'Admin',
        links: [],
      },
      actorId: 'ronnachai_w',
    }
  });
  console.log("Edge function result:", JSON.stringify(resp, null, 2));
}

run();
