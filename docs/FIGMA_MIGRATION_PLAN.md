# DevVault — Figma Make to Next.js Implementation Plan
## Migration Plan & Architectural Blueprint (Phase 01.6)

**Target Branch:** `feat/figma-design-implementation`  
**Reference Source:** `design-reference/figma-make/`  
**Production Codebase:** `src/`  
**Status:** In Progress — Stage A Completed

---

## 1. Architectural Comparison

| Dimension | Existing Production Codebase (`src/`) | Figma Make Reference (`design-reference/figma-make/`) | Migration Strategy |
|---|---|---|---|
| **Framework & Engine** | Next.js 15+ (App Router), React 19, TypeScript strict | Vite + React 19 single-page prototype | Preserve Next.js App Router and production architecture; migrate UI structure into modular Next.js components. |
| **Styling & Design Tokens** | Tailwind CSS v3, HSL-based CSS variables in `globals.css` | Tailwind CSS v4 + custom CSS variable system in `index.css` | Port the Figma Make warm paper / dark espresso design tokens, typography, and classes into `src/app/globals.css` and `tailwind.config.ts`. |
| **Typography** | Manrope, DM Sans, IBM Plex Mono | **Instrument Sans** (body/UI), **Newsreader** (editorial serif headings/numbers), **IBM Plex Mono** (metadata/tags) | Adopt the approved Figma font system: `Instrument Sans`, `Newsreader` (italic serif), and `IBM Plex Mono` via Google Fonts / `next/font`. |
| **Color System (Light)** | Warm Paper (`#F4F3ED` canvas, `#202923` ink, `#24613D` forest accent) | **Editorial Parchment**: `--canvas: #f4f0e8`, `--surface: #fbf8f1`, `--raised: #ffffff`, `--ink: #24211d`, `--muted: #756e65`, `--faint: #9b9388`, `--rule: #d8d0c4`, `--accent: #b6503a` (terracotta rust), `--accent-soft: #e8d1c9`, `--hover: #e9e3d9` | Fully migrate the exact Figma Make light tokens into `--canvas`, `--surface`, `--raised`, `--ink`, `--muted`, `--faint`, `--rule`, `--accent`, `--accent-soft`, `--hover`. |
| **Color System (Dark)** | Forest-Charcoal (`#111714` canvas, `#79B28F` sage accent) | **Warm Dark Espresso/Ember**: `--canvas: #171512`, `--surface: #211e1a`, `--raised: #2a2621`, `--ink: #f1ece2`, `--muted: #a9a095`, `--faint: #797168`, `--rule: #3c3730`, `--accent: #da755c` (warm ember), `--accent-soft: #4b2d27`, `--hover: #2c2823` | Fully migrate the exact Figma Make dark tokens into CSS variables, preserving seamless dark/light toggle and URL parameter support. |
| **Brand Identity** | Standard SVG icon | **Custom Tilted Square Brand Glyph** (outer rotated square at -8° with inner rotated square at 16°) | Implement the Figma brand glyph in the desktop sidebar, mobile header, and application shell. |
| **Icons** | Lucide React | Minimal custom geometric SVG icons | Maintain Lucide React for accessible icons and map them directly to the Figma icon shapes, retaining custom geometric SVGs where visual exactness is required. |
| **Navigation & Shell** | Desktop Sidebar + TopNav + Mobile Bottom Nav + FAB | Desktop Sidebar (230px, collection counters, AL profile) + Sticky Topbar + Mobile Nav (5 tabs with floating center capture button) | Rebuild production application shell to match Figma layout, proportions, and breakpoints. |
| **Screens Implemented** | Dashboard (Welcome, Stats, Filters, Feed), Add Resource Dialog | **Home**, **Library**, **Resource Detail (Drawer/Sheet)**, **Quick Capture (Modal/Sheet)**, **Explore Later**, **Collections**, **Activity & Insights**, **Settings** | Implement all 6 dedicated full views + 2 modal experiences in modular Next.js components. |
| **State Management** | React useState + useMemo + URL search params | React useState + in-memory mock array | Combine the rich mock data and interactive CRUD/filter logic of production with the complete Figma view navigation. |

---

## 2. Design Tokens to Migrate

### Typography Scale
- **Headings & Editorial Accents**: `font-serif` (`Newsreader`, Georgia, serif) with italic accents (`em`).
- **Body & Navigation**: `font-sans` (`Instrument Sans`, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif).
- **Metadata, Counters, Status, Keys**: `font-mono` (`IBM Plex Mono`, monospace).

### Color Tokens
```css
/* Light Theme */
--canvas: #f4f0e8;
--surface: #fbf8f1;
--raised: #ffffff;
--ink: #24211d;
--muted: #756e65;
--faint: #9b9388;
--rule: #d8d0c4;
--accent: #b6503a;
--accent-soft: #e8d1c9;
--hover: #e9e3d9;
--shadow: 0 18px 55px #332b201e;

/* Dark Theme */
--canvas: #171512;
--surface: #211e1a;
--raised: #2a2621;
--ink: #f1ece2;
--muted: #a9a095;
--faint: #797168;
--rule: #3c3730;
--accent: #da755c;
--accent-soft: #4b2d27;
--hover: #2c2823;
--shadow: 0 22px 65px #00000059;
```

