ALTER TABLE "Suggestion" RENAME TO "suggestion";--> statement-breakpoint
ALTER TABLE "suggestion" DROP CONSTRAINT "Suggestion_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "suggestion" DROP CONSTRAINT "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_fk";
--> statement-breakpoint
ALTER TABLE "suggestion" DROP CONSTRAINT "Suggestion_id_pk";--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_id_pk" PRIMARY KEY("id");--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_documentId_documentCreatedAt_Document_id_createdAt_fk" FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE no action ON UPDATE no action;