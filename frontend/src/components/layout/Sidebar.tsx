import {
  Activity,
  BarChart2,
  BookOpen,
  Calendar,
  CheckSquare,
  Dumbbell,
  Film,
  Heart,
  Home,
  MessageSquare,
  Music,
  SmilePlus,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/habits", label: "Habits & Goals", icon: CheckSquare },
  { to: "/vocal", label: "Vocal Lessons", icon: BookOpen },
  { to: "/climbing", label: "Climbing", icon: Dumbbell },
  { to: "/entertainment", label: "Entertainment", icon: Film },
  { to: "/net-worth", label: "Net Worth", icon: Wallet },
  { to: "/wheel", label: "Wheel Strategy", icon: TrendingUp },
  { to: "/health", label: "Health & Oura", icon: Heart },
  { to: "/modules", label: "Stateful Modules", icon: Activity },
  { to: "/mood", label: "Mood & Energy", icon: SmilePlus },
  { to: "/social", label: "Social & Calendar", icon: Users },
  { to: "/spotify", label: "Spotify", icon: Music },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/query", label: "NLP Query", icon: MessageSquare },
  { to: "/digest", label: "Digest & Wrapped", icon: Sparkles },
  { to: "/correlations", label: "Correlations", icon: BarChart2 },
];

export function Sidebar() {
  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div
        className="flex h-14 items-center px-4 font-semibold tracking-tight"
        style={{ color: "var(--text-h)", borderBottom: "1px solid var(--border)" }}
      >
        Dana OS
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                isActive ? "font-medium" : "hover:opacity-80",
              )
            }
            style={({ isActive }) => ({
              color: isActive ? "var(--accent)" : "var(--text)",
              background: isActive ? "var(--accent-bg)" : "transparent",
            })}
          >
            <Icon size={15} strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
