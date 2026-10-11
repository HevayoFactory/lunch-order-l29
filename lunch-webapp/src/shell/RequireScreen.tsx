import type { ReactElement } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthz } from "../authz/gates";
import { mayOpen, type ScreenRoute } from "../authz/screens";

/**
 * Route guard for a screen, gated on the operation it loads. Like
 * RequireOperation, but a screen shared by two roles opens on either role's
 * own load operation (`alsoLoads`).
 */
export function RequireScreen({ screen }: { screen: ScreenRoute }): ReactElement {
  const { scopes, signedIn } = useAuthz();
  if (mayOpen(screen, scopes, signedIn)) return <Outlet />;
  return <Navigate to="/forbidden" replace state={{ op: screen.loads ?? undefined, screen: screen.label }} />;
}
