import { useState, type ReactNode } from "react";
import {
  Alert, AppShell, Badge, Button, Detail, Dialog, EmptyState, Field, Form, Heading, Screen, Section, Stack, Stat,
  StatGroup, Table, Text, ValidationSummary, defineApp, useCollection, useDisplayState, useNav, useRole, useValue,
} from "@wso2/prototype-kit";

interface MenuItem { id: string; name: string; description: string }
interface Order { id: string; person: string; itemIds: string[] }

const menuItems: MenuItem[] = [
  { id: "item-1", name: "Chicken katsu curry", description: "Crumbed chicken, rice and mild curry sauce" },
  { id: "item-2", name: "Veggie pad thai", description: "Rice noodles, tofu, peanuts and lime" },
  { id: "item-3", name: "Greek salad", description: "Tomato, cucumber, olives and feta" },
  { id: "item-4", name: "Fruit cup", description: "Seasonal fruit" },
];

const orders: Order[] = [
  { id: "order-1", person: "Asha Perera", itemIds: ["item-1", "item-4"] },
  { id: "order-2", person: "Ravi Silva", itemIds: ["item-2"] },
  { id: "order-3", person: "Maya Fernando", itemIds: ["item-3", "item-4"] },
];

const staffUser = { name: "Asha Perera", email: "asha@acme.example" };
const managerUser = { name: "Olivia Grant", email: "olivia@acme.example" };

function viewStatus(state: string, stored: string): string {
  if (state === "state.empty") return "draft";
  if (state === "state.closed") return "closed";
  return stored;
}

function Shell({ children }: { children: ReactNode }) {
  const role = useRole();
  const isStaff = role === "Staff";
  return (
    <AppShell
      id="shell"
      user={isStaff ? staffUser : managerUser}
      nav={
        isStaff
          ? [{ id: "nav.today", label: "Today's lunch", to: "screen.today" }]
          : [
              { id: "nav.today", label: "Today's menu", to: "screen.today" },
              { id: "nav.orders", label: "Order list", to: "screen.orders" },
            ]
      }
      account="screen.account"
      settings="screen.settings"
      signOut="screen.signed-out"
    >
      {children}
    </AppShell>
  );
}

function StaffToday() {
  const state = useDisplayState();
  const items = useCollection<MenuItem>("menuItems");
  const orderList = useCollection<Order>("orders");
  const [stored] = useValue<string>("menuStatus");
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const status = viewStatus(state, stored);
  const closed = status === "closed";
  const mine = orderList.items.find((o) => o.person === staffUser.name);
  const nameOf = (id: string) => items.get(id)?.name ?? id;

  if (status === "draft") {
    return (
      <Shell>
        <Heading id="heading.today" text="Today's lunch" />
        <EmptyState id="empty.no-menu" title="No menu yet" text="The office manager has not published today's menu. Check back soon." />
      </Shell>
    );
  }

  return (
    <Shell>
      <Heading id="heading.today" text="Today's lunch" />
      <Alert
        id="alert.status"
        tone={closed ? "warning" : "success"}
        title={closed ? "Ordering is closed" : "Ordering is open"}
        text={closed ? "Orders can no longer be placed, changed or cancelled." : "You can place, change or cancel your order until the office manager closes ordering."}
      />
      <Section id="section.my-order" title="Your order" subtitle="One order per person per day.">
        {mine ? (
          <Detail id="detail.my-order" fields={[{ label: "Items", value: mine.itemIds.map(nameOf).join(", ") }]} />
        ) : (
          <Text id="text.no-order" text={closed ? "You did not place an order today." : "You have not ordered yet."} />
        )}
      </Section>
      {closed ? (
        <Section id="section.menu" title="Today's menu" count={items.items.length}>
          <Table
            id="table.menu"
            columns={["Item", "Description"]}
            rows={items.items.map((i) => ({ id: `menu.${i.id}`, cells: [i.name, i.description] }))}
          />
        </Section>
      ) : (
        <Section id="section.choose" title="Choose your items" count={items.items.length} subtitle="Pick one or more items from today's menu.">
          {(problem !== undefined || state === "state.validation-error") && (
            <ValidationSummary id="summary.order" issues={[problem ?? "Choose at least one item"]} />
          )}
          <Form
            id="form.order"
            onSubmit={(values) => {
              const chosen = items.items.filter((i) => values[i.id] === "on").map((i) => i.id);
              if (chosen.length === 0) {
                setProblem("Choose at least one item");
                return;
              }
              setProblem(undefined);
              if (mine) {
                orderList.update(mine.id, { itemIds: chosen });
              } else {
                orderList.create({ person: staffUser.name, itemIds: chosen });
              }
            }}
            actions={
              <Stack direction="row">
                <Button id="btn.place-order" label={mine ? "Update my order" : "Place my order"} emphasis="primary" submit />
                {mine && (
                  <Button id="btn.cancel-order" label="Cancel my order" emphasis="danger" onPress={() => orderList.remove(mine.id)} />
                )}
              </Stack>
            }
          >
            {items.items.map((i) => (
              <Field
                key={i.id}
                id={`field.item.${i.id}`}
                name={i.id}
                label={`${i.name} - ${i.description}`}
                type="switch"
                defaultValue={mine && mine.itemIds.includes(i.id) ? "on" : "off"}
              />
            ))}
          </Form>
        </Section>
      )}
    </Shell>
  );
}

