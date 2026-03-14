-- Agent signal bus: webhooks write signals, executor polls and consumes them
create table if not exists agent_signals (
  id bigint generated always as identity primary key,
  session_id text not null,
  signal jsonb not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_agent_signals_pending
  on agent_signals (session_id, consumed)
  where consumed = false;

-- Agent sessions (replaces file-based JSON storage)
create table if not exists agent_sessions (
  id text primary key,
  target jsonb not null,
  scenario text not null,
  status text not null default 'running',
  actions jsonb not null default '[]'::jsonb,
  signals jsonb not null default '[]'::jsonb,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agent_sessions_status on agent_sessions (status);
create index idx_agent_sessions_target_email on agent_sessions ((target->>'email'), status);
create index idx_agent_sessions_target_phone on agent_sessions ((target->>'phone'), status);
