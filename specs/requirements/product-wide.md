# Product-wide

Rules that apply to more than one feature.

## Requirements

- P1 Users sign in via SSO through the platform identity provider, with two roles: staff and office manager. \[org default\] Applies to: all.
- P2 There is one menu and one ordering session per day; staff see only today's. Applies to: F1, F2, F3, F4. *assumed*

## Decisions

- One order per person per day, made of one or more menu items.
- Staff can change or cancel their order until ordering is closed.