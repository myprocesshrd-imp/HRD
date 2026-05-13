import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Send everyone to dashboard; the dashboard route guards itself.
    throw redirect({ to: "/dashboard" });
  },
});
