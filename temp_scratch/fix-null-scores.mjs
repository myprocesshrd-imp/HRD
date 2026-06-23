import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fix() {
  console.log("Searching for answers with missing numeric values...");
  
  const { data: answers, error } = await supabase
    .from('response_answers')
    .select('id, text_value, numeric_value')
    .is('numeric_value', null)
    .not('text_value', 'is', null);

  if (error) {
    console.error("Error fetching answers:", error);
    return;
  }

  console.log(`Found ${answers.length} answers to check.`);
  
  let fixedCount = 0;
  for (const ans of answers) {
    const num = parseInt(ans.text_value, 10);
    if (!isNaN(num)) {
      const { error: updateErr } = await supabase
        .from('response_answers')
        .update({ numeric_value: num })
        .eq('id', ans.id);
      
      if (updateErr) {
        console.error(`Error updating answer ${ans.id}:`, updateErr);
      } else {
        fixedCount++;
      }
    }
  }

  console.log(`✅ Successfully fixed ${fixedCount} answer records.`);
}

fix();
