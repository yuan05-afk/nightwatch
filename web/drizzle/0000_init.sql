CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incident_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows_replay" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario" text NOT NULL,
	"seq" integer NOT NULL,
	"ts" timestamp NOT NULL,
	"src_ip" text NOT NULL,
	"dst_ip" text NOT NULL,
	"src_port" integer NOT NULL,
	"dst_port" integer NOT NULL,
	"protocol" integer NOT NULL,
	"features" real[] NOT NULL,
	"label" text NOT NULL,
	"family" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"shift_id" uuid NOT NULL,
	"group_key" text NOT NULL,
	"verdict" text NOT NULL,
	"predicted" text NOT NULL,
	"src_ip" text NOT NULL,
	"dst_ip" text NOT NULL,
	"dst_port" integer NOT NULL,
	"first_seen" timestamp NOT NULL,
	"last_seen" timestamp NOT NULL,
	"flow_count" integer DEFAULT 0 NOT NULL,
	"max_probability" real NOT NULL,
	"max_anomaly" real NOT NULL,
	"rank_score" real NOT NULL,
	"exemplar_flow_id" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"truth_family" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_stats" (
	"shift_id" uuid PRIMARY KEY NOT NULL,
	"flows_scored" integer DEFAULT 0 NOT NULL,
	"suppressed" integer DEFAULT 0 NOT NULL,
	"known" integer DEFAULT 0 NOT NULL,
	"unknown" integer DEFAULT 0 NOT NULL,
	"attacks_suppressed" integer DEFAULT 0 NOT NULL,
	"benign_alerts" integer DEFAULT 0 NOT NULL,
	"scoring_micros" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"scenario" text NOT NULL,
	"cursor" integer DEFAULT 0 NOT NULL,
	"capacity_minutes" integer DEFAULT 30 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_stats" ADD CONSTRAINT "shift_stats_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flows_replay_scenario_seq" ON "flows_replay" USING btree ("scenario","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_shift_key" ON "incidents" USING btree ("shift_id","group_key");--> statement-breakpoint
CREATE INDEX "incidents_shift_rank" ON "incidents" USING btree ("shift_id","rank_score");