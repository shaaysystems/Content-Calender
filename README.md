# Q-Mark Media — Content Calendar

A premium, offline-first, Apple-inspired content calendar builder built for **Q-Mark Media**, a marketing and creative agency. It lets agency team members create professional, client-presentation-ready monthly content calendars, upload creatives, assign them to dates, track platforms/status, view auto-generated statistics, and export the final calendar as **PDF, PNG, or JPEG**.

> "Make Your Brand Matter." — Q-Mark Media

---

## 🆕 Critical PDF Export Fix + Content Summary Update (latest)

**1. PDF badge/pill/label alignment — root cause was `html2canvas`, not the CSS.** The earlier "IMPORTANT UI ALIGNMENT FIX" (flexbox `align-items:center` + `justify-content:center` + `line-height:1`) correctly centers text in the live browser, but `html2canvas` — the library that rasterizes the off-screen export DOM into the PDF/PNG/JPEG/Board images — does **not** reliably reproduce that same flexbox vertical-centering when it measures/paints text, so the exported PDF kept showing the old top/bottom-shifted badge text even though the on-screen app looked correct. **Fix:** every export-only badge/pill class was converted from flex+`line-height:1` centering to the deterministic, `html2canvas`-safe technique — an explicit fixed `height` on the badge with a matching `line-height` of the exact same pixel value (e.g. `height:24px; line-height:24px;`), while keeping horizontal `padding` for left/right breathing room and leaving colors/fonts/sizes/border-radius untouched. Classes fixed: `.exp-item-cid`, `.exp-item-type`, `.exp-item-pf span`, `.exp-platform-tags span` (Calendar Overview / PDF Page 1), `.edc-cid`, `.edc-type`, `.edc-platform` (PDF Content Details pages), `.ebi-cid`, `.ebi-type`, `.ebi-platform`, `.ebi-status` (Content Board PNG). Verified by literally running `html2canvas` on these exact badges in a headless browser and screenshotting the rasterized canvas output side-by-side with the live HTML — both now match with correct vertical centering, consistent height, and no clipped/edge-touching text.
2. **Content Type renamed:** `Festival / Occasion Post` → `Festive / Special Day Poster`, updated at the single source of truth (`QU.CONTENT_TYPES` in `js/utils.js`); every screen that lists content types (Add/Edit Content type-grid, Content Library filters, Content Summary) reads from this array dynamically, so the rename applies everywhere automatically. `Story` was already present as a type. Custom content types still work unchanged.
3. **Content Summary expanded to 7 metrics** (Calendar Preview, PDF Page 1, PNG, JPEG all share the same `exp-summary` block in `js/preview.js`): **Static Posts, Reels, Stories, Ad Creatives, Festive / Special Day Posters, Total Content, Posting Days** — all computed by *exact* `contentType` match (not substring guessing) from the existing generic `computeStats().byType` map, so they auto-update on every add/delete/edit-type-change/duplicate with zero manual entry. Total Content still sums *every* content type, not just the 5 named ones; Posting Days still counts unique dates with ≥1 item.
4. **Consistent uppercase type display:** `Story` / `Festive / Special Day Poster` now render as `STORY` / `FESTIVE / SPECIAL DAY POSTER` everywhere a type label is shown — Calendar cards (`.chip-type`), Content Details pages (`.dc-type`), PDF Content Details (`.edc-type`), Content Board (`.ebi-type`), Calendar Overview/PDF Page 1 (`.exp-item-type`), and the interactive lightbox (new `.lb-meta-type` uppercase modifier added to the Content Type row only — Campaign/Status rows are untouched). Content Library card body and its type-category filter chips (now including *Stories* and *Festive / Special Day Posters* buckets, matched by exact type) also display the type consistently.
5. Service worker cache bumped to `v8` so every user picks up this fix immediately.

**Not changed:** colors, fonts, font sizes, card design, calendar layout, spacing system, or any other part of the app UI — this was a rendering-engine-level export fix plus additive content-summary fields only.

---

## 🔧 Recent Fix: "Saving..." Stuck on Add Content

An earlier build had a bug where clicking **Save** after uploading a creative would spin on "Saving..." forever. Root causes and fixes:

1. A stray line accidentally overwrote the internal undo function with a version that called itself, crashing every save silently. **Removed.**
2. The service worker cached app code cache-first, so once a browser loaded the buggy version it kept re-serving that same broken file even after the fix shipped. **Changed to network-first for app code** (HTML/CSS/JS), so fixes are picked up immediately whenever the device is online; the app still falls back to the cached version when offline. The service worker now also auto-activates updates and reloads the page once when a new version is available.
3. Image handling was hardened for real phone photos: uploads now decode large files (tested successfully up to ~11MB / 12MP) via `createImageBitmap` where available, are capped at 30MB, produce a compact stored thumbnail (~480px) plus a full image (~1600px), and any failure now shows a clear error message and re-enables the Save button instead of hanging.

