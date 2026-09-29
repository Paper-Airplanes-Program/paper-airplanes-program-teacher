import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";

import type { NavItem } from "@/components/portal/app-shell";
import { PendingLessonsBadge } from "@/components/portal/nav-badge";

export const teacherNav: NavItem[] = [
  { href: "/overview", labelKey: "nav.overview", icon: LayoutDashboard },
  {
    href: "/lessons",
    labelKey: "nav.lessons",
    icon: BookOpen,
    badge: PendingLessonsBadge,
  },
  { href: "/grading", labelKey: "nav.grading", icon: ClipboardCheck },
  { href: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
  { href: "/incidents", labelKey: "nav.incidents", icon: AlertTriangle },
];
