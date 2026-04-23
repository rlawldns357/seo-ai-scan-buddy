-- 신규 가입자 자동 free 권한 부여 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 베타 부여 헬퍼: 이메일로 베타 부여 (admin/service_role만 호출)
CREATE OR REPLACE FUNCTION public.grant_beta_by_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'beta')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN TRUE;
END;
$$;