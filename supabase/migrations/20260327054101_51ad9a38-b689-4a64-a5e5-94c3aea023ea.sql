-- 1. analytics_events SELECT: service_role 전용으로 변경
DROP POLICY IF EXISTS "Authenticated users can read analytics events" ON public.analytics_events;
CREATE POLICY "Service role can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role'::text);

-- 2. analytics_events INSERT: anon만 허용 + 기본 검증 추가
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anon can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (
    event_name IS NOT NULL
    AND char_length(event_name) <= 100
  );

-- 3. DB 함수 search_path 설정
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
  RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;