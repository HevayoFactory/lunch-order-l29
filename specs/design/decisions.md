# Technical decisions

- \[architecture\] One service and one web app serve both roles; the database belongs to the service. *assumed* (all)
- \[data-model\] "Today" is the service's current date in the office's time zone; each day has its own menu. *assumed* (all)
- \[data-model\] An order stores the signer's id and display name, so no user table is kept. *assumed* (F2, F4)
- \[security\] Staff read their own order through /me/orders/today; the office manager reads every order through /orders/today. *assumed* (F2, F4)
- \[lunch-api\] Orders are listed 50 per page, ordered by when they were placed. *assumed* (F4)
- \[lunch-api\] Closing is a one-way status change; every edit of the menu or an order after it answers 409. *assumed* (F1, F2, F3)