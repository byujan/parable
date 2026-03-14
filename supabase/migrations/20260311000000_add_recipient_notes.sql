-- Add notes field for per-recipient context that the AI agent uses to personalize messages
alter table public.recipients
  add column if not exists notes text;
