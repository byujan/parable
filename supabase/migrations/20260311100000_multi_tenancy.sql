-- ============================================================
-- Multi-tenancy: Organizations, memberships, and org-scoped RLS
-- ============================================================

-- 1. Organizations table
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- 2. Organization members (join table)
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

alter table public.organization_members enable row level security;

create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);

-- 3. Add organization_id to profiles
alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- Update role check to support more roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'admin', 'member'));

-- 4. Add organization_id to all data tables
alter table public.templates
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.landing_pages
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.recipient_lists
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.campaigns
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.training_modules
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.campaign_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- agent_sessions and agent_signals get org_id too
alter table public.agent_sessions
  add column if not exists organization_id uuid;

alter table public.agent_signals
  add column if not exists organization_id uuid;

-- 5. Indexes on organization_id for fast filtering
create index if not exists idx_templates_org on public.templates(organization_id);
create index if not exists idx_landing_pages_org on public.landing_pages(organization_id);
create index if not exists idx_recipient_lists_org on public.recipient_lists(organization_id);
create index if not exists idx_campaigns_org on public.campaigns(organization_id);
create index if not exists idx_training_modules_org on public.training_modules(organization_id);
create index if not exists idx_campaign_logs_org on public.campaign_logs(organization_id);
create index if not exists idx_agent_sessions_org on public.agent_sessions(organization_id);
create index if not exists idx_agent_signals_org on public.agent_signals(organization_id);
create index if not exists idx_profiles_org on public.profiles(organization_id);

-- 6. Helper function: get user's current organization_id
create or replace function public.get_user_org_id()
returns uuid as $$
  select organization_id from public.profiles where id = auth.uid()
$$ language sql stable security definer;

-- 7. Helper function: check if user is member of a specific org
create or replace function public.is_org_member(org_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.organization_members
    where organization_id = org_id and user_id = auth.uid()
  )
$$ language sql stable security definer;

-- ============================================================
-- 8. Rewrite ALL RLS policies to be org-scoped
-- ============================================================

-- -- Organizations: members can view their own orgs
drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_org_member(id));

drop policy if exists "Owners can update their organization" on public.organizations;
create policy "Owners can update their organization"
  on public.organizations for update
  using (
    exists(
      select 1 from public.organization_members
      where organization_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

-- Allow insert during signup flow (security definer function handles this)
drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- -- Organization members
drop policy if exists "Members can view org members" on public.organization_members;
create policy "Members can view org members"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

drop policy if exists "Admins can manage org members" on public.organization_members;
create policy "Admins can manage org members"
  on public.organization_members for all
  using (
    exists(
      select 1 from public.organization_members om
      where om.organization_id = organization_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  );

-- Allow self-insert during signup (the handle_new_user trigger uses security definer)
drop policy if exists "Users can insert own membership" on public.organization_members;
create policy "Users can insert own membership"
  on public.organization_members for insert
  with check (user_id = auth.uid());

-- -- Profiles: view own + same org members
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view same-org profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or organization_id = public.get_user_org_id()
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- -- Templates
drop policy if exists "Admins can do everything with templates" on public.templates;

create policy "Org members can manage templates"
  on public.templates for all
  using (organization_id = public.get_user_org_id());

-- -- Landing Pages
drop policy if exists "Admins can do everything with landing pages" on public.landing_pages;

create policy "Org members can manage landing pages"
  on public.landing_pages for all
  using (organization_id = public.get_user_org_id());

-- -- Recipient Lists
drop policy if exists "Admins can do everything with recipient lists" on public.recipient_lists;

create policy "Org members can manage recipient lists"
  on public.recipient_lists for all
  using (organization_id = public.get_user_org_id());

-- -- Recipients: scoped through their parent list's org
drop policy if exists "Admins can do everything with recipients" on public.recipients;

create policy "Org members can manage recipients"
  on public.recipients for all
  using (
    exists(
      select 1 from public.recipient_lists rl
      where rl.id = list_id
        and rl.organization_id = public.get_user_org_id()
    )
  );

-- -- Campaigns
drop policy if exists "Admins can do everything with campaigns" on public.campaigns;

create policy "Org members can manage campaigns"
  on public.campaigns for all
  using (organization_id = public.get_user_org_id());

-- -- Campaign Events: scoped through their parent campaign's org
drop policy if exists "Admins can read campaign events" on public.campaign_events;
drop policy if exists "Admins can insert campaign events" on public.campaign_events;

create policy "Org members can read campaign events"
  on public.campaign_events for select
  using (
    exists(
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.organization_id = public.get_user_org_id()
    )
  );

create policy "Org members can insert campaign events"
  on public.campaign_events for insert
  with check (
    exists(
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.organization_id = public.get_user_org_id()
    )
  );

-- -- Training Modules
drop policy if exists "Admins can do everything with training modules" on public.training_modules;

create policy "Org members can manage training modules"
  on public.training_modules for all
  using (organization_id = public.get_user_org_id());

-- -- Campaign Logs
drop policy if exists "Admins can read campaign logs" on public.campaign_logs;

create policy "Org members can read campaign logs"
  on public.campaign_logs for select
  using (organization_id = public.get_user_org_id());

-- -- Agent Sessions: enable RLS (was missing before)
alter table public.agent_sessions enable row level security;

create policy "Org members can manage agent sessions"
  on public.agent_sessions for all
  using (organization_id = public.get_user_org_id());

-- Service role bypasses RLS, so agent executor (using admin client) still works
-- But we also need a policy for the consume function
create policy "Service can manage all agent sessions"
  on public.agent_sessions for all
  to service_role
  using (true);

-- -- Agent Signals: enable RLS (was missing before)
alter table public.agent_signals enable row level security;

create policy "Org members can view agent signals"
  on public.agent_signals for select
  using (organization_id = public.get_user_org_id());

create policy "Service can manage all agent signals"
  on public.agent_signals for all
  to service_role
  using (true);

-- ============================================================
-- 9. Update handle_new_user trigger to create org on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  org_id uuid;
  org_name text;
  org_slug text;
begin
  -- Check if an org name was provided in metadata (for invite flows)
  if new.raw_user_meta_data->>'organization_id' is not null then
    -- Joining existing org via invite
    org_id := (new.raw_user_meta_data->>'organization_id')::uuid;

    insert into public.organization_members (organization_id, user_id, role)
    values (org_id, new.id, 'member');
  else
    -- New signup: create a personal org
    org_name := coalesce(
      new.raw_user_meta_data->>'organization_name',
      split_part(new.email, '@', 2),
      'My Organization'
    );
    org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'))
      || '-' || substr(gen_random_uuid()::text, 1, 8);

    insert into public.organizations (name, slug, owner_id)
    values (org_name, org_slug, new.id)
    returning id into org_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (org_id, new.id, 'owner');
  end if;

  -- Create profile linked to org
  insert into public.profiles (id, email, full_name, role, organization_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case
      when new.raw_user_meta_data->>'organization_id' is not null then 'member'
      else 'owner'
    end,
    org_id
  );

  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 10. Update campaign_stats view to be org-aware
-- ============================================================
drop view if exists public.campaign_stats;
create view public.campaign_stats as
select
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  c.organization_id,
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
group by c.id, c.name, c.status, c.organization_id;
