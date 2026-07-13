-- Migration 00014: Fix bulletin_posts RLS to allow anon reads
-- The app uses localStorage-based auth (not Supabase Auth), so the client
-- always has anon role. We need to allow anon SELECT on bulletin_posts.

-- Drop the old authenticated-only SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read bulletin posts" ON bulletin_posts;

-- Allow both anon and authenticated roles to SELECT (public announcements)
CREATE POLICY "Anyone can read bulletin posts"
  ON bulletin_posts FOR SELECT
  TO anon, authenticated
  USING (true);
