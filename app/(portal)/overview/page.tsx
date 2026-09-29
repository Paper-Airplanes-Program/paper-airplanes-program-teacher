import type { Metadata } from "next";

import { OverviewView } from "./view";

export const metadata: Metadata = {
  title: "Overview",
  description:
    "Your week of lessons, students at risk, grading queue and attendance to log.",
};

export default function OverviewPage() {
  return <OverviewView />;
}
