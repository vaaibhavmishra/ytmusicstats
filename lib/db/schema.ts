import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm/_relations";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { IUserStats } from "@/lib/types/database";

// ────────────────────────────────────────────────────────────
// Better Auth tables
// ────────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ────────────────────────────────────────────────────────────
// App tables
// ────────────────────────────────────────────────────────────

/** Song metadata cache — keyed by YouTube video ID. */
export const songs = sqliteTable("songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  channelTitle: text("channel_title"),
  duration: integer("duration").notNull(),
  thumbnail: text("thumbnail"),
  artistImage: text("artist_image"),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Per-user aggregated listening stats (one row per user). */
export const userStats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  totalSongs: integer("total_songs").notNull().default(0),
  totalArtists: integer("total_artists").notNull().default(0),
  totalPlaytime: integer("total_playtime").notNull().default(0),
  averageSongLength: integer("average_song_length").notNull().default(0),
  topArtist: text("top_artist"),
  topSong: text("top_song"),
  firstPlayDate: integer("first_play_date", { mode: "timestamp" }),
  lastPlayDate: integer("last_play_date", { mode: "timestamp" }),
  totalListens: integer("total_listens").notNull().default(0),
  monthlyPlaytime: integer("monthly_playtime").notNull().default(0),
  dailyAverageListens: integer("daily_average_listens").notNull().default(0),
  dailyAveragePlaytime: integer("daily_average_playtime").notNull().default(0),
  longestListenDay: integer("longest_listen_day", { mode: "timestamp" }),
  longestListenDayDuration: integer("longest_listen_day_duration")
    .notNull()
    .default(0),
  longestSession: integer("longest_session").notNull().default(0),
  // Nested arrays/objects stored as JSON text
  topSongs: text("top_songs", { mode: "json" })
    .$type<IUserStats["topSongs"]>()
    .notNull()
    .default(sql`'[]'`),
  topArtists: text("top_artists", { mode: "json" })
    .$type<IUserStats["topArtists"]>()
    .notNull()
    .default(sql`'[]'`),
  newArtistsThisMonth: integer("new_artists_this_month").notNull().default(0),
  totalNewArtists: integer("total_new_artists").notNull().default(0),
  // Song age statistics
  listeningAge: integer("listening_age"),
  averageReleaseYear: integer("average_release_year"),
  musicEra: text("music_era"),
  decadeDistribution: text("decade_distribution", {
    mode: "json",
  }).$type<IUserStats["decadeDistribution"]>(),
  oldestSong: text("oldest_song", {
    mode: "json",
  }).$type<IUserStats["oldestSong"]>(),
  newestSong: text("newest_song", {
    mode: "json",
  }).$type<IUserStats["newestSong"]>(),
  songsWithYearCount: integer("songs_with_year_count").default(0),
  lastUpdated: integer("last_updated", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
