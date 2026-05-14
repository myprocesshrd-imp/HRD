-- Enable Dev Access for Anon (Fix for Mock Auth)
-- This allows the frontend to work without Supabase Auth session

-- Drop strict policies that cause recursion or access denied for anon
DROP POLICY IF EXISTS users_read_admin ON users;
DROP POLICY IF EXISTS surveys_read_active ON surveys;
DROP POLICY IF EXISTS surveys_write_admin ON surveys;

-- Allow all for anon (Simulating public/mock access)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "anon_full_access" ON %I', t);
        EXECUTE format('CREATE POLICY "anon_full_access" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
