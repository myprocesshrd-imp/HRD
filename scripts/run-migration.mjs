import { readFileSync } from "fs";
import "dotenv/config";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = readFileSync("supabase/migrations/00002_add_business_units.sql", "utf8");

// Split into individual statements and run them one by one
const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

console.log(`Found ${statements.length} SQL statements to run...\n`);

let success = 0;
let failed = 0;

for (const stmt of statements) {
  const fullStmt = stmt + ";";
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
    });

    // Use pg REST endpoint via RPC
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: fullStmt }),
    });

    if (rpcRes.ok) {
      console.log(`✅ OK: ${fullStmt.substring(0, 60)}...`);
      success++;
    } else {
      const err = await rpcRes.json();
      // Try pg endpoint
      console.log(`⚠️  RPC failed, trying direct: ${err.message || JSON.stringify(err)}`);
      failed++;
    }
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    failed++;
  }
}

console.log(`\nDone: ${success} success, ${failed} failed`);
