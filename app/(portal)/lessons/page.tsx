import type { Metadata } from "next";

import { LessonsView } from "./view";

export const metadata: Metadata = {
  title: "Lessons",
  description:
    "Every lesson you have taught, week by week — open one to see it and attach homework.",
};

export default function LessonsPage() {
  return <LessonsView />;
}
