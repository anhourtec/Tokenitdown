CREATE TABLE "user_preference" (
	"userId" text PRIMARY KEY NOT NULL,
	"defaultCleanTier" text DEFAULT 'clean' NOT NULL,
	"defaultChunkLevel" text DEFAULT 'auto' NOT NULL,
	"storeOriginals" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;