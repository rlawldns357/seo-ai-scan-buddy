-- email_leads INSERT: 기본 검증 추가 (email 형식 + 길이 제한)
DROP POLICY IF EXISTS "Anyone can insert email leads" ON public.email_leads;
CREATE POLICY "Anon can insert email leads"
  ON public.email_leads
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND char_length(email) >= 5
    AND char_length(email) <= 255
    AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  );