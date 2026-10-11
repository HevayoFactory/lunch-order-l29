# Publish daily menu

## Purpose

The office manager prepares and publishes today's menu so staff can order from it.

## User Stories

- F1.1 As an office manager, I create today's menu by typing in its items, each with a name and a description.
- F1.2 As an office manager, I publish today's menu so staff can see it and order from it.
- F1.3 As an office manager, I edit, add or remove items on the published menu until ordering is closed.
- F1.4 As staff, I see today's published menu with each item's name and description.
- F1.5 As staff, I see that no menu is available yet when today's menu has not been published.

## Decisions

- A menu item holds a name and a description only; no price.
- The menu is typed in fresh each day; there is no reusable item list.
- The published menu can be edited until ordering is closed.
- A menu needs at least one item before it can be published. *assumed*
- Removing an item from the published menu also removes it from any order that chose it; an order left with no items is cancelled. *assumed*

## Out of Scope

- Prices on menu items.
- A reusable library of menu items carried over between days.