---

## 3. Component Rebuilding & Reuse Plan

### Components to Rebuild / Create
1. **`src/components/layout/brand.tsx`**: Tilted square brand glyph (`-8deg` outer, `16deg` inner) + DevVault wordmark.
2. **`src/components/layout/sidebar.tsx`**: 230px fixed desktop sidebar with "Save a link" primary button, nav items with active indicators and counters, quick collections list (`rust-dot`, `ink-dot`, `sage-dot`), and Alex Lin profile trigger.
3. **`src/components/layout/top-nav.tsx`**: Sticky topbar with mobile brand, global search button with `⌘ K`, theme switch (sun/moon), activity trigger, and mobile profile avatar.
4. **`src/components/layout/mobile-nav.tsx`**: Fixed bottom bar (5 tabs: Home, Library, Save [floating center], Explore, Collections) with safe-area bottom padding.
5. **`src/components/resources/resource-art.tsx`**: Figma dynamic visual artwork header per kind (`motion`, `github`, `video`, `article`, `docs`, `instagram`) with orbits, play icons, and typography.
6. **`src/components/views/home-view.tsx`**: Editorial greeting, dynamic date, large hero `CaptureBar`, Section 01 (`Continue exploring` with progress bar), Section 02 (`Recently saved` rows), Section 03 (`Curated shelves` mini cards + `At a glance` activity card).
7. **`src/components/views/library-view.tsx`**: Header with personal index count, search input with clear/shortcut, platform filter pills, sort dropdown, grid/list view toggle, and library cards.
8. **`src/components/views/explore-view.tsx`**: Queue controls (`All`, `Short reads`, `Watch`), numbered queue list with thumbnail art, domain/length, and "Start exploring" / "Remove" actions.
9. **`src/components/views/collections-view.tsx`**: Curated shelves grid (`rust`, `ink`, `sage`, `sand`), "+ New collection" modal form with live state creation.
10. **`src/components/views/activity-view.tsx`**: Monthly summary, 12-week interactive rhythm bar chart with hover heights and month axis, vault total / top interest / return rate metrics, and recent activity timeline.
11. **`src/components/views/settings-view.tsx`**: Profile card, reading atmosphere theme switch, capture defaults, weekly rediscovery toggle, and vault data export / clear actions.
12. **`src/components/modals/resource-detail-drawer.tsx`**: Desktop slide-out side panel / mobile full-screen view with large art header, open original action, mark explored toggle, editable notes, organization, and metadata.
13. **`src/components/modals/quick-capture-modal.tsx`**: Desktop modal / mobile bottom sheet with URL input, auto metadata preview, category and status dropdowns, note input, save shortcut (`⌘ ↵`), loading animation, and toast feedback.

### Existing Reusable Assets
- `src/types/resource.ts`: Full rich types for resources, platforms, categories, exploration statuses, and activities.
- `src/data/mockResources.ts`: Adaptable mock data matching both rich metadata and Figma kinds.
- `src/components/ui/*`: Radix UI primitives (Dialog, DropdownMenu, Tabs, Avatar) wrapped in the new Figma tokens.

---

## 4. Responsive Engineering Plan

- **Breakpoints**:
  - `> 1050px`: Full desktop (230px sidebar, 1120px max content).
  - `761px - 1050px`: Compact desktop (200px sidebar).
  - `≤ 760px`: Mobile breakpoint (sidebar hidden, sticky topbar with mobile brand, fixed bottom navigation with floating center save button, full-width sheet modals).
  - `≤ 380px`: Small mobile (compact padding, responsive font scaling).
- **Safe-area insets**: `pb-[env(safe-area-inset-bottom)]` and `calc(68px + env(safe-area-inset-bottom))` for modern iOS/Android navigation bars.
- **Verification Viewports**: 360px, 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px.

---

## 5. Implementation Milestones & Commit Sequence

- [x] **Milestone 1**: `docs: add Figma Make design reference` (Commit `fcd7b79`)
- [x] **Milestone 2**: `ui: migrate approved design tokens and typography` (Commit `fd36902`)
- [x] **Milestone 3**: `ui: implement redesigned application shell` (Commit `f2494fe`)
- [x] **Milestone 4**: `ui: migrate home dashboard experience` (Commit `1036b71`)
- [x] **Milestone 5**: `ui: implement redesigned resource library` (Commit `385cc23`)
- [x] **Milestone 6**: `ui: implement resource detail and quick capture` (Commit `8630c28`)
- [x] **Milestone 7**: `feat: implement explore later and collections interfaces` (Commit `3716ae5`)
- [x] **Milestone 8**: `ui: implement activity and settings experiences` (Commit `21f62fc`)
- [x] **Milestone 9**: `fix: complete responsive and visual refinements` (Commit `bc61f47`)
- [x] **Milestone 10**: `test: verify Figma implementation across viewports` (Commit pending)
