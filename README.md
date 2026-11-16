# DevVault

> **Discover. Capture. Organize. Explore. Grow.**

**DevVault** is a personal developer knowledge management platform designed for engineers, architects, and technical makers. It provides a unified command center to collect, organize, explore, and master developer knowledge discovered across GitHub, YouTube, Instagram, documentation sites, design systems, backend engines, and cybersecurity repositories.

---

## Key Features (Phase 01)

- **Command Center Dashboard**: Visual overview of your technical knowledge vault, active streaks, platform distributions, and topic mastery.
- **Multi-Platform Resource Cards**: Tailored cards for GitHub repositories (stars/forks/languages), YouTube videos & Shorts, Instagram technical carousels/reels, and documentation guides.
- **Quick Capture Engine**: Fast, modal-based resource capture with URL parsing, platform auto-detection, domain categorization, and tag management.
- **Live Filtering & Search**: Instant full-text search across titles, descriptions, authors, tags, and platforms with status tabs (All, Inbox, Saved, Exploring, Completed).
- **Responsive Architecture**: Engineered from the ground up for desktop power-users and mobile touch devices.
- **Design System**: A dark-first aesthetic inspired by Linear, Raycast, and Notion, built with Tailwind CSS, shadcn/ui patterns, and Framer Motion micro-interactions.

---

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Primitives**: Radix UI / shadcn/ui
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Validation**: Zod & React Hook Form
- **Database (Planned)**: Supabase PostgreSQL & Prisma ORM
- **Deployment**: Vercel

---

## Getting Started

### Prerequisites
- Node.js 20+ LTS
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/arman080325/DevVault.git
cd DevVault

# Switch to the foundation branch
git checkout feat/project-foundation

# Install dependencies
npm install

# Run the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the dashboard.

---

## Project Structure

```text
devvault/
├── docs/                           # Architectural blueprints & development logs
├── public/                         # Static assets, icons, manifest
├── src/
│   ├── app/                        # Next.js App Router (pages, layout, globals.css)
│   ├── components/                 # UI components
│   │   ├── layout/                 # Sidebar, TopNav, MobileNav, Shell
│   │   ├── dashboard/              # Stats, PlatformBreakdown, CategoryExplorer, etc.
│   │   ├── resources/              # ResourceCard, AddResourceModal, QuickCapture
│   │   ├── ui/                     # Primitive design system components
│   │   └── shared/                 # EmptyState, SearchInput, TagPill
│   ├── config/                     # Navigation items, platform constants
│   ├── data/                       # Realistic developer mock fixtures
│   ├── hooks/                      # Custom hooks (media query, debounce, keyboard shortcuts)
│   ├── lib/                        # Utility functions
│   └── types/                      # Domain interfaces and TypeScript definitions
├── prisma/                         # Prisma schema & database specifications
└── tailwind.config.ts              # Custom design system configuration
```

---

## Documentation

- [Project Blueprint](docs/PROJECT_BLUEPRINT.md): Architectural decisions, database schema, and development roadmap.
- [Development Log](docs/DEVELOPMENT_LOG.md): Chronological record of milestones, features, and engineering decisions.

---

## License

MIT © [DevVault](https://github.com/arman080325/DevVault)
