-- Supabase advisor fixes: pin search_path; keep pg_net out of the public schema.
alter function private.api_caller() set search_path = public;
drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;
