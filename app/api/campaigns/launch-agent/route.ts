import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithOrg } from "@/lib/supabase/org";
import { AgentExecutor } from "@/lib/agent/executor";
import { AgentTarget, ScenarioType, ChannelType } from "@/lib/agent/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify auth and get org
    const { user, orgId } = await getUserWithOrg();
    if (!user || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      campaign_id,
      scenario,
      channels,
      max_actions = 5,
      additional_context,
    } = body;

    if (!campaign_id || !scenario) {
      return NextResponse.json(
        { error: "Missing campaign_id or scenario" },
        { status: 400 }
      );
    }

    // Fetch campaign with recipients
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        `
        *,
        recipient_list:recipient_lists (
          name,
          recipients (*)
        )
      `
      )
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const recipients = campaign.recipient_list?.recipients || [];
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients in campaign" },
        { status: 400 }
      );
    }

    const allowedChannels = (channels || ["email"]) as ChannelType[];
    const companyName = campaign.recipient_list?.name || "the company";

    // Build targets array from all recipients
    const targets: AgentTarget[] = recipients
      .map((r: any) => ({
        email: r.email || "",
        phone: r.phone || "",
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        company: companyName,
        department: r.department || undefined,
        job_title: r.job_title || undefined,
        notes: r.notes || undefined,
      }))
      .filter((t: AgentTarget) => t.email || t.phone);

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients (need email or phone)" },
        { status: 400 }
      );
    }

    // Generate unique tracking token per recipient (maps target_index → token)
    const targetTokens: Record<number, string> = {};
    for (let i = 0; i < targets.length; i++) {
      targetTokens[i] = uuidv4();
    }

    // Build landing page URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const landingPageUrl = campaign.landing_page_id
      ? `${appUrl}/phish/${campaign.landing_page_id}`
      : `${appUrl}/phish/demo`;

    // Create ONE executor with ALL targets
    const executor = new AgentExecutor(targets, scenario as ScenarioType, {
      mock_channels: false,
      compressed_timing: false,
      ai_provider: "claude",
      ai_model: "claude-sonnet-4-20250514",
      max_actions,
      allowed_channels: allowedChannels,
      wait_timeout_ms: 5 * 60 * 1000,
      campaign_id: campaign_id,
      organization_id: orgId,
      landing_page_url: landingPageUrl,
      target_tokens: targetTokens,
    });

    const sessionId = executor.getSessionId();

    // Record campaign events for each recipient with their unique tracking token
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      await supabase.from("campaign_events").insert({
        campaign_id,
        recipient_id: recipient.id,
        token: targetTokens[i],
        event_type: "sent",
      });
    }

    // Update campaign status and link agent session
    await supabase
      .from("campaigns")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        agent_session_id: sessionId,
      })
      .eq("id", campaign_id);

    // Run the agent in the background (stays alive in dev server process)
    executor.run().catch((err) => {
      console.error(`[CAMPAIGN] Agent session ${sessionId} failed:`, err);
    });

    return NextResponse.json({
      campaign_id,
      session_id: sessionId,
      targets_count: targets.length,
    });
  } catch (error) {
    console.error("[CAMPAIGN] Launch error:", error);
    return NextResponse.json(
      { error: "Failed to launch campaign" },
      { status: 500 }
    );
  }
}
