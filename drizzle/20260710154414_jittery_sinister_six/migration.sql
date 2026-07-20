CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`key` text NOT NULL UNIQUE,
	`youtube_id` text NOT NULL UNIQUE,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`channel_title` text,
	`duration` integer NOT NULL,
	`thumbnail` text,
	`artist_image` text,
	`release_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` text NOT NULL UNIQUE,
	`total_songs` integer DEFAULT 0 NOT NULL,
	`total_artists` integer DEFAULT 0 NOT NULL,
	`total_playtime` integer DEFAULT 0 NOT NULL,
	`average_song_length` integer DEFAULT 0 NOT NULL,
	`top_artist` text,
	`top_song` text,
	`first_play_date` integer,
	`last_play_date` integer,
	`total_listens` integer DEFAULT 0 NOT NULL,
	`monthly_playtime` integer DEFAULT 0 NOT NULL,
	`daily_average_listens` integer DEFAULT 0 NOT NULL,
	`daily_average_playtime` integer DEFAULT 0 NOT NULL,
	`longest_listen_day` integer,
	`longest_listen_day_duration` integer DEFAULT 0 NOT NULL,
	`longest_session` integer DEFAULT 0 NOT NULL,
	`top_songs` text DEFAULT '[]' NOT NULL,
	`top_artists` text DEFAULT '[]' NOT NULL,
	`new_artists_this_month` integer DEFAULT 0 NOT NULL,
	`total_new_artists` integer DEFAULT 0 NOT NULL,
	`listening_age` integer,
	`average_release_year` integer,
	`music_era` text,
	`decade_distribution` text,
	`oldest_song` text,
	`newest_song` text,
	`songs_with_year_count` integer DEFAULT 0,
	`last_updated` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_user_stats_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);