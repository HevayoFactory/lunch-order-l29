# Place an order

## Purpose

Staff order lunch from today's menu, and change or cancel it until ordering closes.

Needs: F1.

## User Stories

- F2.1 As staff, I place my order for today by choosing one or more items from the published menu.
- F2.2 As staff, I change the items in my order while ordering is open.
- F2.3 As staff, I cancel my order while ordering is open.
- F2.4 As staff, I see my current order for today.
- F2.5 As staff, I see my final order read-only once ordering is closed, and I cannot change or cancel it.
- F2.6 As staff, I cannot place an order once ordering is closed.
- F2.7 As staff, I cannot order before the menu is published.

## Decisions

- Each person has at most one order per day.
- Each menu item can be chosen once; there are no quantities.
- An order has no notes or special requests.
- An order has at least one item; to have none, the person cancels it.
- Only staff place orders; the office manager does not order lunch in the app, and the two roles stay separate.

## Out of Scope

- Quantities per item.
- Notes or special requests on an order.

## Open Questions

