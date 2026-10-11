import type { ReactElement } from "react";
import { Can } from "../authz/gates";
import { StaffToday } from "./StaffToday";
import { ManagerToday } from "./ManagerToday";

/** One screen for both roles: the office manager's view where they may load the menu in any status. */
export function TodayPage(): ReactElement {
  return (
    <Can op="GET /menus/today" fallback={<StaffToday />}>
      <ManagerToday />
    </Can>
  );
}