function ManagerToday() {
  const state = useDisplayState();
  const items = useCollection<MenuItem>("menuItems");
  const [stored, setStored] = useValue<string>("menuStatus");
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const status = viewStatus(state, stored);
  const closed = status === "closed";
  const shown = state === "state.empty" ? [] : items.items;
  const publish = () => {
    if (shown.length === 0) {
      setProblem("Add at least one item before publishing");
      return;
    }
    setProblem(undefined);
    setStored("open");
  };
  const statusLabel = status === "draft" ? "Not published" : status === "open" ? "Ordering open" : "Ordering closed";
  const statusTone = status === "draft" ? "default" : status === "open" ? "success" : "warning";
  return (
    <Shell>
      <Heading
        id="heading.menu"
        text="Today's menu"
        actions={
          <Stack direction="row">
            {status === "draft" && <Button id="btn.publish" label="Publish menu" emphasis="primary" onPress={publish} />}
            {status === "open" && <Button id="btn.close-ordering" label="Close ordering" emphasis="danger" onPress={() => setConfirming(true)} />}
            <Button id="btn.order-list" label="See order list" to="screen.orders" />
          </Stack>
        }
      />
      <Badge id="badge.status" label={statusLabel} tone={statusTone} />
      {closed && (
        <Alert id="alert.closed" tone="warning" title="Ordering is closed" text="Closing is final for the day. The menu can no longer be edited." />
      )}
      {(problem !== undefined || state === "state.validation-error") && (
        <ValidationSummary id="summary.menu" issues={[problem ?? "Add at least one item before publishing"]} />
      )}
      <Section id="section.items" title="Menu items" count={shown.length} subtitle="Each item has a name and a description.">
        <Table
          id="table.items"
          columns={["Item", "Description"]}
          rows={shown.map((i) => ({
            id: `menu.${i.id}`,
            cells: [i.name, i.description],
            ...(closed
              ? {}
              : { actions: [{ id: `menu.${i.id}.remove`, label: "Remove", emphasis: "danger" as const, onPress: () => items.remove(i.id) }] }),
          }))}
          empty={<EmptyState id="empty.items" title="No items yet" text="Add the first item below, then publish the menu." />}
        />
      </Section>
      {!closed && (
        <Section id="section.add" title="Add an item">
          <Form
            id="form.add-item"
            onSubmit={(values) => {
              items.create({ name: values["name"] ?? "", description: values["description"] ?? "" });
            }}
            actions={<Button id="btn.add-item" label="Add item" submit />}
          >
            <Field id="field.item-name" name="name" label="Name" required />
            <Field id="field.item-description" name="description" label="Description" type="textarea" />
          </Form>
        </Section>
      )}
      <Dialog
        id="dialog.close"
        title="Close ordering for today?"
        open={confirming}
        onClose={() => setConfirming(false)}
        actions={
          <Stack direction="row">
            <Button
              id="btn.close-confirm"
              label="Close ordering"
              emphasis="danger"
              onPress={() => {
                setStored("closed");
                setConfirming(false);
              }}
            />
            <Button id="btn.close-cancel" label="Keep open" onPress={() => setConfirming(false)} />
          </Stack>
        }
      >
        <Text id="text.close-warning" text="Closing is final for the day: ordering cannot be reopened and nobody can change an order." />
      </Dialog>
    </Shell>
  );
}

