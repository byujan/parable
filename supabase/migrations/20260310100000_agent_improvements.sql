-- ============================================================
-- Agent improvements: atomic signal consume, campaign lifecycle, data model gaps
-- ============================================================

-- 1. Atomic signal consumption function (prevents race conditions)
create or replace function consume_agent_signals(p_session_id text)
returns table(signal jsonb) as $$
  update agent_signals
  set consumed = true
  where id in (
    select id from agent_signals
    where session_id = p_session_id
      and consumed = false
    order by created_at asc
    for update skip locked
  )
  returning agent_signals.signal;
$$ language sql;

-- 2. Campaign lifecycle columns
alter table public.campaigns
  add column if not exists paused_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists agent_session_id text;

-- Update status check to include new states
alter table public.campaigns
  drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check
    check (status in ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'));

-- 3. Campaign events: add delivery tracking columns
alter table public.campaign_events
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists error_message text;

-- Update event_type check to include delivery statuses
alter table public.campaign_events
  drop constraint if exists campaign_events_event_type_check;
alter table public.campaign_events
  add constraint campaign_events_event_type_check
    check (event_type in (
      'sent', 'delivered', 'bounced', 'deferred', 'complained',
      'opened', 'clicked', 'submitted', 'reported', 'training_completed'
    ));

-- 4. Agent signals: add idempotency key
alter table agent_signals
  add column if not exists idempotency_key text;

create unique index if not exists idx_agent_signals_idempotency
  on agent_signals (idempotency_key)
  where idempotency_key is not null;

-- 5. Campaign logs table for UI-visible agent logs
create table if not exists public.campaign_logs (
  id bigint generated always as identity primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  session_id text,
  level text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_logs_campaign
  on public.campaign_logs (campaign_id, created_at desc);

create index if not exists idx_campaign_logs_session
  on public.campaign_logs (session_id, created_at desc);

-- RLS for campaign_logs
alter table public.campaign_logs enable row level security;

create policy "Admins can read campaign logs"
  on public.campaign_logs for select
  using (auth.uid() is not null);
