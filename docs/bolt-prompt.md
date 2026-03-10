# Bolt.new Prompt — TV VOD App

Paste the content below into Bolt.new as a single prompt.

---

## Prompt

Build a TV streaming VOD app using **React 18+, TypeScript, Vite, and Tailwind CSS**.

The app targets smart TV platforms (LG webOS, Samsung Tizen, Android TV, Apple TV) but must also work on mobile browsers. The primary input method is a TV remote (D-pad arrow keys + Enter + Back), not a mouse. Design for a **10-foot UI** — large text, generous padding, high-contrast focus states, no visible scrollbars, dark cinematic theme inspired by Apple TV+.

---

### Global requirements

- Dark background (#0a0a0a or similar near-black).
- All navigation must work with **arrow keys and Enter**. Every interactive element must show a clearly visible focus ring or glow when focused. Horizontal content rows must scroll smoothly to keep the focused item in view.
- Touch and mouse should also work (for mobile fallback) but are not the primary input.
- Use `@noriginmedia/norigin-spatial-navigation` (or equivalent) for spatial/D-pad navigation.
- No authentication, no user profiles, no watchlist — out of scope.
- No scrollbars anywhere. Horizontal rows scroll via focus movement or touch swipe.
- Responsive: full-screen on TV (1920×1080), and adapts down to mobile viewports.

---

### API configuration

Base URL: `https://galaxy-api.galaxydve.com`

```ts
const API_KEY = 'api_key_iatest';
const API_SECRET = 'GaLxAiDviTS12*';
const CAMPAIGN_ID = '4679';
const SERVICE_ID = '39';
const COUNTRY_CODE = 'fr';
const LANGUAGE_CODE = 'fr';
```

All API responses follow the structure `{ data: { data: [...] } }`.

---

### API endpoints

#### RUBRIC_LIST — Get categories

```
GET /publishing-rubric-list?api_key={API_KEY}&api_secret_key={API_SECRET}&country_code=fr&language_code=fr&campaign_id={CAMPAIGN_ID}&rubric_id={RUBRIC_ID}
```

Response items (inside `data.data`):
- `rubric_id` — category ID
- `rubric_title` — category display name
- `nb_content` — number of items in the category

#### CONTENTS_CATEGORY — Get content items for a category

```
GET /publishing-content-list?api_key={API_KEY}&api_secret_key={API_SECRET}&country_code=fr&language_code=fr&campaign_id={CAMPAIGN_ID}&rubric_id={RUBRIC_ID}&preview=true&asset=true&delivery=true
```

Response items (inside `data.data`):
- `title` — content title
- `description` — content description
- `content_id` — unique content ID
- `content_type` — type label (e.g. "movie", "series")
- `rubric_id` — array of rubric IDs where this content appears
- `assets` — see Asset structure below

#### CONTENT_DETAILS — Get single content details

```
GET /publishing-content-detail?api_key={API_KEY}&api_secret_key={API_SECRET}&country_code=fr&language_code=fr&campaign_id={CAMPAIGN_ID}&content_id={CONTENT_ID}&preview=true&asset=true&delivery=true
```

Same fields as CONTENTS_CATEGORY, plus:
- `deliveries.ba` — object whose keys are quality labels (e.g. `"HD (720p)"`). Each quality is an array of objects with a `url` field. Use the first entry of the first available quality as the video stream URL. Prefer `"HD (720p)"` if available.

#### SEARCH_CONTENT — Search by title

```
GET /publishing-content-list?content_title={SEARCH}&content_type=html&preview=true&asset=true&delivery=true&without_token=true&itemsPerPage=10&page=1&api_key={API_KEY}&api_secret_key={API_SECRET}&country_code=fr&language_code=fr&campaign_id={CAMPAIGN_ID}
```

Response structure is the same as CONTENTS_CATEGORY.

---

### Asset structure and selection logic

Every content item has an `assets` object with these keys. Each key holds an array of objects with `ratio_tech_label`, `height`, `width`, and `url`.

| Asset key          | Usage                                      |
|--------------------|-------------------------------------------|
| `cover`            | Poster / card thumbnail                    |
| `icon`             | Small icon — use the first item if present |
| `screenshot`       | Preview screenshots                        |
| `art-background`   | Large cinematic backdrop                   |
| `highlight`        | Hero highlight image                       |
| `highlight-title`  | Title treatment image for hero             |

**Cover image selection**: from `assets.cover`, pick the first item whose `ratio_tech_label` matches (in priority order):
1. `portrait-3-4`
2. `portrait-2-3`
3. `portrait-9-16`

Use its `url` as the poster image.

**Art-background selection**: from `assets["art-background"]`, pick the widest available image for use as backdrop/hero.

---

### Pages

#### 1. Home Page

**Hero section** at the top:
- Fetch content from CONTENTS_CATEGORY with `campaign_id=4679` and `rubric_id=268833`.
- Display the first item (or auto-rotate) as a large hero banner using `assets["art-background"]` or `assets.highlight` as the full-width backdrop image. If `assets["highlight-title"]` exists, overlay it as the title treatment; otherwise render the `title` as large text.
- Show `description` truncated to 2-3 lines, and a "Watch" / "More Info" button.

**Category rows** below the hero:
- Call RUBRIC_LIST with `campaign_id=4679` and `rubric_id=273536,268860,295883,287837,294356,291318,287839,287838,287840,268858,268859,268857,270101,273535,268866,273694,283300,268844,268850,268845`.
- For each rubric returned, display a row titled with `rubric_title`.
- For each row, call CONTENTS_CATEGORY with that rubric's `rubric_id` and `campaign_id=4679` to get the items.
- Each item is a card showing the cover image (portrait, per selection logic above) with the title below. Cards scroll horizontally via D-pad or touch.
- Clicking/pressing Enter on a card navigates to the Content Details page for that `content_id`.

#### 2. Content Details Page

- Fetch from CONTENT_DETAILS with the selected `content_id` and `campaign_id=4679`.
- **Top section**: If `deliveries.ba` exists and has a video URL, show a video player using that URL as the source with the `art-background` image as the poster/preview frame. If no video is available, show the `art-background` image as a static hero. Overlay the title and a "Play" button.
- **Synopsis section**: display `title` and `description`.
- **Related content section** (below synopsis): call RUBRIC_LIST with `campaign_id=4679` and `rubric_id=270102`. For each rubric returned, fetch its contents via CONTENTS_CATEGORY and display as horizontal card rows (same component as the home page rows).

**Video player requirements**:
- Read the stream URL from `data.data.deliveries.ba["HD (720p)"][0].url` (fall back to the first available quality key if "HD (720p)" is not present).
- Full-screen playback with controls: play/pause, seek bar, elapsed/total time, back button.
- Pressing Back or Escape exits the player and returns to the details page.

#### 3. Search

- A search input in the header/nav bar, accessible via D-pad.
- When the user types a query (debounce ~400ms), call SEARCH_CONTENT with the query string.
- Display results as a grid of content cards (same card component as home).
- Each card must show a **content_type label/watermark** overlaid on the poster image (e.g. a small badge showing "movie" or "series").
- Clicking a result opens the Content Details page.

---

### Navigation and layout

- **Header**: app logo/title on the left, search input on the right. Always visible.
- **Home** is the default/landing view.
- Use React Router (or simple state-based routing) for navigation between Home, Content Details, and Search results.
- Back button / Escape key should navigate back in history.
- When a content row is focused, pressing Up/Down moves to the previous/next row. Left/Right moves within the row.

---

### Summary of IDs to use

| Purpose                         | campaign_id | rubric_id                                                                                                   |
|---------------------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| Hero / highlighted content      | 4679        | 268833                                                                                                      |
| Category rows on home           | 4679        | 273536,268860,295883,287837,294356,291318,287839,287838,287840,268858,268859,268857,270101,273535,268866,273694,283300,268844,268850,268845 |
| Related content (details page)  | 4679        | 270102                                                                                                      |
| Test content_id                 | —           | 6498009                                                                                                     |
