import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutSite } from "@/components/site/Layout";

export const Route = createFileRoute("/_site")({
  component: () => (
    <LayoutSite>
      <Outlet />
    </LayoutSite>
  ),
});
