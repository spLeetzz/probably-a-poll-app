CREATE TYPE "public"."results_visibility" AS ENUM('public', 'private');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "results_visibility" "results_visibility" DEFAULT 'public' NOT NULL;