If you still see a stuck save after this fix, hard-refresh the page once (or close and reopen the browser tab) so the updated service worker takes over — after that it will always self-update going forward.

---

## 🔧 Recent Fix: Creative Images No Longer Stretched/Distorted

Every place a creative thumbnail or large preview is shown — calendar chips, Content Details cards, the interactive lightbox, Content Library cards, the Day Detail modal, and every export (Calendar Overview, multi-page PDF Content Details pages, Content Board PNG) — previously used `object-fit: cover`, which crops/stretches an image to fill its box regardless of the creative's real aspect ratio. This has been changed to `object-fit: contain` everywhere creatives are displayed, so a portrait 9:16 Reel, a square 1:1 post, a 4:5 carousel slide, and a 16:9 landscape video thumbnail are all shown **fully, uncropped, and undistorted** — with neutral letterboxing/pillarboxing filling any leftover space in the box instead of stretching the image. Verified visually across all six surfaces with synthetic 9:16 / 1:1 / 16:9 / 4:5 test images.

---

## 🔧 Critical Fix: True Original-Aspect-Ratio Preservation in PDF / PNG / Board Exports

The `object-fit: contain` fix above solved distortion for the **live, on-screen** browser rendering, but the actual exported PDF/PNG files (generated via `html2canvas` rasterizing off-screen DOM nodes) could still show stretched creatives. Root cause: `html2canvas` does not always honor a fixed CSS `aspect-ratio` box combined with `object-fit: contain` the same way a live browser does, so a portrait or landscape image inside a **fixed-shape** container could be rasterized distorted even though it displayed correctly on screen.

**Fix — every creative is now sized from its own true pixel dimensions, never from a fixed-shape CSS box:**

1. **Original dimensions captured at upload time.** `handleFileUpload()` (`js/content-modal.js`) now reads the true `naturalWidth`/`naturalHeight` of every uploaded file (before any resize/compression) via `QU.getImageSize()` and stores them as `imageWidth`/`imageHeight` on the content item — the permanent source of truth for that creative's aspect ratio. Legacy items saved before this fix are measured on demand via `QU.ensureItemImageDims()` and cached back onto the item.
2. **New math helpers in `js/utils.js`:**
   - `QU.getImageSize(src)` — reads natural width/height of any image source.
   - `QU.fitContain(imgW, imgH, maxW, maxH)` — `scale = min(maxW/imgW, maxH/imgH)`; both rendered dimensions are always *derived* from this single scale, never set independently, so the shape can never distort.
   - `QU.orientationOf(w, h)` — classifies a creative as `portrait` / `landscape` / `square`.
   - `QU.ensureItemImageDims(item)` — resolves/caches `imageWidth`/`imageHeight` on any item.
3. **Content Details (on-screen `js/content-details.js` + PDF export `js/preview.js`)** — the fixed `aspect-ratio: 16/11` media box (`.dc-media` / `.edc-media`) was **removed**. Each card now gets an `dc-portrait`/`dc-landscape`/`dc-square` (or `edc-*`) modifier class computed from the creative's real orientation, and the `<img>` is given explicit `width`/`height` attributes matching its true original ratio. Portrait creatives render tall and narrow, landscape creatives render wide and shorter, square creatives stay square — exactly as specified, with no CSS `object-fit` reliance at rasterization time.
4. **Content Board PNG (`boardItemHtml`)** — same orientation-class + explicit width/height treatment (`.ebi-media.ebi-portrait/landscape/square`).
5. **Calendar Overview thumbnails (`.exp-item-media`, used on PDF Page 1 and the PNG/JPEG exports)** — kept as a small **fixed** box per the calendar-view exception (letterboxing is expected/acceptable here), but the letterboxed size is now computed explicitly in JS via `QU.fitContain()` against the exact box dimensions and applied as `width`/`height` attributes on the `<img>` — removing any dependency on `object-fit` inside html2canvas for this box too.
6. All dimension resolution happens **before** any export HTML is built (`await Promise.all(items.map(QU.ensureItemImageDims))`), so the very first render/export after this update is already correct — no second pass needed.
7. Service worker cache bumped to `v6` so all users pick up this fix immediately.

