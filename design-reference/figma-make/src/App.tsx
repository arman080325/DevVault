import { useMemo, useState, type ReactNode } from "react";

type Page = "home" | "library" | "explore" | "collections" | "activity" | "settings";
type ViewMode = "grid" | "list";
type IconName =
  | "arrow"
  | "activity"
  | "bookmark"
  | "check"
  | "chevron"
  | "clock"
  | "collection"
  | "explore"
  | "filter"
  | "grid"
  | "home"
  | "library"
  | "link"
  | "list"
  | "moon"
  | "more"
  | "plus"
  | "search"
  | "settings"
  | "spark"
  | "sun"
  | "x";

type Resource = {
  id: number;
  kind: "motion" | "github" | "video" | "article" | "docs" | "instagram";
  source: string;
  domain: string;
  title: string;
  description: string;
  category: string;
  length: string;
  saved: string;
  status: "To explore" | "Exploring" | "Completed";
  progress?: number;
  collection?: string;
};

const resources: Resource[] = [
  {
    id: 1,
    kind: "motion",
    source: "Motion",
    domain: "motion.dev",
    title: "Layout animations: the missing guide",
    description: "A practical introduction to smooth, interruptible layout transitions in React.",
    category: "Animation",
    length: "12 min read",
    saved: "Today",
    status: "Exploring",
    progress: 48,
    collection: "Frontend inspiration",
  },
  {
    id: 2,
    kind: "github",
    source: "GitHub",
    domain: "github.com/shadcn-ui",
    title: "shadcn/ui: Beautifully designed components",
    description: "Accessible components you can copy, customize and make your own.",
    category: "UI systems",
    length: "Repository",
    saved: "Today",
    status: "To explore",
    collection: "UI component libraries",
  },
  {
    id: 3,
    kind: "video",
    source: "YouTube",
    domain: "youtube.com",
    title: "How browsers render a page",
    description: "Follow a page from HTML and CSS all the way to pixels on screen.",
    category: "Web performance",
    length: "21 min watch",
    saved: "Yesterday",
    status: "To explore",
  },
  {
    id: 4,
    kind: "article",
    source: "Article",
    domain: "joshwcomeau.com",
    title: "A friendly introduction to container queries",
    description: "Build resilient components that respond to the space they actually occupy.",
    category: "CSS",
    length: "9 min read",
    saved: "2 days ago",
    status: "Completed",
    collection: "Frontend inspiration",
  },
  {
    id: 5,
    kind: "docs",
    source: "Documentation",
    domain: "react.dev",
    title: "Thinking in React",
    description: "Break a user interface into a component hierarchy and connect the data flow.",
    category: "React",
    length: "14 min read",
    saved: "May 19",
    status: "Completed",
  },
  {
    id: 6,
    kind: "instagram",
    source: "Instagram",
    domain: "instagram.com",
    title: "Five CSS details that make interfaces feel polished",
    description: "Small interaction and spacing refinements demonstrated in under a minute.",
    category: "UI craft",
    length: "54 sec watch",
    saved: "May 18",
    status: "To explore",
    collection: "Frontend inspiration",
  },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    activity: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    arrow: <path d="M5 12h14M14 6l6 6-6 6" />,
    bookmark: <path d="M7 4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21l-5-3-5 3z" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    collection: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 5V3h8v2" />
      </>
    ),
    explore: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16M7 12h10M10 17h4" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    home: (
      <>
        <path d="m3.5 11 8.5-7 8.5 7" />
        <path d="M5.5 9.5V20h13V9.5" />
      </>
    ),
    library: (
      <>
        <path d="M5 4h3v16H5zM10.5 4h3v16h-3zM16 4l3 15.5-3 .5-3-15.5z" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.2 4.1L17 8l-3.8 1.9L12 14l-1.2-4.1L7 8l3.8-1.9z" />
        <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-glyph">
        <span />
      </span>
      {!compact && <span>DevVault</span>}
    </div>
  );
}

