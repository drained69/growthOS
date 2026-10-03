CREATE TYPE "public"."data_mode" AS ENUM('DEMO', 'SIMULATED', 'TESTNET', 'LIVE');--> statement-breakpoint
CREATE TABLE "agent_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"mission_id" text,
	"run_id" text,
	"number" integer NOT NULL,
	"agent" text NOT NULL,
	"kind" text NOT NULL,
	"action" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"policy_verdict" text,
	"policy_checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"autonomous" boolean DEFAULT true NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"trigger" text NOT NULL,
	"status" text NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"decision_id" text NOT NULL,
	"transaction_id" text,
	"title" text NOT NULL,
	"details" jsonb NOT NULL,
	"requested_micro" bigint NOT NULL,
	"approved_micro" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_decision_id_unique" UNIQUE("decision_id")
);
--> statement-breakpoint
CREATE TABLE "attribution" (
	"id" text PRIMARY KEY NOT NULL,
	"conversion_event_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"experiment_id" text NOT NULL,
	"model" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attribution_conversion_event_id_unique" UNIQUE("conversion_event_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"experiment_id" text NOT NULL,
	"kol_id" text,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"utm_source" text NOT NULL,
	"utm_medium" text NOT NULL,
	"utm_campaign" text NOT NULL,
	"referral_code" text NOT NULL,
	"destination_url" text NOT NULL,
	"brief" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"description" text,
	"github_org" text,
	"x_handle" text,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"fit_score" integer DEFAULT 0 NOT NULL,
	"intent_score" integer DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"why_now" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_fit" text,
	"recommended_action" text,
	"status" text DEFAULT 'candidate' NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion_events" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"campaign_id" text,
	"event_type" text NOT NULL,
	"custom_name" text,
	"visitor_id" text,
	"referral_code" text,
	"value_micro" bigint DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversion_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "daily_briefs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"date" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"project_id" text NOT NULL,
	"body" jsonb NOT NULL,
	"digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "decision_receipts_decision_id_unique" UNIQUE("decision_id")
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"post_id" text,
	"company_id" text,
	"kol_id" text,
	"narrative_id" text,
	"opportunity_id" text,
	"purchase_id" text,
	"dedupe_key" text NOT NULL,
	"source_url" text NOT NULL,
	"source_title" text,
	"provider" text NOT NULL,
	"excerpt" text NOT NULL,
	"signal_type" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"classified_by" text NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"mission_id" text NOT NULL,
	"opportunity_id" text,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"hypothesis" text NOT NULL,
	"channel" text NOT NULL,
	"budget_category" text NOT NULL,
	"target" text NOT NULL,
	"action" text NOT NULL,
	"budget_micro" bigint NOT NULL,
	"success_event" text NOT NULL,
	"success_target" integer NOT NULL,
	"stop_max_cpa_micro" bigint NOT NULL,
	"stop_after_spend_micro" bigint NOT NULL,
	"timeframe_days" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'proposed' NOT NULL,
	"outcome" jsonb,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icps" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"tier" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"company_size" text,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kols" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"person_id" text,
	"provider" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text,
	"url" text,
	"followers" integer,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"why_now" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_angle" text,
	"payout_address" text,
	"status" text DEFAULT 'candidate' NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learnings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"mission_id" text NOT NULL,
	"decision_id" text,
	"findings" jsonb NOT NULL,
	"reallocations" jsonb NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"category" text NOT NULL,
	"allocated_micro" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"template" text NOT NULL,
	"name" text NOT NULL,
	"goal_description" text NOT NULL,
	"goal_event" text NOT NULL,
	"goal_target" integer NOT NULL,
	"budget_micro" bigint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"data_mode" "data_mode" DEFAULT 'LIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "narrative_companies" (
	"narrative_id" text NOT NULL,
	"company_id" text NOT NULL,
	CONSTRAINT "narrative_companies_narrative_id_company_id_pk" PRIMARY KEY("narrative_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "narrative_kols" (
	"narrative_id" text NOT NULL,
	"kol_id" text NOT NULL,
	CONSTRAINT "narrative_kols_narrative_id_kol_id_pk" PRIMARY KEY("narrative_id","kol_id")
);
--> statement-breakpoint
CREATE TABLE "narrative_posts" (
	"narrative_id" text NOT NULL,
	"post_id" text NOT NULL,
	CONSTRAINT "narrative_posts_narrative_id_post_id_pk" PRIMARY KEY("narrative_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "narratives" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"volume_7d" integer DEFAULT 0 NOT NULL,
	"volume_prev_7d" integer DEFAULT 0 NOT NULL,
	"velocity_pct" integer DEFAULT 0 NOT NULL,
	"relevance" integer DEFAULT 0 NOT NULL,
	"controversy" real DEFAULT 0 NOT NULL,
	"summary" text,
	"data_mode" "data_mode" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"mission_id" text,
	"number" integer NOT NULL,
	"subject_key" text NOT NULL,
	"type" text NOT NULL,
	"secondary_type" text,
	"title" text NOT NULL,
	"why_now" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_action" text NOT NULL,
	"confidence" real NOT NULL,
	"expected_value" text NOT NULL,
	"estimated_cost_micro" bigint DEFAULT 0 NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"company_id" text,
	"kol_id" text,
	"narrative_id" text,
	"issue_id" text,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"handle" text,
	"provider" text,
	"role" text,
	"url" text,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"max_transaction_micro" bigint NOT NULL,
	"daily_spend_micro" bigint NOT NULL,
	"kol_approval_threshold_micro" bigint NOT NULL,
	"bounty_approval_threshold_micro" bigint NOT NULL,
	"hard_ceiling_micro" bigint NOT NULL,
	"autonomous_categories" jsonb NOT NULL,
	"approval_categories" jsonb NOT NULL,
	"forbidden_actions" jsonb NOT NULL,
	"approved_service_hosts" jsonb NOT NULL,
	"allowed_tokens" jsonb NOT NULL,
	"allowed_chains" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policies_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "product_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"mentions_7d" integer DEFAULT 0 NOT NULL,
	"mentions_prev_7d" integer DEFAULT 0 NOT NULL,
	"change_pct" integer DEFAULT 0 NOT NULL,
	"segment" text,
	"recommendation" text,
	"blocks_acquisition" boolean DEFAULT false NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"post_id" text NOT NULL,
	"sentiment" text NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"issue_key" text,
	"competitor" text,
	"churn_risk" boolean DEFAULT false NOT NULL,
	"purchase_intent" boolean DEFAULT false NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_mentions_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE "product_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"target_users" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"competitors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"value_props" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"use_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing" text,
	"terminology" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"crawled_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_by" text NOT NULL,
	"founder_edited" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_profiles_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"docs_url" text,
	"x_handle" text,
	"github_url" text,
	"description" text DEFAULT '' NOT NULL,
	"webhook_secret" text NOT NULL,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"data_mode" "data_mode" DEFAULT 'LIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"resource_url" text NOT NULL,
	"method" text DEFAULT 'GET' NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"price_micro" bigint,
	"network" text,
	"pay_to" text,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_schema" jsonb,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_resource_url_unique" UNIQUE("resource_url")
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"source_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"author_handle" text NOT NULL,
	"author_name" text,
	"author_url" text,
	"author_followers" integer,
	"title" text,
	"content" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"engagement" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"entities" jsonb DEFAULT '{"companies":[],"products":[],"people":[]}'::jsonb NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data_mode" "data_mode" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_events" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"wallet_id" text,
	"decision_id" text NOT NULL,
	"mission_id" text,
	"experiment_id" text,
	"kind" text NOT NULL,
	"rail" text NOT NULL,
	"budget_category" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"token" text DEFAULT 'USDC' NOT NULL,
	"chain" text NOT NULL,
	"dest_chain" text,
	"recipient" text,
	"state" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"tx_hash" text,
	"settlement_id" text,
	"settlement_status" text,
	"batch_tx_hash" text,
	"explorer_url" text,
	"error" text,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"website" text,
	"description" text,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"provider" text NOT NULL,
	"address" text,
	"circle_wallet_id" text,
	"blockchain" text DEFAULT 'ARC-TESTNET' NOT NULL,
	"status" text NOT NULL,
	"frozen" boolean DEFAULT false NOT NULL,
	"data_mode" "data_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "x402_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"service_id" text,
	"resource_url" text NOT NULL,
	"method" text NOT NULL,
	"price_micro" bigint NOT NULL,
	"purpose" text NOT NULL,
	"payer" text,
	"network" text,
	"http_status" integer,
	"response_digest" text,
	"response_excerpt" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "x402_purchases_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decision_id_agent_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."agent_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribution" ADD CONSTRAINT "attribution_conversion_event_id_conversion_events_id_fk" FOREIGN KEY ("conversion_event_id") REFERENCES "public"."conversion_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribution" ADD CONSTRAINT "attribution_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribution" ADD CONSTRAINT "attribution_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_kol_id_kols_id_fk" FOREIGN KEY ("kol_id") REFERENCES "public"."kols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_briefs" ADD CONSTRAINT "daily_briefs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_receipts" ADD CONSTRAINT "decision_receipts_decision_id_agent_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."agent_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_receipts" ADD CONSTRAINT "decision_receipts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_kol_id_kols_id_fk" FOREIGN KEY ("kol_id") REFERENCES "public"."kols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_narrative_id_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."narratives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icps" ADD CONSTRAINT "icps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kols" ADD CONSTRAINT "kols_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kols" ADD CONSTRAINT "kols_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_decision_id_agent_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."agent_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_budgets" ADD CONSTRAINT "mission_budgets_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_companies" ADD CONSTRAINT "narrative_companies_narrative_id_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."narratives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_companies" ADD CONSTRAINT "narrative_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_kols" ADD CONSTRAINT "narrative_kols_narrative_id_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."narratives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_kols" ADD CONSTRAINT "narrative_kols_kol_id_kols_id_fk" FOREIGN KEY ("kol_id") REFERENCES "public"."kols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_posts" ADD CONSTRAINT "narrative_posts_narrative_id_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."narratives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_posts" ADD CONSTRAINT "narrative_posts_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narratives" ADD CONSTRAINT "narratives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_kol_id_kols_id_fk" FOREIGN KEY ("kol_id") REFERENCES "public"."kols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_narrative_id_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."narratives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_issue_id_product_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."product_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_issues" ADD CONSTRAINT "product_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_mentions" ADD CONSTRAINT "product_mentions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_mentions" ADD CONSTRAINT "product_mentions_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_profiles" ADD CONSTRAINT "product_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_decision_id_agent_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."agent_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_purchases" ADD CONSTRAINT "x402_purchases_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x402_purchases" ADD CONSTRAINT "x402_purchases_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "decisions_project_number_uq" ON "agent_decisions" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "approvals_project_status_idx" ON "approvals" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "audit_project_idx" ON "audit_logs" USING btree ("project_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_project_name_uq" ON "companies" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "events_project_idx" ON "conversion_events" USING btree ("project_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "briefs_project_date_uq" ON "daily_briefs" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "evidence_company_idx" ON "evidence" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "evidence_kol_idx" ON "evidence" USING btree ("kol_id");--> statement-breakpoint
CREATE INDEX "evidence_narrative_idx" ON "evidence" USING btree ("narrative_id");--> statement-breakpoint
CREATE INDEX "evidence_opp_idx" ON "evidence" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiments_project_number_uq" ON "experiments" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "icps_project_idx" ON "icps" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kols_project_handle_uq" ON "kols" USING btree ("project_id","provider","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_budget_cat_uq" ON "mission_budgets" USING btree ("mission_id","category");--> statement-breakpoint
CREATE INDEX "missions_project_idx" ON "missions" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "narratives_project_key_uq" ON "narratives" USING btree ("project_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "opps_project_number_uq" ON "opportunities" USING btree ("project_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "opps_project_subject_uq" ON "opportunities" USING btree ("project_id","subject_key");--> statement-breakpoint
CREATE UNIQUE INDEX "people_project_handle_uq" ON "people" USING btree ("project_id","provider","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_key_uq" ON "product_issues" USING btree ("project_id","key");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_ext_uq" ON "social_posts" USING btree ("project_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "posts_published_idx" ON "social_posts" USING btree ("project_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_project_url_uq" ON "sources" USING btree ("project_id","url");--> statement-breakpoint
CREATE INDEX "tx_project_idx" ON "transactions" USING btree ("project_id","created_at");