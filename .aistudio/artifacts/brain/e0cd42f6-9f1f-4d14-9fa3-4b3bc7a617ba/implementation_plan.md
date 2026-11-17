# Social Media Row & Share App Experience

Consolidate the Facebook and Instagram links into a single horizontal row inside Settings and add a **Share App** action that opens an interactive popup with a built-in, editable invite message, live app link, one-tap copy, and direct social sharing.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user accepted the recommended defaults during clarification. The choices below guide the build and can be adjusted before execution if needed.

- **Confirmed Decision 1 — Share Popup Flow**: Tapping **Share App** opens a dedicated modal featuring the message editor, one-tap **Copy Message**, social channel share buttons, and optional native **More Apps** share sheet when supported by the browser.
- **Confirmed Decision 2 — Automatic Live App URL**: The built-in invite message dynamically embeds the current live app origin (`window.location.origin`) so shared links always match the deployed environment without hardcoding URLs.
- **Confirmed Decision 3 — Pre-Filled & Editable Message (EN/BN)**: The default invite text starts with `"Hey, I'm using the best money manager — OrthoGro! Track wallets, savings, and expenses effortlessly: <app-link>"` (with a matching Bengali opening when Bengali is active) and remains fully editable before copying or sharing, with a one-tap **Reset** option back to the default message.

---

## 1. Overview & Core Concept

- **What It Does**: Updates the **Social Media** card in Settings so **Facebook** and **Instagram** always sit side-by-side on one line across mobile and desktop viewports, and places a **Share App** button directly underneath. Tapping **Share App** launches a share sheet/modal with a ready-to-send OrthoGro recommendation message containing the app link, copy-to-clipboard feedback, and direct social share launchers.
- **Target Audience / Persona**: Existing OrthoGro users (both Google-signed-in and Guest Mode users) who want to follow updates or recommend the app to friends and family on mobile messaging and social platforms.
- **Key Value**: Tightens Settings vertical space by keeping social links on a single row and turns word-of-mouth sharing into a two-tap workflow with clean Bengali and English copy.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌──────────────────────────────────────────────────────────────────────┐
│ Settings -> Social Media Card                                        │
│                                                                      │
│  ┌──────────────────────────┐    ┌──────────────────────────┐        │
│  │ [f] Facebook          ↗  │    │ [◎] Instagram         ↗  │  1 row │
│  └──────────────────────────┘    └──────────────────────────┘        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ [Share]  Share OrthoGro with Friends                  ›  │  CTA   │
│  └──────────────────────────────────────────────────────────┘        │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ tap "Share OrthoGro with Friends"
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Share App Modal                                                      │
│                                                                      │
│  Built-in Invite Message (Editable, EN/BN auto-selected)  [Reset]    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Hey, I'm using the best money manager — OrthoGro!            │    │
│  │ Track wallets, savings, and expenses effortlessly: https://… │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [ Copy Message ]          [ More Apps (Native Share if available) ] │
│                                                                      │
│  Share via Social Media                                              │
│  [ WhatsApp ]  [ Facebook ]  [ Instagram* ]  [ X / Telegram ]        │
└──────────────────────────────────────────────────────────────────────┘
* Instagram copies the message first with a toast hint, then opens Instagram
  (since Instagram web does not accept pre-filled text query URLs).
```

### Visual Identity & Theme

- **Aesthetic Direction**: Matches OrthoGro's clean financial utility aesthetic—crisp card boundaries, generous tap zones, and calm emerald/slate contrast with zero decorative clutter.
- **Color Palette & Mood**:
  - Neutral canvas (`#F6F8F7` light / `slate-950` dark), elevated card/modal surfaces (`white` / `slate-900`), and subtle hairline borders (`slate-200` / `slate-800`).
  - Brand emerald (`#16845B`) reserved for primary interactive actions (**Copy Message**, primary Share CTA icon/highlight), paired with recognizable platform accents only on the small social badges (Facebook `#1877F2`, Instagram gradient, WhatsApp `#25D366`).
- **Typography & Hierarchy**: Preserves the existing app sans typography (`Plus Jakarta Sans` / Bengali system sans), clear 14px bold card/modal titles, 12px muted helper text, and single-line `whitespace-nowrap truncate` labels inside the side-by-side **Facebook** and **Instagram** row so neither button wraps awkwardly on 360px–390px screens.
- **Component Styling & Layout**:
  - **One-Line Social Row**: Always uses a 2-column equal grid (`grid-cols-2 gap-2.5`) on every viewport width, maintaining `min-h-[48px]` touch targets and compact horizontal spacing (`px-3 py-2.5`) on narrow phones so both icons, labels, and external-link indicators fit cleanly.
  - **Share App Row**: Full-width `min-h-[52px]` interactive button immediately below the 2-column social row, styled consistently with other Settings action rows.
  - **Share Modal**: Centered `max-w-md` dialog (`rounded-3xl`, subtle backdrop overlay) on desktop and comfortable bottom-balanced modal on mobile, keeping all controls comfortably reachable and within the existing modal depth rules.

### Interactive Feedback & Motion

