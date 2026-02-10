import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const [
    { data: templates },
    { data: landingPages },
    { data: recipientLists },
  ] = await Promise.all([
    supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("landing_pages")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("recipient_lists").select(`
        *,
        recipients (count)
      `),
  ]);

  // Transform recipient lists to include count
  const listsWithCount = recipientLists?.map((list) => ({
    ...list,
    recipientCount: Array.isArray(list.recipients)
      ? list.recipients.length
      : (list.recipients as any)?.[0]?.count || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new phishing simulation campaign
        </p>
      </div>

      <div className="max-w-3xl">
        <CampaignForm
          templates={templates || []}
          landingPages={landingPages || []}
          recipientLists={listsWithCount || []}
        />
      </div>
    </div>
  );
}
