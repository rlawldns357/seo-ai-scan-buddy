-- Revoke EXECUTE from anon + authenticated for internal-only SECURITY DEFINER functions.
-- These are called by triggers, edge functions (service_role), or pg_cron — never directly by clients.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.set_updated_at()',
    'public.handle_new_user()',
    'public.validate_autopublish_settings()',
    'public.enqueue_email(text, jsonb)',
    'public.delete_email(text, bigint)',
    'public.read_email_batch(text, integer, integer)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.grant_beta_by_email(text)',
    'public.get_engine_version(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
