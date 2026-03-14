-- AI agent campaigns don't require a template or landing page — the agent generates content
alter table public.campaigns
  alter column template_id drop not null,
  alter column landing_page_id drop not null;
