ALTER TABLE "document" ADD COLUMN "markdownRaw" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "cleanTier" text DEFAULT 'clean' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "rawTokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "cleanTokens" integer DEFAULT 0 NOT NULL;