- **Copy State Feedback**: Clicking **Copy Message** copies the current textarea text (including the link), swaps the button icon/label briefly to a confirmed checkmark state (`Copied!` / `কপি হয়েছে!`), and triggers the existing centered-lower floating toast notification.
- **Instagram Helper Flow**: Because Instagram has no web URL pre-fill intent, tapping **Instagram** inside the Share modal automatically copies the invite text to the clipboard, shows an informative toast (`Message copied! Paste in Instagram DM, Story, or Bio.`), and opens Instagram in a new tab.
- **Empty Text Guard**: Prevents copying or sharing if the user clears the textarea completely, or re-enables immediately once text is entered or **Reset** is tapped.
- **Back Navigation & Focus Safety**: Modal registers with the global overlay guard so `Escape` and mobile hardware Back close the modal cleanly without exiting the app.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Always-2-Column Row vs. Responsive Wrap**
  - *Chosen Approach*: Keep Facebook and Instagram in a strict `grid-cols-2` single row even on small mobile widths, tightening internal gap/padding on `<640px` screens.
  - *Why*: Directly fulfills the requirement to show both buttons on one line while preserving $\ge 48\text{px}$ tap height and preventing text overflow via `truncate`.
  - *Alternatives Considered*: Stacking `grid-cols-1` below `640px`, which violated the one-line request on mobile.

- **Decision 2 — Dedicated Share Modal vs. Native Share Only**
  - *Chosen Approach*: Open a dedicated Share App modal containing the editable message, copy button, and explicit social media share buttons, plus an optional **More Apps** button powered by `navigator.share` when supported.
  - *Why*: Desktop browsers and certain embedded webviews lack `navigator.share`, and users specifically asked to view/copy the built-in message and share directly via social media.
  - *Alternatives Considered*: Calling `navigator.share` immediately on tap, which hides the editable message preview and fails silently or inconsistently in desktop/iframe contexts.

- **Decision 3 — Dynamic Runtime App URL**
  - *Chosen Approach*: Build the default share text from `window.location.origin` using localized EN and BN templates.
  - *Why*: Guarantees the shared link works across development, preview, and custom production domains without manual URL edits.
  - *Alternatives Considered*: Hardcoding a static link, which goes stale across environments.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ Application Shell                                                    │
│  ├─ Global Overlay & Back-Button Guard (tracks Share Modal state)    │
│  ├─ Language Context (EN / BN templates + live URL interpolation)    │
│  ├─ Toast Dispatcher (copy / social helper feedback)                 │
│  │                                                                   │
│  ├─ Settings View                                                    │
│  │   └─ Social Media Section                                         │
│  │       ├─ Row 1 (grid-cols-2): [Facebook]  [Instagram]             │
│  │       └─ Row 2 (full width):  [Share App] ──► opens Share Modal   │
│  │                                                                   │
│  └─ Share App Modal                                                  │
│      ├─ Message Editor State (initialized in EN/BN, resettable)      │
│      ├─ Clipboard Handler (navigator.clipboard + legacy fallback)    │
│      ├─ Social Intent Launchers (WhatsApp, Facebook, Telegram, X)    │
│      ├─ Instagram Copy-Then-Open Action                              │
│      └─ Conditional Native Share Action (navigator.share)            │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Transient UI State**:
  - `showShareAppModal: boolean` — Controls modal visibility and integrates into the global hardware Back button and floating assistant visibility rules.
  - `shareMessage: string` — Controlled textarea value initialized whenever the modal opens using the active language (`en` or `bn`) default message + `window.location.origin`.
  - `copiedJustNow: boolean` — 2-second visual confirmation state on the copy button.
- **No Persistent Backend Changes**: No Firestore collections, security rules, or localStorage schema updates are required.

### Interactive Component & State Mapping

1. **Settings Social Card**
   - Renders Facebook and Instagram anchor buttons inside a single `grid-cols-2` container with `min-w-0` and `truncate` safeguards.
   - Renders the full-width **Share App** trigger button below, invoking `onOpenShareApp()`.
2. **Share App Modal**
   - **Open / Reset**: Populates `shareMessage` from the localized template (`t.settings.shareAppDefaultMsg`, beginning with `"Hey, I'm using the best money manager"` in English and an equivalent natural opening in Bengali, with `{url}` replaced by `window.location.origin`). Tapping **Reset** restores the original template.
   - **Copy Action**: Writes `shareMessage.trim()` to clipboard via `navigator.clipboard.writeText` (with an off-screen textarea `execCommand('copy')` fallback for restricted contexts), sets `copiedJustNow = true` for 2s, and dispatches a success toast.
   - **Social Launchers**:
     - **WhatsApp**: Opens `https://wa.me/?text=<encodedMessage>`
     - **Facebook**: Opens `https://www.facebook.com/sharer/sharer.php?u=<encodedUrl>&quote=<encodedMessage>`
     - **Telegram**: Opens `https://t.me/share/url?url=<encodedUrl>&text=<encodedMessage>`
     - **X (Twitter)**: Opens `https://twitter.com/intent/tweet?text=<encodedMessage>`
     - **Instagram**: Copies `shareMessage` first, shows toast guidance, and opens `https://www.instagram.com`.
     - **Native Share** (shown when `typeof navigator.share === 'function'`): Calls `navigator.share({ title: 'OrthoGro', text: shareMessage, url })`, ignoring user cancellation (`AbortError`).
3. **Localization Coverage**:
   - Adds complete English and Bengali labels, headings, button captions, default invite message copy, and toast feedback strings.