**Net effect:** across Calendar View, Calendar PDF, Content Details PDF, PNG export, JPEG export, and the Content Board PNG, every uploaded creative is now guaranteed to render at its exact original aspect ratio — only its overall *size* is ever scaled, never its *shape*.

---

## 🆕 Client Presentation System (Calendar Overview + Content Details)

Calendar cell thumbnails were too small for clients to read creative text. The app now follows one guiding principle throughout:

> **Calendar View = WHEN content will be posted. Content Details View = WHAT content will be posted.**

**Level 1 — Calendar Overview (enlarged).** Each scheduled item's card in the calendar grid (and in the Calendar-Overview export/preview) now shows: the day number, a medium-size creative thumbnail, a lime **Content ID** badge (`C01`, `C02`, …, assigned automatically by posting-date order), the Content Type, and readable Platform badges — enough to identify content at a glance without needing full artwork detail in a 30-day grid cell.

**Level 2 — Content Details view (`#/details/{calendarId}`, new).** A premium editorial page reachable from the Editor toolbar or Preview toolbar. Every scheduled creative is shown large and readable, 2 cards per row: date header with weekday ("04 September 2026 · Friday"), large image (~70% of the card), Content ID, Title, Content Type, Platform badges, Campaign Name, Description, and Status.

**Interactive lightbox.** Clicking any calendar thumbnail, Content Details card, Content Library card, or Day-Detail-modal row opens a large full-screen lightbox with the large creative image, full metadata, and **Previous / Next / Close** buttons (also keyboard: ←/→/Esc) to browse every scheduled item sequentially.

**Client View mode.** A toggle (in the Editor toolbar, Content Details toolbar, and Preview toolbar) that hides internal-only chrome — edit/delete buttons, drag-and-drop, "Add Content" affordances, internal Notes, and Status badges — while still showing the Calendar Overview, large creative previews, Content Details, and the Content/Platform Summary. This is a **UI convenience only**: it hides controls in the browser DOM, it is not a security boundary (see Settings/Access notes below if you ever need a real access-gated client link).

**Export overhaul (Preview & Export → Export Calendar):**
- **PDF** — now **multi-page**: Page 1 = Q-Mark branding, Client/Outlet, month/year, Calendar Overview, Content Summary & Platform Summary (same as before). Page 2 onward = **CONTENT DETAILS** — only **2 content pieces per page** (side by side), each shown extra-large with Posting Date, large Creative Image at its true original aspect ratio, Title, Content Type, and Platform badges — deliberately few per page so every creative, especially tall portrait creatives, has generous room and stays fully legible when zoomed in the PDF.
- **PNG / JPEG** — unchanged: Calendar Overview only.
- **Content Board PNG** (new) — a single tall image containing every scheduled creative sequentially (date header, large creative, title, type, platform badges, repeated), optimized for WhatsApp sharing, email, zooming, and printing/PDF conversion.

---

## ✅ Currently Completed Features

### Core Workflow
- **Dashboard** — greeting header, "Create New Content Calendar" CTA, recent calendars grid with client/outlet/location, month, content count, last-edited time, and a mini visual preview per card. Cards can be opened (→ editor) or deleted.
- **Create New Calendar wizard** (3 steps):
  1. **Client Details** — client name, unlimited outlets/branches, each with location name + optional latitude/longitude.
  2. **Calendar Period** — month/year pickers plus manual start/end date inputs, live validation, and an auto-computed summary (total days, start weekday, end weekday, number of weeks). Correctly supports 28/29/30/31-day months and leap years.
  3. **Calendar Settings** — layout choice (Monday start / Sunday start / Standard monthly) and 6 display toggles (content type, platforms, location, statistics, Q-Mark branding, month/year heading).
- **Calendar Editor** — the main workspace:
  - Premium monthly grid (7-column week layout, weekend shading, "Today" badge).
  - Each date shows an enlarged content card: creative thumbnail, sequential Content ID badge (C01, C02…), content type, and readable platform badges (see Client Presentation System above).
  - Multiple content pieces per day supported, with a "+N More" expansion into a Day Detail modal (edit / duplicate / delete per item); clicking any card/row opens the full-screen lightbox for browsing.
  - **Content Details** button opens the large-format editorial view (`#/details/{id}`); **Client View** toggle hides internal-only controls for client-facing walkthroughs.
  - **Add/Edit Content** side panel: image upload (JPG/JPEG/PNG/WEBP) with client-side resize/compression, replace/remove image, content type (16 presets + custom types), multi-select platform badges (Instagram, Facebook, LinkedIn, YouTube, YouTube Shorts, X, Pinterest, Google Business Profile, WhatsApp, Website, Email Marketing, Other — **no TikTok**, per spec), title, campaign name, caption/description, notes, and status (Draft/Ready/Scheduled/Published).
  - **Drag & drop**: drag a content chip from one date and drop it on another; the grid and stats update immediately.
  - **Undo / Redo** for all content changes (add, edit, delete, duplicate, move).
  - **Auto-calculated Content Statistics**: total pieces, content-type breakdown, platform distribution (bar charts), posting days out of total days, and posting frequency (e.g. "Every 6 days").
  - **Edit Details** modal to change client name, outlet, location, start/end dates, week-start layout, and display toggles at any time.
