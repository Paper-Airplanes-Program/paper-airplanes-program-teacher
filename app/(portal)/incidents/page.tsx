import type { Metadata } from "next";

import { IncidentsView } from "./view";

export const metadata: Metadata = {
  title: "Incident Reporting",
  description:
    "Confidentially report safeguarding, conduct, plagiarism or technical incidents.",
};

export default function IncidentsPage() {
  return <IncidentsView />;
}
