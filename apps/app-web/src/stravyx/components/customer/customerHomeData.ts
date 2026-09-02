import React from "react";
import {
  Home, Briefcase, Bell, UserCircle2,
} from "lucide-react";

export { SERVICES } from "../../services";

export type Tab = "home" | "jobs" | "notifications" | "account";

export const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "jobs", label: "My Jobs", Icon: Briefcase },
  { id: "notifications", label: "Alerts", Icon: Bell },
  { id: "account", label: "Account", Icon: UserCircle2 },
];
