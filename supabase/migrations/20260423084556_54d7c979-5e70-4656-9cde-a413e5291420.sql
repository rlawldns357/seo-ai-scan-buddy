-- 1) 가입 시 user_roles + regeneration_credits 동시 생성하도록 trigger 함수 강화
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.regeneration_credits (user_id, balance, monthly_quota, addon_balance)
  VALUES (NEW.id, 3, 3, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2) 누락된 user_roles 백필 (auth.users에 있으나 user_roles에 없는 계정)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'free'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 3) 누락된 regeneration_credits 백필
INSERT INTO public.regeneration_credits (user_id, balance, monthly_quota, addon_balance)
SELECT u.id,
  CASE public.get_user_tier(u.id)
    WHEN 'admin' THEN 999
    WHEN 'studio' THEN 999
    WHEN 'pro' THEN 100
    WHEN 'lite' THEN 20
    WHEN 'beta' THEN 10
    ELSE 3
  END,
  CASE public.get_user_tier(u.id)
    WHEN 'admin' THEN 999
    WHEN 'studio' THEN 999
    WHEN 'pro' THEN 100
    WHEN 'lite' THEN 20
    WHEN 'beta' THEN 10
    ELSE 3
  END,
  0
FROM auth.users u
LEFT JOIN public.regeneration_credits c ON c.user_id = u.id
WHERE c.user_id IS NULL;