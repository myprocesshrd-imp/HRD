import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
      .from("surveys")
      .select(`
        *,
        survey_sections!inner(section_id, sections(code)),
        survey_responses(status)
      `)
      .order("created_at", { ascending: false });
  console.log("Anon Data:", JSON.stringify(data, null, 2));
  console.log("Anon Error:", error);
}
test();
