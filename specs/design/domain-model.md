# Domain model

Each day has one menu of typed-in items. Staff place at most one order per day from it; the office manager closes ordering for good. People come from the sign-in provider, so orders keep the person's id and display name.

```mermaid
erDiagram
    MENU ||--o{ MENU_ITEM : "offers"
    MENU ||--o{ ORDER : "receives"
    ORDER ||--|{ ORDER_ITEM : "contains"
    MENU_ITEM ||--o{ ORDER_ITEM : "chosen in"

    MENU {
        uuid id PK
        date menuDate "one per day"
        string status "draft, open, closed"
        timestamp publishedAt
        timestamp closedAt
    }
    MENU_ITEM {
        uuid id PK
        uuid menuId FK
        string name
        string description
    }
    ORDER {
        uuid id PK
        uuid menuId FK
        string userId "sign-in subject, one order per user per menu"
        string userName
        timestamp updatedAt
    }
    ORDER_ITEM {
        uuid orderId FK
        uuid menuItemId FK
    }
```

A menu's status moves only draft, then open, then closed. An order always holds at least one item.