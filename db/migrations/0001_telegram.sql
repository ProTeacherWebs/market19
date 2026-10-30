CREATE TABLE "telegram_identities" (
	"telegram_user_id" varchar(40) NOT NULL,
	"profile_id" uuid NOT NULL,
	"username" varchar(120),
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_identities" ADD CONSTRAINT "telegram_identities_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_identities_tg_unique" ON "telegram_identities" USING btree ("telegram_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_identities_profile_unique" ON "telegram_identities" USING btree ("profile_id");
