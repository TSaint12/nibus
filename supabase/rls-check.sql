-- RLS sanity-check queries — run these in the Supabase SQL editor
-- after seeding to verify policies are working correctly.

-- 1. Confirm RLS is enabled on all tables
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2. List all policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
