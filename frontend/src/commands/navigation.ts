/**
 * Static navigation commands for the command palette.
 *
 * Each phase should add its own commands here (or register them dynamically
 * via the useCommands() hook once that's built in Phase 12+).
 */

export interface Command {
  id: string;
  label: string;
  /** Extra keywords for fuzzy matching — not displayed */
  keywords?: string;
  category: "navigate" | "action" | "settings";
  /** Path to navigate to (for navigate commands) */
  path?: string;
}

export const NAV_COMMANDS: Command[] = [
  { id: "go-home", label: "Home", keywords: "home main dashboard start", category: "navigate", path: "/" },
  {
    id: "go-habits",
    label: "Habits & Goals",
    keywords: "habits goals tracking daily",
    category: "navigate",
    path: "/habits",
  },
  {
    id: "go-habits-manage",
    label: "Habits — Manage",
    keywords: "habits manage admin create new habit edit archive activate period",
    category: "navigate",
    path: "/habits?tab=manage",
  },
  {
    id: "go-habits-backfill",
    label: "Habits — Backfill",
    keywords: "habits backfill past history calendar log previous missed",
    category: "navigate",
    path: "/habits?tab=backfill",
  },
  {
    id: "go-habits-goals",
    label: "Goals",
    keywords: "goals yearly annual binary milestone progress target",
    category: "navigate",
    path: "/habits?tab=goals",
  },
  {
    id: "go-habits-charts",
    label: "Habits — Charts",
    keywords: "habits charts streak heatmap visualization stats graph",
    category: "navigate",
    path: "/habits?tab=charts",
  },
  {
    id: "go-vocal",
    label: "Vocal Lessons",
    keywords: "vocal singing music lessons practice",
    category: "navigate",
    path: "/vocal",
  },
  {
    id: "go-climbing",
    label: "Climbing",
    keywords: "climbing bouldering rock",
    category: "navigate",
    path: "/climbing",
  },
  {
    id: "go-entertainment",
    label: "Entertainment",
    keywords: "movies tv shows books games watch read musicals",
    category: "navigate",
    path: "/entertainment",
  },
  {
    id: "go-net-worth",
    label: "Net Worth",
    keywords: "finance money net worth investments savings",
    category: "navigate",
    path: "/net-worth",
  },
  {
    id: "go-wheel",
    label: "Wheel Strategy",
    keywords: "wheel options strategy stocks trading",
    category: "navigate",
    path: "/wheel",
  },
  {
    id: "go-health",
    label: "Health & Oura",
    keywords: "health sleep oura ring biometrics hrv steps",
    category: "navigate",
    path: "/health",
  },
  {
    id: "go-modules",
    label: "Stateful Modules",
    keywords: "modules state machines stateful reference",
    category: "navigate",
    path: "/modules",
  },
  {
    id: "go-mood",
    label: "Mood & Energy",
    keywords: "mood energy feeling journal",
    category: "navigate",
    path: "/mood",
  },
  {
    id: "go-social",
    label: "Social & Calendar",
    keywords: "social calendar friends events people",
    category: "navigate",
    path: "/social",
  },
  {
    id: "go-spotify",
    label: "Spotify",
    keywords: "spotify music listening history artists",
    category: "navigate",
    path: "/spotify",
  },
  {
    id: "go-calendar",
    label: "Calendar",
    keywords: "calendar google events schedule",
    category: "navigate",
    path: "/calendar",
  },
  {
    id: "go-query",
    label: "NLP Query",
    keywords: "query nlp ask natural language search data",
    category: "navigate",
    path: "/query",
  },
  {
    id: "go-digest",
    label: "Digest & Wrapped",
    keywords: "digest wrapped weekly monthly summary report",
    category: "navigate",
    path: "/digest",
  },
  {
    id: "go-correlations",
    label: "Correlations",
    keywords: "correlations analysis trends patterns insights",
    category: "navigate",
    path: "/correlations",
  },
];
