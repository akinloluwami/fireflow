ALTER TABLE "workflows" ADD COLUMN "webhook_secret" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "webhook_auth_enabled" boolean DEFAULT false;