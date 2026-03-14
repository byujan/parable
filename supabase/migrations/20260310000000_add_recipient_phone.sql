-- Add phone and job_title columns to recipients for multi-channel campaigns
alter table public.recipients add column if not exists phone text;
alter table public.recipients add column if not exists job_title text;