function ResourceArt({ kind, large = false }: { kind: Resource["kind"]; large?: boolean }) {
  return (
    <div className={`resource-art ${kind} ${large ? "large" : ""}`}>
      {kind === "motion" && (
        <>
          <span>GUIDE / 08</span>
          <b>
            Framer
            <br />
            Motion
          </b>
          <i className="orbit one" />
          <i className="orbit two" />
        </>
      )}
      {kind === "github" && (
        <>
          <span>OPEN SOURCE / 2025</span>
          <b>ui</b>
          <i>Beautiful components for the web.</i>
        </>
      )}
      {kind === "video" && (
        <>
          <span>21:04</span>
          <b>
            How browsers
            <br />
            render a page
          </b>
          <i className="play">▶</i>
        </>
      )}
      {kind === "article" && (
        <>
          <span>ARTICLE / CSS</span>
          <b>
            Size is
            <br />a context.
          </b>
          <i className="article-rule" />
        </>
      )}
      {kind === "docs" && (
        <>
          <span>REACT / LEARN</span>
          <b>
            Thinking
            <br />
            in React
          </b>
          <i className="docs-mark">⌘</i>
        </>
      )}
      {kind === "instagram" && (
        <>
          <span>REEL / 00:54</span>
          <b>
            Five small
            <br />
            CSS details
          </b>
          <i className="reel-lines" />
        </>
      )}
    </div>
  );
}

function Sidebar({
  page,
  onPage,
  onCapture,
}: {
  page: Page;
  onPage: (page: Page) => void;
  onCapture: () => void;
}) {
  return (
    <aside className="sidebar">
      <Brand />
      <button className="sidebar-capture" onClick={onCapture}>
        <Icon name="plus" />
        Save a link
      </button>
      <nav>
        <button className={page === "home" ? "active" : ""} onClick={() => onPage("home")}>
          <Icon name="home" />
          Home
        </button>
        <button className={page === "library" ? "active" : ""} onClick={() => onPage("library")}>
          <Icon name="library" />
          Library
        </button>
        <button className={page === "explore" ? "active" : ""} onClick={() => onPage("explore")}>
          <Icon name="explore" />
          Explore<span>7</span>
        </button>
        <button
          className={page === "collections" ? "active" : ""}
          onClick={() => onPage("collections")}
        >
          <Icon name="collection" />
          Collections
        </button>
        <button className={page === "activity" ? "active" : ""} onClick={() => onPage("activity")}>
          <Icon name="activity" />
          Activity
        </button>
        <button className={page === "settings" ? "active" : ""} onClick={() => onPage("settings")}>
          <Icon name="settings" />
          Settings
        </button>
      </nav>
      <div className="sidebar-collection">
        <span>COLLECTIONS</span>
        <button onClick={() => onPage("collections")}>
          <i className="rust-dot" />
          Frontend inspiration<small>12</small>
        </button>
        <button onClick={() => onPage("collections")}>
          <i className="ink-dot" />
          Backend engineering<small>28</small>
        </button>
        <button onClick={() => onPage("collections")}>
          <i className="sage-dot" />
          Learning roadmaps<small>9</small>
        </button>
      </div>
      <div className="sidebar-bottom">
        <button className="profile" onClick={() => onPage("settings")}>
          <span>AL</span>
          <div>
            <b>Alex Lin</b>
            <small>Personal vault</small>
          </div>
          <Icon name="chevron" size={14} />
        </button>
      </div>
    </aside>
  );
}

function Topbar({
  theme,
  onTheme,
  onSearch,
  onSettings,
  onActivity,
}: {
  theme: "light" | "dark";
  onTheme: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onActivity: () => void;
}) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <Brand />
      </div>
      <button className="global-search" onClick={onSearch}>
        <Icon name="search" />
        <span>Search your library...</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="top-actions">
        <button aria-label="Toggle theme" onClick={onTheme}>
          <Icon name={theme === "light" ? "moon" : "sun"} />
        </button>
        <button aria-label="Open activity" onClick={onActivity}>
          <Icon name="more" />
        </button>
        <button className="mobile-avatar" onClick={onSettings} aria-label="Open settings">
          AL
        </button>
      </div>
    </header>
  );
}

function SectionHeading({
  index,
  title,
  action,
  onAction,
}: {
  index: string;
  title: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <span>{index}</span>
        <h2>{title}</h2>
      </div>
      <button onClick={onAction}>
        {action}
        <Icon name="arrow" size={15} />
      </button>
    </div>
  );
}

