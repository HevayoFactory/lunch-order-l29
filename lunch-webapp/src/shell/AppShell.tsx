import { useEffect, useState, type ReactElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { CalendarDays, ClipboardList, Settings, User as UserIcon, LogOut } from "@wso2/oxygen-ui-icons-react";
import { Can, useHeldRoles } from "../authz/gates";
import { currentUser, signOut } from "../authz/session";
import { APP_NAME } from "../appName";

interface Who {
  name: string;
  email: string;
}

function activeItem(pathname: string): string {
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/settings")) return "settings";
  return "today";
}

/** The app chrome: brand and account in the header, the one gated rail in the sidebar. */
export function AppShell(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [who, setWho] = useState<Who>({ name: "", email: "" });
  const roles = useHeldRoles();

  useEffect(() => {
    void currentUser().then((user) => {
      const profile = (user?.profile ?? {}) as Record<string, unknown>;
      const text = (key: string): string => (typeof profile[key] === "string" ? (profile[key] as string) : "");
      setWho({ name: text("name") || text("email") || text("sub"), email: text("email") });
    });
  }, []);

  const todayItem = (label: string): ReactElement => (
    <Sidebar.Item id="today" link={<Link to="/today" />}>
      <Sidebar.ItemIcon>
        <CalendarDays />
      </Sidebar.ItemIcon>
      <Sidebar.ItemLabel>{label}</Sidebar.ItemLabel>
    </Sidebar.Item>
  );

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={who.name || "Account"} />
              <UserMenu.Header name={who.name} email={who.email} role={roles.join(", ") || undefined} />
              <UserMenu.Item icon={<UserIcon />} label="Account" onClick={() => navigate("/account")} />
              <UserMenu.Item icon={<Settings />} label="Settings" onClick={() => navigate("/settings")} />
              <UserMenu.Divider />
              <UserMenu.Logout icon={<LogOut />} label="Sign out" onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={activeItem(pathname)}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {/* One rail for every role; each entry shows only to a caller who may call what it loads. */}
              <Can op="GET /menus/today" fallback={<Can op="GET /published-menus/today">{todayItem("Today's lunch")}</Can>}>
                {todayItem("Today's menu")}
              </Can>
              <Can op="GET /orders/today">
                <Sidebar.Item id="orders" link={<Link to="/orders" />}>
                  <Sidebar.ItemIcon>
                    <ClipboardList />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Order list</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
