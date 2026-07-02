# Test Fixtures

## `watch-history.json`

A compressed, representative subset of a real Google Takeout `watch-history.json` file.
Reduced from **~4 MB / 10,000+ entries** down to **~17 KB / 38 entries** while preserving
every structural variant and edge case the parsing/stats code must handle.

### Coverage

| Category | Count | What it tests |
|---|---|---|
| YouTube Music entries (included) | 34 | Normal parsing pipeline |
| YouTube entries (excluded) | 4 | `isYouTubeMusicEntry` filter rejects non-music headers |
| Entries without `subtitles` | 2 | Fallback to "Unknown Artist" |
| Entries without `titleUrl` | 1 | No YouTube ID extraction |
| Entries with `description` | 1 | Extra fields don't break parsing |
| Repeated video IDs (5× "Ishqa Ve") | 5 | Replay counting, top song ranking |
| Repeated video IDs (3× "Into You") | 3 | Second most-played song |
| Same artist, 4 different songs | 4 | Top artist stats, unique song counting |
| Close-together timestamps (<5 min) | 2 | Session detection (within 1hr gap) |
| Far-apart timestamps (>2 hrs) | 2 | Session boundary detection |

### Title Pattern Scenarios

| Label | Pattern tested |
|---|---|
| `simple_topic` | Short title, `- Topic` channel → clean artist |
| `short_title` | Very short title (e.g. "Watched Judaa") |
| `official_video_parens` | `(Official Video)` suffix removal |
| `official_music_video_bracket` | `[Official Music Video]` suffix removal |
| `lyrical` | `(Lyrical Video)` suffix removal |
| `feat_in_title` | `Ft.` / `feat.` in title → `cleanSongTitle` strips it |
| `remix` | `Remix` in title → `estimateDuration` returns 240s |
| `remix_official` | Remix + `(Official Audio Video)` combined suffixes |
| `live` | `(Live)` in title → `estimateDuration` returns 300s |
| `acoustic` | `Acoustic` in title → `estimateDuration` returns 240s |
| `extended` | `(Extended)` in title → `estimateDuration` returns 360s |
| `radio_edit` | `Radio Edit` in title → `estimateDuration` returns 180s |
| `intro` | `Intro` in title → `estimateDuration` returns 90s |
| `dash_separator` | `Artist - Song` title → `extractArtistFromTitle` |
| `pipe_separator` | `Song \| Artist \| ...` title |
| `year_in_parens` | `(2022)` in title → year extraction for listening age |
| `year_no_parens` | Year without parens → standalone year regex |
| `from_movie` | `(From "Movie Name")` pattern |
| `hd_in_title` | `(HD)` suffix removal |
| `unicode_title` | Non-ASCII chars (emoji, special) in title |

### Artist Channel Name Patterns

| Label | Pattern tested |
|---|---|
| `vevo_channel` | `SonyMusicIndiaVEVO` → `cleanArtistName` strips VEVO |
| `records_channel` | `Speed Records` → `cleanArtistName` strips Records |
| `music_channel` | `Anandmurti Gurumaa - Music` → strips Music suffix |
| `plain_artist_channel` | Plain channel name (no suffix to strip) |

### Excluded Entry Types

| Label | Why excluded |
|---|---|
| `youtube_not_music` | `header: "YouTube"` (not "YouTube Music") |
| `youtube_viewed` | Community post view, not a song |
| `shorts_creation` | "Used Shorts creation tools" (no URL/title) |
| `has_description` | YouTube video with product click (header = "YouTube") |
| `no_subtitles` | URL-as-title, no artist info |

### Time Range

- **Earliest**: `2026-02-23T18:17:19.020Z`
- **Latest**: `2026-06-27T07:14:44.080Z`
- Spans ~4 months for meaningful daily/monthly stats