function CaptureBar({ onCapture }: { onCapture: () => void }) {
  return (
    <button className="capture-bar" onClick={onCapture}>
      <Icon name="link" />
      <span>
        <b>Paste a link to remember</b>
        <small>Instagram, YouTube, GitHub, docs or articles</small>
      </span>
      <i>
        Save to vault <Icon name="arrow" />
      </i>
    </button>
  );
}

function ContinueCard({ resource, onOpen }: { resource: Resource; onOpen: () => void }) {
  return (
    <article className="continue-card">
      <button className="continue-art" onClick={onOpen}>
        <ResourceArt kind={resource.kind} large />
      </button>
      <div className="continue-copy">
        <div className="eyebrow-row">
          <span>{resource.domain}</span>
          <span>{resource.length}</span>
        </div>
        <button onClick={onOpen}>
          <h3>{resource.title}</h3>
        </button>
        <p>{resource.description}</p>
        <div className="progress-line">
          <i style={{ width: `${resource.progress}%` }} />
        </div>
        <div className="continue-foot">
          <span>{resource.progress}% explored</span>
          <button onClick={onOpen}>
            Continue reading <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function RecentRow({ resource, onOpen }: { resource: Resource; onOpen: () => void }) {
  const short = {
    github: "GH",
    video: "YT",
    article: "AR",
    docs: "DO",
    instagram: "IG",
    motion: "MO",
  }[resource.kind];
  return (
    <article className="recent-row">
      <button className={`source-tile ${resource.kind}`} onClick={onOpen}>
        {short}
      </button>
      <button className="recent-title" onClick={onOpen}>
        <span>{resource.source}</span>
        <h3>{resource.title}</h3>
      </button>
      <span className="recent-category">{resource.category}</span>
      <time>{resource.saved}</time>
      <button className="row-action" aria-label="Bookmark">
        <Icon name="bookmark" />
      </button>
    </article>
  );
}

function HomePage({
  onCapture,
  onOpen,
  onLibrary,
  onPage,
}: {
  onCapture: () => void;
  onOpen: (resource: Resource) => void;
  onLibrary: () => void;
  onPage: (page: Page) => void;
}) {
  return (
    <div className="page home-page">
      <section className="home-intro">
        <span className="date-label">THURSDAY, MAY 22</span>
        <h1>
          Good morning, Alex.
          <br />
          <em>What have you found?</em>
        </h1>
        <p>A quiet place for the ideas, tools and lessons you want to return to.</p>
      </section>
      <CaptureBar onCapture={onCapture} />

      <section className="home-section continue-section">
        <SectionHeading
          index="01"
          title="Continue exploring"
          action="View queue"
          onAction={() => onPage("explore")}
        />
        <ContinueCard resource={resources[0]} onOpen={() => onOpen(resources[0])} />
      </section>

      <section className="home-section recent-section">
        <SectionHeading
          index="02"
          title="Recently saved"
          action="See everything"
          onAction={onLibrary}
        />
        <div className="recent-list">
          {resources.slice(1, 5).map((resource) => (
            <RecentRow key={resource.id} resource={resource} onOpen={() => onOpen(resource)} />
          ))}
        </div>
      </section>

      <section className="home-bottom-grid">
        <div className="collections-preview">
          <SectionHeading
            index="03"
            title="Curated shelves"
            action="All collections"
            onAction={() => onPage("collections")}
          />
          <div className="collection-cards">
            <article className="collection-mini rust">
              <div>
                <span>01</span>
                <small>12 pieces</small>
              </div>
              <h3>
                Frontend
                <br />
                <em>inspiration</em>
              </h3>
              <button onClick={() => onPage("collections")}>
                Open shelf <Icon name="arrow" />
              </button>
            </article>
            <article className="collection-mini ink">
              <div>
                <span>02</span>
                <small>28 pieces</small>
              </div>
              <h3>
                Backend
                <br />
                <em>engineering</em>
              </h3>
              <button onClick={() => onPage("collections")}>
                Open shelf <Icon name="arrow" />
              </button>
            </article>
          </div>
        </div>
        <button className="at-glance" onClick={() => onPage("activity")}>
          <span className="date-label">YOUR VAULT / MAY</span>
          <h2>At a glance</h2>
          <div>
            <b>248</b>
            <span>Resources saved</span>
          </div>
          <div>
            <b>7</b>
            <span>Waiting to explore</span>
          </div>
          <div>
            <b>18</b>
            <span>Completed this month</span>
          </div>
          <p>Five more discoveries explored than last month.</p>
          <span className="at-glance-link">
            View activity <Icon name="arrow" size={14} />
          </span>
        </button>
      </section>
    </div>
  );
}

function LibraryCard({
  resource,
  view,
  onOpen,
}: {
  resource: Resource;
  view: ViewMode;
  onOpen: () => void;
}) {
  if (view === "list") return <RecentRow resource={resource} onOpen={onOpen} />;
  return (
    <article className="library-card">
      <button className="card-art-button" onClick={onOpen}>
        <ResourceArt kind={resource.kind} />
      </button>
      <div className="library-card-copy">
        <div className="eyebrow-row">
          <span>{resource.domain}</span>
          <span>{resource.length}</span>
        </div>
        <button className="card-title" onClick={onOpen}>
          <h3>{resource.title}</h3>
        </button>
        <p>{resource.description}</p>
        <div className="card-foot">
          <span>{resource.category}</span>
          <div>
            <small className={`status ${resource.status.toLowerCase().replace(" ", "-")}`}>
              {resource.status}
            </small>
            <button>
              <Icon name="more" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function LibraryPage({
  onOpen,
  onCapture,
  query,
  setQuery,
}: {
  onOpen: (resource: Resource) => void;
  onCapture: () => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState("All");
  const visible = useMemo(() => {
    return resources.filter((resource) => {
      const matchesQuery = `${resource.title} ${resource.description} ${resource.category}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesFilter = filter === "All" || resource.source === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <div className="page library-page">
      <header className="library-head">
        <div>
          <span className="date-label">YOUR PERSONAL INDEX</span>
          <h1>Library</h1>
          <p>{resources.length} discoveries, kept with intention.</p>
        </div>
        <button className="library-add" onClick={onCapture}>
          <Icon name="plus" />
          Add resource
        </button>
      </header>

      <div className="library-search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, notes, tags or sources..."
        />
        {query && (
          <button onClick={() => setQuery("")}>
            <Icon name="x" size={15} />
          </button>
        )}
        <kbd>⌘ K</kbd>
      </div>

      <div className="library-tools">
        <div className="filters">
          {["All", "GitHub", "YouTube", "Article", "Documentation"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
          <button className="more-filter">
            <Icon name="filter" size={15} />
            More
          </button>
        </div>
        <div className="sort-view">
          <button>
            Recently saved <Icon name="chevron" size={13} />
          </button>
          <div>
            <button
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <Icon name="grid" />
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <Icon name="list" />
            </button>
          </div>
        </div>
      </div>

      <div className="results-label">
        <span>{visible.length} resources</span>
        <span>Updated just now</span>
      </div>
      {visible.length > 0 ? (
        <div className={`library-results ${view}`}>
          {visible.map((resource) => (
            <LibraryCard
              key={resource.id}
              resource={resource}
              view={view}
              onOpen={() => onOpen(resource)}
            />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <span>
            <Icon name="search" />
          </span>
          <h2>Nothing found for “{query}”</h2>
          <p>Try another phrase or clear the active filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setFilter("All");
            }}
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="library-head stage-head">
      <div>
        <span className="date-label">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function ExplorePage({ onOpen }: { onOpen: (resource: Resource) => void }) {
  const [queue, setQueue] = useState(
    resources.filter((resource) => resource.status !== "Completed"),
  );
  const [focus, setFocus] = useState<"All" | "Short reads" | "Watch">("All");
  const visible = queue.filter((resource) => {
    if (focus === "Watch") return resource.length.includes("watch");
    if (focus === "Short reads") return resource.length.includes("read");
    return true;
  });
  const remove = (id: number) => setQueue((items) => items.filter((item) => item.id !== id));

  return (
    <div className="page stage-page">
      <PageHeader
        eyebrow="YOUR READING QUEUE"
        title="Explore later"
        description={`${queue.length} thoughtful finds, waiting for the right moment.`}
      />
      <div className="queue-controls">
        <div className="filters">
          {(["All", "Short reads", "Watch"] as const).map((item) => (
            <button
              className={focus === item ? "active" : ""}
              onClick={() => setFocus(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <span>Ordered by oldest saved</span>
      </div>
      {visible.length ? (
        <div className="queue-list">
          {visible.map((resource, index) => (
            <article className="queue-item" key={resource.id}>
              <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>
              <button className="queue-art" onClick={() => onOpen(resource)}>
                <ResourceArt kind={resource.kind} />
              </button>
              <button className="queue-copy" onClick={() => onOpen(resource)}>
                <span>
                  {resource.source} / {resource.length}
                </span>
                <h2>{resource.title}</h2>
                <p>{resource.description}</p>
              </button>
              <div className="queue-actions">
                <button className="queue-open" onClick={() => onOpen(resource)}>
                  Start exploring <Icon name="arrow" size={15} />
                </button>
                <button onClick={() => remove(resource.id)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>
            <Icon name="check" />
          </span>
          <h2>Your queue is clear.</h2>
          <p>Anything you save for later will gather here.</p>
        </div>
      )}
    </div>
  );
}

const collectionData = [
  {
    name: "Frontend inspiration",
    count: 12,
    note: "Interfaces, motion and details worth borrowing.",
    tone: "rust",
  },
  {
    name: "Backend engineering",
    count: 28,
    note: "Systems thinking, APIs and resilient architecture.",
    tone: "ink",
  },
  {
    name: "Learning roadmaps",
    count: 9,
    note: "Long-form paths for the skills still in progress.",
    tone: "sage",
  },
  {
    name: "Weekend experiments",
    count: 6,
    note: "Small ideas that deserve a quiet afternoon.",
    tone: "sand",
  },
];

function CollectionsPage({ onOpen }: { onOpen: (resource: Resource) => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const create = () => {
    if (!name.trim()) return;
    setExtra((items) => [...items, name.trim()]);
    setName("");
    setCreating(false);
  };
  return (
    <div className="page stage-page">
      <PageHeader
        eyebrow="CURATED BY YOU"
        title="Collections"
        description={`${collectionData.length + extra.length} shelves for the ideas that belong together.`}
        action={
          <button className="library-add" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New collection
          </button>
        }
      />
      <div className="collection-grid">
        {collectionData.map((collection, index) => (
          <button
            className={`collection-large ${collection.tone}`}
            key={collection.name}
            onClick={() => onOpen(resources[index % resources.length])}
          >
            <div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{collection.count} resources</small>
            </div>
            <h2>{collection.name}</h2>
            <p>{collection.note}</p>
            <span className="collection-open">
              Open collection <Icon name="arrow" />
            </span>
          </button>
        ))}
        {extra.map((item, index) => (
          <button className="collection-large paper" key={item}>
            <div>
              <span>{String(index + 5).padStart(2, "0")}</span>
              <small>0 resources</small>
            </div>
            <h2>{item}</h2>
            <p>A new shelf, ready for its first discovery.</p>
            <span className="collection-open">
              Open collection <Icon name="arrow" />
            </span>
          </button>
        ))}
      </div>
      {creating && (
        <div className="mini-layer" role="dialog" aria-modal="true" aria-label="Create collection">
          <button
            className="capture-backdrop"
            onClick={() => setCreating(false)}
            aria-label="Close"
          />
          <form
            className="mini-modal"
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <span className="date-label">NEW SHELF</span>
            <h2>Name your collection</h2>
            <p>Give related discoveries a place to gather.</p>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Design engineering"
            />
            <div>
              <button type="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button className="primary" disabled={!name.trim()}>
                Create collection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ActivityPage() {
  const bars = [32, 48, 38, 70, 52, 86, 64, 94, 58, 76, 44, 68];
  return (
    <div className="page stage-page">
      <PageHeader
        eyebrow="MAY / 2025"
        title="Activity & insights"
        description="A gentle look at what you have been collecting and learning."
      />
      <section className="insight-hero">
        <div>
          <span className="date-label">THIS MONTH</span>
          <b>18</b>
          <p>resources explored</p>
          <small>5 more than April</small>
        </div>
        <div className="activity-chart">
          <div className="chart-head">
            <h2>Your rhythm</h2>
            <span>12 weeks</span>
          </div>
          <div className="bars">
            {bars.map((bar, index) => (
              <i key={index} style={{ height: `${bar}%` }}>
                <span>{bar}</span>
              </i>
            ))}
          </div>
          <div className="chart-axis">
            <span>MAR</span>
            <span>APR</span>
            <span>MAY</span>
          </div>
        </div>
      </section>
      <section className="insight-grid">
        <article>
          <span className="date-label">VAULT TOTAL</span>
          <b>248</b>
          <h3>Resources saved</h3>
          <p>Your library grew by 31 discoveries this month.</p>
        </article>
        <article>
          <span className="date-label">TOP INTEREST</span>
          <b>34%</b>
          <h3>Interface craft</h3>
          <p>Animation and CSS remain your most revisited topics.</p>
        </article>
        <article>
          <span className="date-label">RETURN RATE</span>
          <b>72%</b>
          <h3>Worth coming back to</h3>
          <p>Most completed resources were opened more than once.</p>
        </article>
      </section>
      <section className="activity-feed">
        <SectionHeading index="01" title="Recent activity" action="This month" />
        {[
          ["Completed", "A friendly introduction to container queries", "Today, 10:42"],
          ["Added a note", "Layout animations: the missing guide", "Yesterday"],
          ["Created collection", "Weekend experiments", "May 18"],
        ].map((item) => (
          <div key={item[1]}>
            <span>{item[0]}</span>
            <b>{item[1]}</b>
            <time>{item[2]}</time>
          </div>
        ))}
      </section>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      className={`toggle ${on ? "on" : ""}`}
      onClick={onChange}
      role="switch"
      aria-checked={on}
    >
      <i />
    </button>
  );
}

function SettingsPage({ theme, onTheme }: { theme: "light" | "dark"; onTheme: () => void }) {
  const [digest, setDigest] = useState(true);
  const [metadata, setMetadata] = useState(true);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="page stage-page settings-page">
      <PageHeader
        eyebrow="PERSONAL VAULT"
        title="Settings"
        description="Shape DevVault around the way you collect and return."
      />
      <div className="settings-layout">
        <nav>
          <a href="#profile">Profile</a>
          <a href="#appearance">Appearance</a>
          <a href="#capture">Capture</a>
          <a href="#notifications">Notifications</a>
          <a href="#data">Data</a>
        </nav>
        <div className="settings-content">
          <section id="profile">
            <span className="date-label">PROFILE</span>
            <h2>Your details</h2>
            <div className="profile-setting">
              <span>AL</span>
              <div>
                <b>Alex Lin</b>
                <small>alex@devvault.app</small>
              </div>
              <button>Edit profile</button>
            </div>
          </section>
          <section id="appearance">
            <span className="date-label">APPEARANCE</span>
            <h2>Reading atmosphere</h2>
            <div className="setting-row">
              <div>
                <b>Dark theme</b>
                <small>Use the ink-toned theme across your vault.</small>
              </div>
              <Toggle on={theme === "dark"} onChange={onTheme} />
            </div>
          </section>
          <section id="capture">
            <span className="date-label">CAPTURE</span>
            <h2>Saving defaults</h2>
            <div className="setting-row">
              <div>
                <b>Fetch metadata automatically</b>
                <small>Find titles, descriptions and artwork from pasted links.</small>
              </div>
              <Toggle on={metadata} onChange={() => setMetadata(!metadata)} />
            </div>
            <div className="setting-row">
              <div>
                <b>Default status</b>
                <small>New resources enter your exploration queue.</small>
              </div>
              <button className="select-button">
                To explore <Icon name="chevron" size={13} />
              </button>
            </div>
          </section>
          <section id="notifications">
            <span className="date-label">NOTIFICATIONS</span>
            <h2>Gentle reminders</h2>
            <div className="setting-row">
              <div>
                <b>Weekly rediscovery</b>
                <small>A Sunday digest of saved ideas worth another look.</small>
              </div>
              <Toggle on={digest} onChange={() => setDigest(!digest)} />
            </div>
          </section>
          <section id="data">
            <span className="date-label">DATA & PRIVACY</span>
            <h2>Your archive</h2>
            <div className="setting-row">
              <div>
                <b>Export your vault</b>
                <small>Download your resources, notes and collections as JSON.</small>
              </div>
              <button className="outline-button">Export data</button>
            </div>
            <div className="danger-row">
              <div>
                <b>Delete all data</b>
                <small>Permanently remove every resource and collection.</small>
              </div>
              {confirming ? (
                <div className="confirm-actions">
                  <button onClick={() => setConfirming(false)}>Keep vault</button>
                  <button onClick={() => setConfirming(false)}>Confirm delete</button>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)}>Delete vault</button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ResourceDetail({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const [completed, setCompleted] = useState(resource.status === "Completed");
  return (
    <div className="detail-layer" role="dialog" aria-modal="true" aria-label="Resource detail">
      <button className="detail-backdrop" onClick={onClose} aria-label="Close detail" />
      <aside className="detail-panel">
        <header className="detail-head">
          <div>
            <span className="source-tile motion">{resource.source.slice(0, 2).toUpperCase()}</span>
            <span>
              {resource.source}
              <small>{resource.domain}</small>
            </span>
          </div>
          <div>
            <button aria-label="Bookmark">
              <Icon name="bookmark" />
            </button>
            <button aria-label="More">
              <Icon name="more" />
            </button>
            <button aria-label="Close" onClick={onClose}>
              <Icon name="x" />
            </button>
          </div>
        </header>
        <div className="detail-scroll">
          <ResourceArt kind={resource.kind} large />
          <div className="detail-content">
            <div className="detail-eyebrow">
              <span>{resource.category}</span>
              <span>{resource.length}</span>
            </div>
            <h1>{resource.title}</h1>
            <p className="detail-description">{resource.description}</p>
            <div className="detail-actions">
              <button
                className="open-source"
                onClick={() =>
                  window.open(
                    "https://motion.dev/docs/react-layout-animations",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Open original <Icon name="arrow" />
              </button>
              <button
                className={completed ? "completed" : ""}
                onClick={() => setCompleted(!completed)}
              >
                <Icon name="check" />
                {completed ? "Completed" : "Mark explored"}
              </button>
            </div>
            <section className="detail-section">
              <span>NOTES</span>
              <p>
                The examples are unusually clear. Return to the section on shared layout transitions
                when building the collection view.
              </p>
              <button>Edit note</button>
            </section>
            <section className="detail-section">
              <span>ORGANIZATION</span>
              <div className="detail-row">
                <span>Collection</span>
                <b>{resource.collection ?? "Not in a collection"}</b>
                <Icon name="chevron" />
              </div>
              <div className="detail-row">
                <span>Status</span>
                <b>{completed ? "Completed" : resource.status}</b>
                <Icon name="chevron" />
              </div>
              <div className="detail-row">
                <span>Tags</span>
                <b>{resource.category}, learning</b>
                <Icon name="chevron" />
              </div>
            </section>
            <section className="detail-meta">
              <div>
                <span>Saved</span>
                <b>{resource.saved}</b>
              </div>
              <div>
                <span>Last opened</span>
                <b>2 hours ago</b>
              </div>
              <div>
                <span>Source</span>
                <b>{resource.domain}</b>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}

function QuickCapture({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = useState("https://motion.dev/docs/react-layout-animations");
  const [state, setState] = useState<"ready" | "saving" | "saved">("ready");
  const save = () => {
    setState("saving");
    window.setTimeout(() => {
      setState("saved");
      window.setTimeout(onSaved, 900);
    }, 650);
  };
  return (
    <div className="capture-layer" role="dialog" aria-modal="true" aria-label="Quick capture">
      <button className="capture-backdrop" onClick={onClose} aria-label="Close quick capture" />
      <div className="capture-modal">
        <div className="sheet-handle" />
        <header className="capture-head">
          <div>
            <span>QUICK CAPTURE</span>
            <h2>{state === "saved" ? "Saved to your vault." : "Save a discovery"}</h2>
          </div>
          <button onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        {state === "saved" ? (
          <div className="capture-success">
            <span>
              <Icon name="check" size={25} />
            </span>
            <p>Layout animations: the missing guide</p>
            <small>Added to Animation · To explore</small>
          </div>
        ) : (
          <>
            <label className="url-field">
              <span>URL</span>
              <div>
                <Icon name="link" />
                <input value={url} onChange={(event) => setUrl(event.target.value)} autoFocus />
                <button onClick={() => setUrl("")}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            </label>
            <div className="metadata-label">
              <span>
                <i />
                METADATA FOUND
              </span>
              <small>Edited just now</small>
            </div>
            <div className="capture-preview">
              <ResourceArt kind="motion" />
              <div>
                <span>motion.dev</span>
                <h3>Layout animations: the missing guide</h3>
                <p>
                  A practical introduction to smooth, interruptible layout transitions in React.
                </p>
              </div>
            </div>
            <div className="capture-fields">
              <label>
                <span>Category</span>
                <button>
                  Animation <Icon name="chevron" size={14} />
                </button>
              </label>
              <label>
                <span>Status</span>
                <button>
                  To explore <Icon name="chevron" size={14} />
                </button>
              </label>
            </div>
            <label className="capture-note">
              <span>
                Note <i>Optional</i>
              </span>
              <textarea placeholder="Why is this worth returning to?" />
            </label>
            <footer className="capture-actions">
              <span>
                <kbd>⌘</kbd>
                <kbd>↵</kbd> to save
              </span>
              <div>
                <button className="cancel" onClick={onClose}>
                  Cancel
                </button>
                <button className="save" onClick={save} disabled={!url || state === "saving"}>
                  {state === "saving" ? "Saving..." : "Save resource"}
                  <Icon name={state === "saving" ? "clock" : "arrow"} />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function MobileNav({
  page,
  onPage,
  onCapture,
}: {
  page: Page;
  onPage: (page: Page) => void;
  onCapture: () => void;
}) {
  return (
    <nav className="mobile-nav">
      <button className={page === "home" ? "active" : ""} onClick={() => onPage("home")}>
        <Icon name="home" />
        <span>Home</span>
      </button>
      <button className={page === "library" ? "active" : ""} onClick={() => onPage("library")}>
        <Icon name="library" />
        <span>Library</span>
      </button>
      <button className="mobile-capture" onClick={onCapture}>
        <Icon name="plus" />
        <span>Save</span>
      </button>
      <button className={page === "explore" ? "active" : ""} onClick={() => onPage("explore")}>
        <Icon name="explore" />
        <span>Explore</span>
      </button>
      <button
        className={page === "collections" ? "active" : ""}
        onClick={() => onPage("collections")}
      >
        <Icon name="collection" />
        <span>Collections</span>
      </button>
    </nav>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selected, setSelected] = useState<Resource | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(false);

  const goPage = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveComplete = () => {
    setCaptureOpen(false);
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar page={page} onPage={goPage} onCapture={() => setCaptureOpen(true)} />
      <div className="app-column">
        <Topbar
          theme={theme}
          onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
          onSettings={() => goPage("settings")}
          onActivity={() => goPage("activity")}
          onSearch={() => {
            goPage("library");
            window.setTimeout(
              () => document.querySelector<HTMLInputElement>(".library-search input")?.focus(),
              50,
            );
          }}
        />
        <main>
          {page === "home" ? (
            <HomePage
              onCapture={() => setCaptureOpen(true)}
              onOpen={setSelected}
              onLibrary={() => goPage("library")}
              onPage={goPage}
            />
          ) : page === "library" ? (
            <LibraryPage
              onOpen={setSelected}
              onCapture={() => setCaptureOpen(true)}
              query={query}
              setQuery={setQuery}
            />
          ) : page === "explore" ? (
            <ExplorePage onOpen={setSelected} />
          ) : page === "collections" ? (
            <CollectionsPage onOpen={setSelected} />
          ) : page === "activity" ? (
            <ActivityPage />
          ) : (
            <SettingsPage
              theme={theme}
              onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
            />
          )}
        </main>
      </div>
      <MobileNav page={page} onPage={goPage} onCapture={() => setCaptureOpen(true)} />
      {selected && <ResourceDetail resource={selected} onClose={() => setSelected(null)} />}
      {captureOpen && <QuickCapture onClose={() => setCaptureOpen(false)} onSaved={saveComplete} />}
      {toast && (
        <div className="save-toast">
          <span>
            <Icon name="check" />
          </span>
          <div>
            <b>Saved to your vault</b>
            <small>Ready whenever you are.</small>
          </div>
          <button
            onClick={() => {
              setToast(false);
              goPage("library");
            }}
          >
            View
          </button>
        </div>
      )}
      <div className="stage-marker">
        <span>STAGE D</span>
        <b>Complete experience</b>
      </div>
    </div>
  );
}
