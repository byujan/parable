-- Rename target column to targets (now stores an array of recipients)
alter table agent_sessions rename column target to targets;

-- Drop old single-target indexes
drop index if exists idx_agent_sessions_target_email;
drop index if exists idx_agent_sessions_target_phone;

-- New GIN index for searching within the targets JSONB array
create index idx_agent_sessions_targets on agent_sessions using gin (targets);
