ALTER TABLE "answers" DROP CONSTRAINT "answers_item_id_fkey";
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;