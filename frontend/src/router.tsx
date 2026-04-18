import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarPage } from "@/pages/CalendarPage";
import { ClimbingPage } from "@/pages/ClimbingPage";
import { CorrelationsPage } from "@/pages/CorrelationsPage";
import { DigestPage } from "@/pages/DigestPage";
import { EntertainmentPage } from "@/pages/EntertainmentPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HealthPage } from "@/pages/HealthPage";
import { HomePage } from "@/pages/HomePage";
import { ModulesPage } from "@/pages/ModulesPage";
import { MoodPage } from "@/pages/MoodPage";
import { NetWorthPage } from "@/pages/NetWorthPage";
import { QueryPage } from "@/pages/QueryPage";
import { SocialPage } from "@/pages/SocialPage";
import { SpotifyPage } from "@/pages/SpotifyPage";
import { VocalPage } from "@/pages/VocalPage";
import { WheelPage } from "@/pages/WheelPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "habits", element: <HabitsPage /> },
      { path: "vocal", element: <VocalPage /> },
      { path: "climbing", element: <ClimbingPage /> },
      { path: "entertainment", element: <EntertainmentPage /> },
      { path: "net-worth", element: <NetWorthPage /> },
      { path: "wheel", element: <WheelPage /> },
      { path: "health", element: <HealthPage /> },
      { path: "modules", element: <ModulesPage /> },
      { path: "mood", element: <MoodPage /> },
      { path: "social", element: <SocialPage /> },
      { path: "spotify", element: <SpotifyPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "query", element: <QueryPage /> },
      { path: "digest", element: <DigestPage /> },
      { path: "correlations", element: <CorrelationsPage /> },
    ],
  },
]);
