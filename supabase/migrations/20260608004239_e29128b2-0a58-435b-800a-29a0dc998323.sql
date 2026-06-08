UPDATE public.social_publish_queue
SET body = regexp_replace(body, '\?(utm_[^&\s]+|gclid|fbclid|gad_[^&\s]+|gbraid|wbraid)(=[^&\s]*)?(&(utm_[^&\s]+|gclid|fbclid|gad_[^&\s]+|gbraid|wbraid)(=[^&\s]*)?)*', '', 'g'),
    updated_at = now()
WHERE platform = 'threads'
  AND status IN ('ready','draft','failed')
  AND body ~ '[?&]utm_';