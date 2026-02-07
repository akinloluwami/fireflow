import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/workflow/_layout")({
  component: () => <Outlet />,
});
