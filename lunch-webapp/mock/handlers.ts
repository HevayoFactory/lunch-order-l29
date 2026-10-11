import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/lunch-api";

type Menu = components["schemas"]["Menu"];
type MenuItem = components["schemas"]["MenuItem"];
type MenuItemInput = components["schemas"]["MenuItemInput"];

// The state lives in this module, so it lives in the PAGE: any full page load
// (reload, typed URL) re-runs it and puts the seed back. Only in-app navigation
// carries a change forward. That is what makes a verification run repeatable.
//
// Which operations a caller may call is mock/authz/gateway.ts's answer, read from
// the contract. Nothing here checks a scope; a handler owes only its path's reach.

// The staff member this mock speaks for. /me/ resolves rows through it, never
// through a query parameter. Seed orders by other people so /me/ and the
// every-row list differ.
export const mockCaller = { id: "mock-staff", staffName: "Asha Perera" };

let nextItem = 5;
let nextOrder = 4;

let menu: Menu = {
  date: new Date().toISOString().slice(0, 10),
  status: "open",
  items: [
    { id: "item-1", name: "Chicken katsu curry", description: "Crumbed chicken, rice and mild curry sauce" },
    { id: "item-2", name: "Veggie pad thai", description: "Rice noodles, tofu, peanuts and lime" },
    { id: "item-3", name: "Greek salad", description: "Tomato, cucumber, olives and feta" },
    { id: "item-4", name: "Fruit cup", description: "Seasonal fruit" },
  ],
};

interface StoredOrder {
  id: string;
  ownerId: string;
  staffName: string;
  itemIds: string[];
}

let orders: StoredOrder[] = [
  { id: "order-1", ownerId: mockCaller.id, staffName: mockCaller.staffName, itemIds: ["item-1", "item-4"] },
  { id: "order-2", ownerId: "mock-other-1", staffName: "Ravi Silva", itemIds: ["item-2"] },
  { id: "order-3", ownerId: "mock-other-2", staffName: "Maya Fernando", itemIds: ["item-3", "item-4"] },
];

const error = (status: number, message: string, description?: string) =>
  HttpResponse.json({ code: status, message, ...(description ? { description } : {}) }, { status });

const itemsOf = (ids: string[]): MenuItem[] =>
  ids.flatMap((id) => menu.items.filter((i) => i.id === id));

const view = (o: StoredOrder) => ({ id: o.id, staffName: o.staffName, items: itemsOf(o.itemIds) });

export const handlers = [
  http.get("/api/published-menus/today", () =>
    menu.status === "draft" ? error(404, "Not found", "No menu has been published today.") : HttpResponse.json(menu),
  ),

  http.get("/api/menus/today", () => HttpResponse.json(menu)),

  http.put("/api/menus/today", async ({ request }) => {
    if (menu.status === "closed") return error(409, "Conflict", "Ordering is closed; the menu can no longer be edited.");
    const input = (await request.json()) as { items?: MenuItemInput[] };
    if (!Array.isArray(input?.items) || input.items.some((i) => !i.name || i.name.trim() === "")) {
      return error(400, "Bad request", "Every item needs a name.");
    }
    const items: MenuItem[] = input.items.map((i) => ({
      id: i.id && menu.items.some((m) => m.id === i.id) ? i.id : `item-${nextItem++}`,
      name: i.name.trim(),
      description: i.description ?? "",
    }));
    menu = { ...menu, items };
    // A removed item leaves the orders that named it.
    const kept = new Set(items.map((i) => i.id));
    orders = orders
      .map((o) => ({ ...o, itemIds: o.itemIds.filter((id) => kept.has(id)) }))
      .filter((o) => o.itemIds.length > 0);
    return HttpResponse.json(menu);
  }),

  http.post("/api/menus/today/publish", () => {
    if (menu.status !== "draft") return error(409, "Conflict", "Only a draft menu can be published.");
    if (menu.items.length === 0) return error(409, "Conflict", "Add at least one item before publishing.");
    menu = { ...menu, status: "open" };
    return HttpResponse.json(menu);
  }),

  http.post("/api/menus/today/close", () => {
    if (menu.status !== "open") return error(409, "Conflict", "Only an open menu can be closed.");
    menu = { ...menu, status: "closed" };
    return HttpResponse.json(menu);
  }),

  // The caller's own order. The path says so: /me/.
  http.get("/api/me/orders/today", () => {
    const mine = orders.find((o) => o.ownerId === mockCaller.id);
    return mine ? HttpResponse.json(view(mine)) : error(404, "Not found", "You have not ordered today.");
  }),

  http.put("/api/me/orders/today", async ({ request }) => {
    if (menu.status !== "open") return error(409, "Conflict", "Ordering is not open.");
    const input = (await request.json()) as { menuItemIds?: string[] };
    const ids = input?.menuItemIds;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => !menu.items.some((i) => i.id === id))) {
      return error(400, "Bad request", "Choose at least one item from today's menu.");
    }
    const existing = orders.find((o) => o.ownerId === mockCaller.id);
    if (existing) {
      existing.itemIds = ids;
      return HttpResponse.json(view(existing));
    }
    const created: StoredOrder = { id: `order-${nextOrder++}`, ownerId: mockCaller.id, staffName: mockCaller.staffName, itemIds: ids };
    orders = [...orders, created];
    return HttpResponse.json(view(created));
  }),

  http.delete("/api/me/orders/today", () => {
    if (menu.status !== "open") return error(409, "Conflict", "Ordering is not open.");
    const had = orders.some((o) => o.ownerId === mockCaller.id);
    if (!had) return error(404, "Not found", "You have not ordered today.");
    orders = orders.filter((o) => o.ownerId !== mockCaller.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // Every person's order: a different operation, so no row filter.
  http.get("/api/orders/today", ({ request }) => {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const sorted = [...orders].sort((a, b) => view(a).staffName.localeCompare(view(b).staffName));
    const data = sorted.slice(offset, offset + limit).map(view);
    const link = (o: number) => `/orders/today?limit=${limit}&offset=${o}`;
    return HttpResponse.json({
      count: orders.length,
      menuStatus: menu.status,
      next: offset + limit < orders.length ? link(offset + limit) : null,
      previous: offset > 0 ? link(Math.max(0, offset - limit)) : null,
      data,
    });
  }),
];
