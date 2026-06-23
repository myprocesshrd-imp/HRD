import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function mock() {
  console.log("Starting to generate 500 mock responses...");

  // 1. Get Survey and Questions
  const { data: surveys } = await supabase.from("surveys").select("id").limit(1);
  if (!surveys || surveys.length === 0) throw new Error("No survey found");
  const survey = surveys[0];

  const { data: questions } = await supabase.from("questions").select("id, type");
  if (!questions) throw new Error("No questions found");

  const depts = ["Human Resources", "Information Technology", "Finance", "Sales", "Marketing", "Operations", "Production", "Logistics", "Customer Service"];
  const levels = ["Staff", "Senior Staff", "Assistant Manager", "Manager", "Senior Manager", "Director"];
  const genders = ["Male", "Female", "Other"];
  const tenureRanges = ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "> 10 years"];
  const ageRanges = ["20-30", "31-40", "41-50", "51-60"];
  const scores = [1, 2, 4, 5];

  const BATCH_SIZE = 50;
  const TOTAL_RESPONSES = 500;

  for (let b = 0; b < TOTAL_RESPONSES / BATCH_SIZE; b++) {
    const responsesBatch = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      responsesBatch.push({
        survey_id: survey.id,
        demographics: {
          department: depts[Math.floor(Math.random() * depts.length)],
          level: levels[Math.floor(Math.random() * levels.length)],
          gender: genders[Math.floor(Math.random() * genders.length)],
          tenure: tenureRanges[Math.floor(Math.random() * tenureRanges.length)],
          age: ageRanges[Math.floor(Math.random() * ageRanges.length)],
        },
        status: "completed",
        started_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date().toISOString(),
      });
    }

    const { data: insertedResponses, error: rErr } = await supabase.from("survey_responses").insert(responsesBatch).select("id");
    if (rErr) {
        console.error("Response Insert Error:", rErr);
        throw rErr;
    }

    const answersBatch = [];
    for (const res of insertedResponses) {
      for (const q of questions) {
        const score = scores[Math.floor(Math.random() * scores.length)];
        answersBatch.push({
          response_id: res.id,
          question_id: q.id,
          numeric_value: score,
          text_value: score.toString(),
        });
      }
    }

    const { error: aErr } = await supabase.from("response_answers").insert(answersBatch);
    if (aErr) {
        console.error("Answer Insert Error:", aErr);
        throw aErr;
    }

    console.log(`Inserted batch ${b + 1}/${TOTAL_RESPONSES / BATCH_SIZE}`);
  }

  console.log("Mock data generation completed!");
}

mock().catch(console.error);
