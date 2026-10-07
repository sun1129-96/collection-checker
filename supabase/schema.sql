create table if not exists public.checklist_progress (
  client_id text primary key,
  checked_item_ids text[] not null default '{}'::text[],
  achievement_rate integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.checklist_progress enable row level security;

drop policy if exists "anon can manage checklist progress" on public.checklist_progress;

create policy "anon can manage checklist progress"
on public.checklist_progress
for all
to anon, authenticated
using (true)
with check (true);
