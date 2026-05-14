ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."event_type";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('poll');--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE "public"."event_type" USING "type"::"public"."event_type";--> statement-breakpoint
ALTER TABLE "answers" DROP COLUMN "is_correct";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "correct_answer";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "score";