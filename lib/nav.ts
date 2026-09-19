import { BookOpen, CalendarCheck, ClipboardCheck } from "lucide-react";

import type { NavItem } from "@/components/portal/app-shell";
import { PendingLessonsBadge } from "@/components/portal/nav-badge";

export const teacherNav: NavItem[] = [
  {
    href: "/lessons",
    labelKey: "nav.lessons",
    icon: BookOpen,
    badge: PendingLessonsBadge,
  },
  { href: "/grading", labelKey: "nav.grading", icon: ClipboardCheck },
  { href: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
];
