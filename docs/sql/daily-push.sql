-- À relire et installer manuellement dans Supabase. Aucun outil ne l'applique.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.daily_push_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null check (device_key ~ '^[0-9a-f]{64}$'),
  day date not null,
  reserved_at timestamptz not null default now(),
  primary key (user_id, device_key, day)
);
create index if not exists daily_push_receipts_day on public.daily_push_receipts(day);
alter table public.daily_push_receipts enable row level security;
revoke all on public.daily_push_receipts from public, anon, authenticated;
grant select, insert, delete on public.daily_push_receipts to service_role;

create or replace function public.daily_push_ready() returns boolean
language sql security invoker set search_path = ''
as $$ select to_regclass('public.daily_push_receipts') is not null $$;

create or replace function public.claim_daily_push(p_user_id uuid, p_device_key text, p_day date)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare claimed integer;
begin
  -- Un appel en retard ne peut envoyer le résumé de la veille.
  if p_day <> (now() at time zone 'Europe/Paris')::date or p_device_key !~ '^[0-9a-f]{64}$' then return false; end if;
  if not exists (select 1 from public.notification_preferences where user_id = p_user_id and canal_push = true)
    or not exists (select 1 from public.user_push_subscriptions where user_id = p_user_id
      and encode(extensions.digest(subscription->>'endpoint', 'sha256'), 'hex') = p_device_key)
    then return false; end if;
  -- Pas de contenu personnel, d'endpoint ni de clé enregistrés dans ce journal.
  delete from public.daily_push_receipts where day < (now() at time zone 'Europe/Paris')::date - 30;
  insert into public.daily_push_receipts(user_id, device_key, day)
    values (p_user_id, p_device_key, p_day) on conflict do nothing;
  get diagnostics claimed = row_count;
  return claimed = 1;
end $$;
revoke all on function public.daily_push_ready() from public, anon, authenticated;
revoke all on function public.claim_daily_push(uuid,text,date) from public, anon, authenticated;
grant execute on function public.daily_push_ready() to service_role;
grant execute on function public.claim_daily_push(uuid,text,date) to service_role;
commit;
