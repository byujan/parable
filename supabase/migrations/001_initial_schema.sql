-- ============================================================
-- Parable: Phishing Simulation Platform - Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. Profiles (linked to auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Templates
-- ============================================================
create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  html_body text not null,
  text_body text not null default '',
  sender_name text not null default 'IT Department',
  sender_email text not null default 'noreply@example.com',
  category text not null default 'credential_harvest'
    check (category in ('credential_harvest', 'malware_download', 'data_entry', 'link_click', 'attachment')),
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  created_by uuid references public.profiles(id) on delete set null,
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create policy "Admins can do everything with templates"
  on public.templates for all
  using (auth.uid() is not null);

-- ============================================================
-- 3. Landing Pages
-- ============================================================
create table public.landing_pages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  html_content text not null,
  has_form boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.landing_pages enable row level security;

create policy "Admins can do everything with landing pages"
  on public.landing_pages for all
  using (auth.uid() is not null);

-- ============================================================
-- 4. Recipient Lists
-- ============================================================
create table public.recipient_lists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.recipient_lists enable row level security;

create policy "Admins can do everything with recipient lists"
  on public.recipient_lists for all
  using (auth.uid() is not null);

-- ============================================================
-- 5. Recipients
-- ============================================================
create table public.recipients (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references public.recipient_lists(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  department text,
  group_tag text,
  created_at timestamptz not null default now()
);

alter table public.recipients enable row level security;

create policy "Admins can do everything with recipients"
  on public.recipients for all
  using (auth.uid() is not null);

-- Index for quick lookups
create index idx_recipients_list_id on public.recipients(list_id);
create index idx_recipients_email on public.recipients(email);

-- ============================================================
-- 6. Campaigns
-- ============================================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  template_id uuid not null references public.templates(id) on delete restrict,
  landing_page_id uuid not null references public.landing_pages(id) on delete restrict,
  recipient_list_id uuid not null references public.recipient_lists(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'completed')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "Admins can do everything with campaigns"
  on public.campaigns for all
  using (auth.uid() is not null);

-- ============================================================
-- 7. Campaign Events (tracking)
-- ============================================================
create table public.campaign_events (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recipient_id uuid not null references public.recipients(id) on delete cascade,
  token text not null,
  event_type text not null
    check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'submitted', 'reported', 'training_completed')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.campaign_events enable row level security;

-- Admins can read all events
create policy "Admins can read campaign events"
  on public.campaign_events for select
  using (auth.uid() is not null);

-- Service role can insert events (for tracking endpoints)
-- Note: service role bypasses RLS, so no insert policy needed for tracking.
-- But we add one for admin manual inserts:
create policy "Admins can insert campaign events"
  on public.campaign_events for insert
  with check (auth.uid() is not null);

-- Indexes for fast lookups
create index idx_campaign_events_campaign_id on public.campaign_events(campaign_id);
create index idx_campaign_events_token on public.campaign_events(token);
create index idx_campaign_events_recipient_id on public.campaign_events(recipient_id);
create index idx_campaign_events_type on public.campaign_events(event_type);

-- ============================================================
-- 8. Training Modules
-- ============================================================
create table public.training_modules (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  content_html text not null,
  linked_template_id uuid references public.templates(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.training_modules enable row level security;

create policy "Admins can do everything with training modules"
  on public.training_modules for all
  using (auth.uid() is not null);

-- ============================================================
-- Helper view: campaign stats (aggregated)
-- ============================================================
create or replace view public.campaign_stats as
select
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  count(distinct r.id) as total_recipients,
  count(distinct case when ce.event_type = 'sent' then ce.recipient_id end) as sent_count,
  count(distinct case when ce.event_type = 'delivered' then ce.recipient_id end) as delivered_count,
  count(distinct case when ce.event_type = 'opened' then ce.recipient_id end) as opened_count,
  count(distinct case when ce.event_type = 'clicked' then ce.recipient_id end) as clicked_count,
  count(distinct case when ce.event_type = 'submitted' then ce.recipient_id end) as submitted_count,
  count(distinct case when ce.event_type = 'reported' then ce.recipient_id end) as reported_count,
  count(distinct case when ce.event_type = 'training_completed' then ce.recipient_id end) as training_completed_count
from public.campaigns c
left join public.recipient_lists rl on rl.id = c.recipient_list_id
left join public.recipients r on r.list_id = rl.id
left join public.campaign_events ce on ce.campaign_id = c.id and ce.recipient_id = r.id
group by c.id, c.name, c.status;
