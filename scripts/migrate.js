import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const { Client } = pg;

// Extract project ref and password
const projectRef = "jjqasudkiqxgouvuuyiv";
const password = process.env.DB_PASSWORD || "kPBjiHRQf0VW0oT6pr8tLg==";

// We will try standard connection configurations
const connectionString = `postgres://postgres:${encodeURIComponent(password)}@db.jjqasudkiqxgouvuuyiv.supabase.co:5432/postgres`;

async function run() {
  console.log("Connecting to:", `postgres://postgres.${projectRef}:***@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`);
  const client = new Client({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log("Connected successfully. Reading migration file...");
    
    const migrationPath = path.join(__dirname, "../supabase/migrations/00005_create_demographic_options.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");
    
    console.log("Executing SQL...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