- **Content Library** — visual grid of every creative in the calendar with thumbnail, title, content type (shown uppercase), platforms, assigned date, and status badge. Filters: content-type category (All/Static Posts/Reels/Stories/Carousels/Ad Creatives/Festive-Special Day Posters/Videos — exact-match), platform, status, and a live title search. Cards open the edit panel (or the read-only lightbox in Client View).
- **Content Details view** (new, `#/details/{id}`) — every creative shown large & readable, 2 editorial cards per row: date + weekday, large image, Content ID, title, type, platform badges, campaign, description, status. Mirrors what's included in the PDF's Content Details pages.
- **Interactive lightbox** (new) — click any thumbnail anywhere to open a large image + full metadata with Previous/Next/Close navigation across all scheduled content.
- **Client View mode** (new) — one toggle available in the Editor, Content Details, and Preview toolbars that hides internal notes/edit/delete/status controls while keeping the Calendar Overview, large previews, Content Details, and summaries visible.
- **Preview & Export** — a dedicated, scaled, client-ready preview of the Calendar Overview (logo, client name, outlet, location, month/year heading, full calendar grid with enlarged content cards, content summary block, platform tags, and "Created by Q-Mark Media / Make Your Brand Matter." footer). Export menu:
  - **PDF** (A4 Landscape default, A3 Landscape option) — **multi-page**: Page 1 Calendar Overview + summaries, Page 2+ Content Details (2 large cards/row, one page per 4 items).
  - **PNG** / **JPEG** — Calendar Overview only. Standard (1920px), High-Resolution (3840px), Ultra HD/Print options.
  - **Content Board PNG** (new) — one tall image with every creative shown large, sequentially, for WhatsApp/email/presentations.
  - Automatic client-ready filenames, e.g. `Linen-Club_Forum-Mall-Kochi_Content-Calendar_September-2026.pdf`.
- **Settings** — agency name, logo upload/reset (used everywhere the logo appears, including exports), brand color pickers (Blue/Lime/Off-White/Charcoal) applied live via CSS variables, export-branding toggle, dark mode, JSON data backup/export, and a full local data wipe.
- **Global Search** — header search box filters the dashboard's calendar list by client name, outlet name, location, or calendar month.
- **Offline-first PWA** — `manifest.json` + `sw.js` service worker cache the app shell so the tool loads and fully functions with no network connection after first load. All data (clients, outlets, calendars, content items, uploaded images, settings) is stored client-side in **IndexedDB** — no backend/server and no login required.

### Design
- Brand colors applied throughout: Primary Blue `#015EFE`, Accent Lime `#C4F016`, Off-White `#FAF9F6`, Charcoal `#323131`.
- Apple-inspired: generous spacing, rounded corners (12–26px), subtle shadows, restrained color usage, Inter typeface, minimal animation.
- Fully responsive: desktop-first with tablet and mobile breakpoints for viewing and light editing.
- Q-Mark Media logo used in the app header and in the exported/preview calendar; replaceable from **Settings → Agency Logo**.

---

## 🗺️ Functional Entry Points (hash routes)

| Route | Description |
|---|---|
| `#/dashboard` (default) | Dashboard — recent calendars, search results |
| `#/create` | Create New Calendar wizard (3 steps) |
| `#/editor/{calendarId}` | Calendar Editor — grid, add/edit content, drag & drop, stats |
| `#/library/{calendarId}` | Content Library for that calendar (filters + search) |
| `#/details/{calendarId}` | Content Details view — large editorial cards, 2 per row (new) |
| `#/preview/{calendarId}` | Client-ready Preview & Export (PDF multi-page / PNG / JPEG / Content Board) |
| `#/settings` | Agency settings, branding, colors, data backup |

There is no REST/API backend — all "entry points" are pure client-side hash routes over local IndexedDB data.

---

## 🧱 Data Model (IndexedDB — database `qmark_calendar_db`)

**clients**
```
id, name, outlets: [{ id, name, locationName, latitude, longitude }]
```

