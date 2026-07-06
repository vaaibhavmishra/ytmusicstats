import { relations } from "drizzle-orm/_relations";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ────────────────────────────────────────────────────────────
// Better Auth tables
// ────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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

export const account = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
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
export const songs = pgTable("songs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  channelTitle: text("channel_title"),
  duration: integer("duration").notNull(),
  thumbnail: text("thumbnail"),
  artistImage: text("artist_image"),
  releaseDate: timestamp("release_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Per-user aggregated listening stats (one row per user). */
export const userStats = pgTable("user_stats", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
  firstPlayDate: timestamp("first_play_date"),
  lastPlayDate: timestamp("last_play_date"),
  totalListens: integer("total_listens").notNull().default(0),
  monthlyPlaytime: integer("monthly_playtime").notNull().default(0),
  dailyAverageListens: integer("daily_average_listens").notNull().default(0),
  dailyAveragePlaytime: integer("daily_average_playtime").notNull().default(0),
  longestListenDay: timestamp("longest_listen_day"),
  longestListenDayDuration: integer("longest_listen_day_duration")
    .notNull()
    .default(0),
  longestSession: integer("longest_session").notNull().default(0),
  // Nested arrays/objects stored as JSONB
  topSongs: jsonb("top_songs").notNull().default([]),
  topArtists: jsonb("top_artists").notNull().default([]),
  newArtistsThisMonth: integer("new_artists_this_month").notNull().default(0),
  totalNewArtists: integer("total_new_artists").notNull().default(0),
  // Song age statistics
  listeningAge: integer("listening_age"),
  averageReleaseYear: integer("average_release_year"),
  musicEra: text("music_era"),
  decadeDistribution: jsonb("decade_distribution"),
  oldestSong: jsonb("oldest_song"),
  newestSong: jsonb("newest_song"),
  songsWithYearCount: integer("songs_with_year_count").default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
