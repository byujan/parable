// ============================================================
// Database types matching Supabase schema
// ============================================================

export type UserRole = "admin"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type TemplateCategory =
  | "credential_harvest"
  | "malware_download"
  | "data_entry"
  | "link_click"
  | "attachment"

export type TemplateDifficulty = "easy" | "medium" | "hard"

export interface Template {
  id: string
  name: string
  subject: string
  html_body: string
  text_body: string
  sender_name: string
  sender_email: string
  category: TemplateCategory
  difficulty: TemplateDifficulty
  created_by: string
  is_ai_generated: boolean
  created_at: string
}

export interface LandingPage {
  id: string
  name: string
  html_content: string
  has_form: boolean
  created_by: string
  created_at: string
}

export interface RecipientList {
  id: string
  name: string
  created_by: string
  created_at: string
  recipients?: Recipient[]
}

export interface Recipient {
  id: string
  list_id: string
  email: string
  first_name: string
  last_name: string
  department: string | null
  group_tag: string | null
  created_at: string
}

export type CampaignStatus = "draft" | "scheduled" | "active" | "completed"

export interface Campaign {
  id: string
  name: string
  template_id: string
  landing_page_id: string
  recipient_list_id: string
  status: CampaignStatus
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  // Joined fields
  template?: Template
  landing_page?: LandingPage
  recipient_list?: RecipientList
}

export type EventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "submitted"
  | "reported"
  | "training_completed"

export interface CampaignEvent {
  id: string
  campaign_id: string
  recipient_id: string
  token: string
  event_type: EventType
  metadata: Record<string, unknown> | null
  created_at: string
  // Joined
  recipient?: Recipient
}

export interface TrainingModule {
  id: string
  name: string
  content_html: string
  linked_template_id: string | null
  created_at: string
}

// ============================================================
// AI generation types
// ============================================================

export interface GenerateTemplateRequest {
  category: TemplateCategory
  difficulty: TemplateDifficulty
  company_name?: string
  industry?: string
  additional_context?: string
}

export interface GenerateTemplateResponse {
  subject: string
  html_body: string
  text_body: string
  sender_name: string
  sender_email: string
}

export interface GenerateVariantsRequest {
  template_id: string
  count: number
}

export interface GenerateTrainingRequest {
  template_id: string
}

// ============================================================
// Campaign analytics types
// ============================================================

export interface CampaignStats {
  total_recipients: number
  sent: number
  delivered: number
  opened: number
  clicked: number
  submitted: number
  reported: number
  training_completed: number
}

export interface RecipientOutcome {
  recipient: Recipient
  events: EventType[]
  latest_event: EventType
  training_completed: boolean
}