**calendars**
```
id, clientId, outletId, month (0-based), year, startDate (ISO), endDate (ISO),
weekStartDay ('monday'|'sunday'|'standard'),
display: { showContentType, showPlatforms, showLocation, showStats, showBranding, showMonthYear },
createdAt, updatedAt
```

**contentItems**
```
id, calendarId, date (ISO), title, campaignName, contentType, platforms: [],
status ('Draft'|'Ready'|'Scheduled'|'Published'), description, notes,
image, thumbnail (data URLs, resized/compressed client-side), order, createdAt, updatedAt
```

**settings** (singleton, id `"app"`)
```
agencyName, logo (data URL), colors: { blue, lime, offWhite, charcoal },
showBranding, darkMode, customContentTypes: []
```

---

## 🚫 Not Yet Implemented / Known Limitations

- **Map-based location picking** — location is captured as text (+ optional manual lat/long) per the spec ("map is optional… should primarily appear as readable text"); there is no interactive map/search-pin UI.
- **Image cropping tool** — images can be uploaded, replaced, and removed, but there is no in-app crop editor (only automatic resize/compression for storage efficiency).
- **True vector PDF text** — PDF export currently rasterizes the calendar (via html2canvas → JPEG) into the PDF page for pixel-perfect visual fidelity to the on-screen design; it is not a fully vector/selectable-text PDF.
- **Multi-user / cloud sync** — this is intentionally a local-first, single-device tool with no login, matching the offline requirement; there's a manual JSON backup/restore export in Settings but no automatic cross-device sync.
- **Reordering multiple items within the same day via drag handles** — items can be moved between dates via drag & drop; fine-grained re-ordering within one day's list is not yet exposed (duplicate/delete/edit are available from the Day Detail modal).
- **Content IDs are computed, not persisted** — `C01`, `C02`… are recalculated at render time from date order every time, so they stay consistent across views/exports automatically, but they are not a stored/stable field on the record (inserting content earlier in the month will shift later IDs).
- **Client View is a UI convenience, not a security boundary** — it hides internal buttons/notes/status in the DOM for a clean client walkthrough. Anyone with browser devtools (or the underlying static files) could still see the underlying markup/data; it is not an access-control feature. If a client needs a real access-gated link, that requires a genuinely separate, access-controlled deployment — ask if that's needed.

## 🔭 Recommended Next Steps

1. Add a JSON **restore/import** action in Settings to complement the existing backup export.
2. Add an optional Leaflet/OpenStreetMap picker for outlet location (still storing lat/long text-first).
3. Add a lightweight in-browser crop tool (e.g. Cropper.js) for uploaded creatives.
4. Add within-day drag re-ordering handles in the Day Detail modal.
5. Consider IndexedDB storage-quota monitoring/warnings for agencies with very large image libraries.

---

## 🛠️ Tech Stack

- HTML5, CSS3 (custom design system, CSS variables for live theming), vanilla JavaScript (ES modules-free, script-tag based for simplicity)
- **IndexedDB** for all persistent storage (clients, calendars, content, images, settings)
- **Service Worker + Web App Manifest** for PWA/offline support
- **html2canvas** + **jsPDF** (via CDN) for client-side PDF/PNG/JPEG export
- **Font Awesome** for icons, **Inter** (Google Fonts) for typography
- No backend, no build step — fully static, deployable as-is

## 📂 Project Structure

```
index.html            Main app shell (header + view router mount)
manifest.json          PWA manifest
sw.js                  Service worker (offline app-shell caching)
css/style.css          Full design system & component styles
js/db.js               IndexedDB wrapper
js/utils.js            Date math, calendar grid builder, formatting, helpers
js/app.js              Router, header, settings bootstrap, PWA registration
js/dashboard.js        Dashboard view
js/wizard.js            Create New Calendar (3-step wizard)
js/editor.js            Calendar Editor (grid, drag&drop, undo/redo, stats)
js/content-modal.js     Add/Edit Content panel + Edit Calendar Details modal
js/library.js           Content Library view
js/lightbox.js          Interactive full-screen content lightbox (Prev/Next/Close)
js/content-details.js   Content Details view (Level 2 editorial cards)
js/preview.js           Preview & Export view + multi-page PDF / PNG / JPEG / Content Board export engine
js/settings.js          Settings view
images/qmark-logo.png   Q-Mark Media brand logo (replaceable in Settings)
```

## 🌐 Public URL

Use the **Publish tab** to deploy this static site and obtain a live URL. The app requires no server — any static host (including the Publish tab's one-click deploy) is sufficient, and the app will continue to work fully offline for end users after their first visit thanks to the service worker.
