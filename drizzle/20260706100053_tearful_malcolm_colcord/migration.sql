CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp(6) with time zone,
	"refresh_token_expires_at" timestamp(6) with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp(6) with time zone NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"expires_at" timestamp(6) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp(6) with time zone NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "songs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL UNIQUE,
	"youtube_id" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"channel_title" text,
	"duration" integer NOT NULL,
	"thumbnail" text,
	"artist_image" text,
	"release_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp(6) with time zone NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL UNIQUE,
	"total_songs" integer DEFAULT 0 NOT NULL,
	"total_artists" integer DEFAULT 0 NOT NULL,
	"total_playtime" integer DEFAULT 0 NOT NULL,
	"average_song_length" integer DEFAULT 0 NOT NULL,
	"top_artist" text,
	"top_song" text,
	"first_play_date" timestamp,
	"last_play_date" timestamp,
	"total_listens" integer DEFAULT 0 NOT NULL,
	"monthly_playtime" integer DEFAULT 0 NOT NULL,
	"daily_average_listens" integer DEFAULT 0 NOT NULL,
	"daily_average_playtime" integer DEFAULT 0 NOT NULL,
	"longest_listen_day" timestamp,
	"longest_listen_day_duration" integer DEFAULT 0 NOT NULL,
	"longest_session" integer DEFAULT 0 NOT NULL,
	"top_songs" jsonb DEFAULT '[]' NOT NULL,
	"top_artists" jsonb DEFAULT '[]' NOT NULL,
	"new_artists_this_month" integer DEFAULT 0 NOT NULL,
	"total_new_artists" integer DEFAULT 0 NOT NULL,
	"listening_age" integer,
	"average_release_year" integer,
	"music_era" text,
	"decade_distribution" jsonb,
	"oldest_song" jsonb,
	"newest_song" jsonb,
	"songs_with_year_count" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp(6) with time zone NOT NULL,
	"created_at" timestamp(6) with time zone NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;