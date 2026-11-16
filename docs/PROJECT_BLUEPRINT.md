# DevVault — Project Blueprint
## Personal Developer Knowledge Management Platform

---

## 1. Executive Summary & Vision

**DevVault** is a modern, high-performance personal developer knowledge management platform designed for engineers, architects, and technical creators. 

Modern developers consume high-signal technical content across disparate platforms throughout the day—GitHub repositories, YouTube deep dives and Shorts, Instagram technical reels and carousels, documentation guides, UI design inspirations, database internals, and cybersecurity advisories. Without a dedicated capture-and-synthesis engine, this knowledge is lost in browser tabs, bookmarks, and fragmented social saves.

DevVault solves this by providing a unified, high-aesthetic command center built around the core philosophy:

> **Discover. Capture. Organize. Explore. Grow.**

### Guiding Principles
- **Aesthetic Precision**: Built with the visual quality of industry-leading developer tools (Linear, Raycast, Notion). Dark theme as default with a planned, fully supported light theme.
- **Speed & Low-Friction Capture**: Minimal clicks to save, tag, and categorize any technical resource.
- **Cross-Platform Parity**: First-class desktop dashboard paired with a mobile experience designed for touch and quick capture, evolving into an installable Progressive Web App (PWA).
- **Extensible Architecture**: Clean domain-driven separation of concerns, strict TypeScript interfaces, and decoupled data layers.

---

## 2. System Architecture & Tech Stack

### 2.1 Core Technologies
| Layer | Technology | Selection Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15+ (App Router)** | Modern React Server Components, server actions, route handlers, optimized bundling with Turbopack. |
| **Language** | **TypeScript (Strict Mode)** | Complete end-to-end type safety, reliable refactoring, strict null checks. |
| **Styling** | **Tailwind CSS v3/v4** | Token-driven design system, custom CSS variables, dark/light theme switching, responsive utilities. |
| **Component Primitives** | **shadcn/ui & Radix UI** | Accessible, unstyled, composable UI primitives (Dialog, Dropdown, Tooltip, Tabs, Command). |
| **Icons** | **Lucide React** | Consistent, modern developer iconography with uniform stroke weights and scalable rendering. |
| **Motion** | **Framer Motion** | Physics-based animations, layout transitions, exit states, and native reduced-motion respect. |
| **Validation** | **Zod** | Schema-first validation shared between client forms and server endpoints. |
| **Form Handling** | **React Hook Form** | Uncontrolled high-performance inputs with Zod resolver integration. |
| **Database & Auth** | **Supabase (PostgreSQL)** | Enterprise-grade PostgreSQL, Row Level Security (RLS), real-time capabilities, robust Auth. |
| **ORM** | **Prisma ORM** | Type-safe queries, declarative schema modeling, migration versioning. |
| **Deployment** | **Vercel** | Zero-config edge routing, preview environments, automated CI/CD integration. |

---

## 3. Planned Application Structure

```text
devvault/
├── docs/
│   ├── PROJECT_BLUEPRINT.md        # Comprehensive technical specifications & roadmap
│   └── DEVELOPMENT_LOG.md          # Chronological milestone log and architectural decisions
├── public/
│   ├── icons/                      # PWA icons, platform badges, favicon
│   └── manifest.json               # Web App Manifest for PWA installation
├── src/
│   ├── app/                        # Next.js App Router routes & layouts
│   │   ├── (dashboard)/            # Authenticated application shell
│   │   │   ├── dashboard/          # Central dashboard view
│   │   │   ├── resources/          # Resource library with filters & grid/list views
│   │   │   ├── explore/            # Explore Later queue & reading list
│   │   │   ├── collections/        # User-curated thematic bundles
│   │   │   ├── activity/           # Activity feed & analytics
│   │   │   └── settings/           # User preferences & theme customization
│   │   ├── api/                    # Route handlers (metadata extraction, CRUD)
│   │   ├── layout.tsx              # Root HTML & provider wrapper
│   │   └── globals.css             # Design tokens, theme variables, reset
│   ├── components/                 # Component library
│   │   ├── layout/                 # Sidebar, TopNav, MobileNav, AppShell
│   │   ├── dashboard/              # WelcomeBanner, StatsOverview, PlatformBreakdown, etc.
│   │   ├── resources/              # ResourceCard, ResourceGrid, AddResourceModal, QuickCapture
│   │   ├── ui/                     # Primitive shadcn/ui components (Button, Input, Badge, etc.)
│   │   └── shared/                 # EmptyState, SearchInput, TagPill, ThemeToggle
│   ├── config/                     # Navigation items, platform metadata, app constants
│   ├── data/                       # Initial mock fixtures (isolated from application logic)
│   ├── hooks/                      # Custom React hooks (useMediaQuery, useDebounce, etc.)
│   ├── lib/                        # Utilities (cn, formatting, validators)
│   └── types/                      # TypeScript declarations & domain models
├── prisma/
│   └── schema.prisma               # Relational data models (PostgreSQL)
├── .env.example                    # Sample environment variables
├── tailwind.config.ts              # Custom colors, typography, animations
├── tsconfig.json                   # Strict TypeScript compiler options
└── package.json                    # Project dependencies and run scripts
```

---

## 4. Planned Relational Database Schema (Prisma / Supabase PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Platform {
  GITHUB
  YOUTUBE
  INSTAGRAM
  WEBSITE
  DOCS
  DESIGN
  ARTICLE
  TOOL
}