function Today() {
  const role = useRole();
  return role === "Staff" ? <StaffToday /> : <ManagerToday />;
}

function Orders() {
  const state = useDisplayState();
  const orderList = useCollection<Order>("orders");
  const items = useCollection<MenuItem>("menuItems");
  const [stored] = useValue<string>("menuStatus");
  const closed = viewStatus(state, stored) === "closed";
  const list = state === "state.empty" ? [] : orderList.items;
  const namesOf = (o: Order) => o.itemIds.map((id) => items.get(id)?.name ?? id).join(", ");
  return (
    <Shell>
      <Heading id="heading.orders" text="Order list" actions={<Button id="btn.back-menu" label="Back to menu" to="screen.today" />} />
      <StatGroup>
        <Stat id="stat.ordered" label="Ordered" value={String(list.length)} hint="people have ordered" icon="Users" />
        <Stat
          id="stat.ordering"
          label="Ordering"
          value={closed ? "Closed" : "Open"}
          hint={closed ? "final for the day" : "staff can still change orders"}
          icon="Clock"
          tone={closed ? "warning" : "success"}
        />
      </StatGroup>
      <Section id="section.orders" title="Today's orders" count={list.length} subtitle="One line per person, with the items they ordered.">
        <Table
          id="table.orders"
          columns={["Person", "Items"]}
          rows={list.map((o) => ({ id: `order.${o.id}`, cells: [o.person, namesOf(o)] }))}
          empty={<EmptyState id="empty.orders" title="Nobody has ordered yet" text="Orders appear here as staff place them." />}
        />
      </Section>
    </Shell>
  );
}

function Account() {
  const role = useRole();
  const user = role === "Staff" ? staffUser : managerUser;
  return (
    <Shell>
      <Heading id="heading.account" text="Account" />
      <Detail
        id="detail.account"
        fields={[
          { label: "Name", value: user.name },
          { label: "Email", value: user.email },
          { label: "Role", value: role },
        ]}
      />
    </Shell>
  );
}

function Settings() {
  const navigate = useNav();
  return (
    <Shell>
      <Heading id="heading.settings" text="Settings" />
      <Form
        id="form.settings"
        onSubmit={() => navigate.go("screen.today")}
        actions={<Button id="btn.save-settings" label="Save settings" emphasis="primary" submit />}
      >
        <Field id="field.show-descriptions" label="Show item descriptions" type="switch" defaultValue="on" />
      </Form>
    </Shell>
  );
}

function SignedOut() {
  return (
    <Screen>
      <Heading id="heading.signed-out" text="You are signed out" />
      <Button id="btn.sign-in" label="Sign in" emphasis="primary" to="screen.today" />
    </Screen>
  );
}

export default defineApp({
  screens: {
    "screen.today": Today,
    "screen.orders": Orders,
    "screen.account": Account,
    "screen.settings": Settings,
    "screen.signed-out": SignedOut,
  },
  data: { menuItems, orders, menuStatus: "open" },
});
