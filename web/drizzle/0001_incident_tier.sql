ALTER TABLE "incidents" ADD COLUMN "tier" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "confidence" real DEFAULT 0 NOT NULL;