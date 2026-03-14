-- Backfill: create a single "Parable" organization and assign all existing users to it

DO $$
DECLARE
  parable_org_id uuid;
  usr record;
BEGIN
  -- Create the Parable organization
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES ('Parable', 'parable', NULL)
  RETURNING id INTO parable_org_id;

  -- Assign all existing users as owners of Parable org
  FOR usr IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.organization_id IS NULL
  LOOP
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (parable_org_id, usr.id, 'owner');

    UPDATE public.profiles
    SET organization_id = parable_org_id, role = 'owner'
    WHERE id = usr.id;
  END LOOP;

  -- Set the first user as the org owner
  UPDATE public.organizations
  SET owner_id = (SELECT id FROM public.profiles WHERE organization_id = parable_org_id ORDER BY created_at ASC LIMIT 1)
  WHERE id = parable_org_id;

  -- Backfill organization_id on all existing data tables
  UPDATE public.templates SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.landing_pages SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.recipient_lists SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.campaigns SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.training_modules SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.campaign_logs SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.agent_sessions SET organization_id = parable_org_id WHERE organization_id IS NULL;
  UPDATE public.agent_signals SET organization_id = parable_org_id WHERE organization_id IS NULL;
END;
$$;
