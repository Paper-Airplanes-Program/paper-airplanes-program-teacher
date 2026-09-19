import type { Metadata } from "next";

import { AttendanceView } from "./view";

export const metadata: Metadata = {
  title: "Weekly check-in",
  description:
    "Send your own weekly check-in for each student, whether the lesson happened or not.",
};

export default function AttendancePage() {
  return <AttendanceView />;
}
