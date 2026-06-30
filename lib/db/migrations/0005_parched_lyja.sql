CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"keyHash" text NOT NULL,
	"lastFour" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp,
	"revokedAt" timestamp,
	CONSTRAINT "api_key_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "apiKeyId" text;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_userId_idx" ON "api_key" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "api_key_keyHash_idx" ON "api_key" USING btree ("keyHash");--> statement-breakpoint
CREATE INDEX "document_apiKeyId_idx" ON "document" USING btree ("apiKeyId");