CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"sourceType" text NOT NULL,
	"sourceName" text NOT NULL,
	"mimetype" text,
	"sizeBytes" integer DEFAULT 0 NOT NULL,
	"storagePath" text,
	"markdown" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_userId_idx" ON "document" USING btree ("userId");