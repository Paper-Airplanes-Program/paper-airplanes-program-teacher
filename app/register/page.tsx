import type { Metadata } from "next";

import { RegisterView } from "./register-view";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Open a Paper Airplanes teacher account to reach your lessons, grading and check-ins.",
};

export default function RegisterPage() {
  return <RegisterView />;
}
