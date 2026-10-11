# Team Lunch Order

## Problem Statement

Collecting a team's lunch orders by chat or paper is error-prone: orders get lost, changes arrive after the deadline, and the office manager has to compile the list by hand.

## Solution

A web app where the office manager publishes the day's menu and staff order from it until the manager closes ordering. The manager then sees the full order list.

## Actors

- Staff: sign in, see today's menu, and place, change or cancel their own order while ordering is open.
- Office manager: publishes the day's menu, closes ordering, and sees everyone's orders.

## Features

- F1 [Publish daily menu](features/F1-publish-daily-menu.md)
- F2 [Place an order](features/F2-place-an-order.md)
- F3 [Close ordering](features/F3-close-ordering.md)
- F4 [Order list](features/F4-order-list.md)

## Product-wide

See [Product-wide](product-wide.md).

## Out of Scope

- Payment and billing for lunches.
- Automatic cutoff times; ordering closes only when the office manager closes it.
- Ordering from a restaurant or supplier on the team's behalf.