enum ResourceStatus {
  INBOX
  SAVED
  EXPLORING
  COMPLETED
  ARCHIVED
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String?
  avatarUrl     String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  resources     Resource[]
  collections   Collection[]
  activities    ActivityLog[]
  settings      UserSettings?
}

model Resource {
  id            String             @id @default(uuid())
  userId        String
  title         String
  description   String?
  url           String
  platform      Platform
  status        ResourceStatus     @default(SAVED)
  isPinned      Boolean            @default(false)
  isFavorite    Boolean            @default(false)
  thumbnailUrl  String?
  faviconUrl    String?
  author        String?
  category      String             // Frontend, Backend, DevOps, Cybersecurity, UI/UX, AI/ML
  readTimeMin   Int?
  metadata      Json?              // Stars, forks, duration, likes, etc.
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  user          User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags          ResourceTag[]
  collections   CollectionResource[]

  @@index([userId, platform])
  @@index([userId, category])
  @@index([userId, status])
}

model Tag {
  id          String        @id @default(uuid())
  name        String        @unique
  color       String?
  resources   ResourceTag[]
}

model ResourceTag {
  resourceId  String
  tagId       String
  resource    Resource      @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  tag         Tag           @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([resourceId, tagId])
}

model Collection {
  id          String                @id @default(uuid())
  userId      String
  name        String
  description String?
  icon        String?
  color       String?
  isPublic    Boolean               @default(false)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  resources   CollectionResource[]

  @@index([userId])
}

model CollectionResource {
  collectionId String
  resourceId   String
  collection   Collection           @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  resource     Resource             @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@id([collectionId, resourceId])
}

model ActivityLog {
  id          String         @id @default(uuid())
  userId      String
  action      String         // CAPTURED, COMPLETED, ORGANIZED, FAVORITED
  resourceId  String?
  details     Json?
  createdAt   DateTime       @default(now())
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model UserSettings {
  id          String         @id @default(uuid())
  userId      String         @unique
  theme       String         @default("dark") // "dark" | "light" | "system"
  compactView Boolean        @default(false)
  defaultView String         @default("grid") // "grid" | "list"
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 5. Development Roadmap & Phases

- **Phase 01: Project Foundation, Design System & First Frontend (Current Milestone)**
  - Initialize clean Next.js 15+ TypeScript App Router structure.
  - Setup Tailwind CSS with custom design tokens, dark theme foundation, and CSS variables.
  - Establish responsive layout shell: Desktop Sidebar, Top Navigation with Command palette, Touch-friendly Mobile Header & Drawer.
  - Build polished Dashboard with realistic developer fixtures (GitHub, YouTube, Instagram, Docs).
  - Implement interactive Quick Add Resource modal with Zod validation.
  - Implement platform distribution metrics, category explorer, explore-later queue, and live filterable resource grid.
  - Quality checks: TypeScript strict validation, ESLint compliance, build verification.

- **Phase 02: Resource Capture Engine & Data Layer**
  - Supabase client integration & PostgreSQL connection.
  - Prisma migrations and repository services.
  - Metadata crawler API route (extract OpenGraph, GitHub API stars, YouTube video info).
  - Complete CRUD lifecycle for resources with optimistic UI updates.

- **Phase 03: Collections, Workspaces & Reading Queue**
  - Custom user collections (e.g., "Full-Stack Security Toolset", "Framer Motion Recipes").
  - Drag-and-drop or modal organization.
  - Explore Later queue with progress indicators and status transitions.

- **Phase 04: Search, Filtering & Command Palette**
  - Keyboard-first command palette (`Cmd+K` / `Ctrl+K`) for instantaneous navigation and search.
  - Fuzzy multi-filter engine (Platform, Category, Tags, Status, Date).

- **Phase 05: Analytics, Insights & Habits**
  - Weekly capture streaks, topic mastery visualizer, and platform consumption graphs.
  - Export capabilities (Markdown, JSON).

- **Phase 06: Progressive Web App & Offline Capabilities**
  - Service worker configuration, web app manifest, offline cached resource viewing.

- **Phase 07: Browser Extension & Quick Capture API**
  - Chrome / Chromium extension for one-click browser capture directly into DevVault.

---

## 6. Git Workflow & Discipline

- **Branch Protocol**:
  - `main`: Protected production branch.
  - `feat/project-foundation`: Foundation, design system, and first interactive dashboard.
  - `feat/*`: Granular feature branches.
  - `fix/*`: Bug fixes and hotfixes.
- **Commit Standard**: Follows Conventional Commits standard (`feat:`, `chore:`, `docs:`, `fix:`, `style:`, `refactor:`).
- **Execution Rule**: No commits or branches are pushed to remote or merged to `main` without explicit verification and authorization.

---

## 7. Deployment Strategy

- **Hosting**: Vercel for zero-config global edge network deployment.
- **Environment Variables**:
  - `DATABASE_URL`: Supabase connection pooler URL.
  - `DIRECT_URL`: Supabase direct connection for Prisma migrations.
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase API URL.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anonymous Public Key.
  - `NEXT_PUBLIC_APP_URL`: Production application URL.
- **CI/CD Pipeline**: Linting, type-checking, and build validation gate before production deployment.
