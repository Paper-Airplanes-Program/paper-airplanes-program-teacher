import type { Metadata } from "next";

import { GradingView } from "./view";

export const metadata: Metadata = {
  title: "Grading",
  description:
    "Grade student submissions against a rubric and leave written feedback.",
};

export default function GradingPage() {
  return <GradingView />;
}
