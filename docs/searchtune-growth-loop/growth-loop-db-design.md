# SearchTune OS Growth Loop DB/State Design

## Goal

SEO 점검 결과를 사람이 읽는 리포트로 끝내지 않고, 블로그 수정 액션으로 이어지는 상태 머신을 만든다.

## Tables

### 1. `seo_blog_audit_runs`

```sql
create table if not exists public.seo_blog_audit_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null check (run_type in ('scheduled_morning','scheduled_afternoon','manual','post_deploy')),
  source text not null default 'hermes',
  checked_at timestamptz not null default now(),
  total_urls integer not null default 0,
  issue_counts jsonb not null default '{}'::jsonb,
  summary text,
  created_at timestamptz not null default now()
);
```

### 2. `seo_blog_page_audits`

```sql
create table if not exists public.seo_blog_page_audits (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.seo_blog_audit_runs(id) on delete cascade,
  slug text not null,
  canonical_url text not null,
  clean_url text,
  source text not null,
  http_status integer,
  canonical_ok boolean,
  sitemap_included boolean,
  title text,
  description_len integer,
  h1 text,
  target_keyword text,
  serp_visibility text check (serp_visibility in ('unknown','missing','partial','exposed')) default 'unknown',
  google_index_state text default 'unknown',
  naver_index_state text default 'unknown',
  issues jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  priority text not null default 'P3',
  created_at timestamptz not null default now()
);

create index if not exists idx_seo_blog_page_audits_slug_created
  on public.seo_blog_page_audits(slug, created_at desc);
```

### 3. `seo_growth_actions`

```sql
create table if not exists public.seo_growth_actions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  canonical_url text not null,
  target_keyword text,
  cluster text,
  action_type text not null check (action_type in (
    'canonical_fix','sitemap_fix','title_meta_update','faq_update','internal_link_update',
    'authority_link_update','interactive_block','index_request','monitoring','rule_update'
  )),
  status text not null default 'unhandled' check (status in (
    'unhandled','planned','requested_in_lovable','edited_in_git','verified_build',
    'deployed','index_requested','monitoring','improved','no_change','worse','blocked','cancelled'
  )),
  priority text not null default 'P3',
  reason text not null,
  proposed_change jsonb not null default '{}'::jsonb,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  assigned_to text not null default 'hermes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_seo_growth_actions_status_priority
  on public.seo_growth_actions(status, priority, updated_at desc);
create index if not exists idx_seo_growth_actions_slug
  on public.seo_growth_actions(slug, updated_at desc);
```

### 4. `seo_engine_rule_updates`

```sql
create table if not exists public.seo_engine_rule_updates (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  previous_rule text,
  new_rule text not null,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('proposed','active','reverted')),
  created_at timestamptz not null default now()
);
```

## Read-only API addition

`ops-readonly` should include:

```json
{
  "aiGrowthLoop": {
    "total": 0,
    "counts": {
      "unhandled": 0,
      "planned": 0,
      "edited_in_git": 0,
      "index_requested": 0,
      "monitoring": 0,
      "improved": 0,
      "no_change": 0,
      "worse": 0,
      "blocked": 0
    },
    "recent": [],
    "nextActions": [],
    "lastAuditRun": null
  }
}
```

## State flow

`unhandled → planned → edited_in_git/requested_in_lovable → verified_build → deployed → index_requested → monitoring → improved/no_change/worse`

Blocked cases:

- `blocked`: Lovable deploy/auth/API missing
- `cancelled`: duplicate, outdated, or unsafe bulk edit

## Time-based loop

- 06:00 KST: overnight audit + create/update action candidates
- 11:30 KST: content/rule learning pass, no heavy edits
- 17:00 KST: batch progress report + next priority
- hourly: indexing/canonical watch, silent unless changed

## Batch policy

- P0/P1 technical fixes first
- content optimization max 5 posts per batch
- one cluster per batch: AEO, GEO, Naver, Cafe24, etc.
- every batch must store before/after snapshot and audit delta
