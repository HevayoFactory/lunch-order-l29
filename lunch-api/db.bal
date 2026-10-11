import ballerina/lang.'int as langint;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

type MenuStatus "draft"|"open"|"closed";

// A business-rule refusal: 400, 404 or 409.
type Failure distinct error<record {|int status;|}>;

type MenuRow record {|
    string id;
    string date;
    string status;
|};

type OrderRow record {|
    string id;
    string staffName;
|};

function resolveTimeZone() returns string => officeTimeZone.trim() == "" ? "UTC" : officeTimeZone.trim();

function buildClient() returns postgresql:Client|error {
    string host = dbHost.trim() == "" ? "localhost" : dbHost.trim();
    int port = dbPort.trim() == "" ? 5432 : check langint:fromString(dbPort.trim());
    string name = dbName.trim() == "" ? "lunch" : dbName.trim();
    string user = dbUser.trim() == "" ? "postgres" : dbUser.trim();
    return new (host, user, dbPassword, name, port);
}

postgresql:Client? dbCache = ();

// Created on first use so that startup without migration (tests) needs no database.
function dbc() returns postgresql:Client|error {
    lock {
        postgresql:Client? cached = dbCache;
        if cached is postgresql:Client {
            return cached;
        }
        postgresql:Client created = check buildClient();
        dbCache = created;
        return created;
    }
}

final () dbReady = check initDb();

function initDb() returns error? {
    if !autoMigrate {
        return;
    }
    postgresql:Client db = check dbc();
    // Validates the zone name too: an unknown zone fails startup rather than every request.
    string _ = check db->queryRow(`SELECT to_char(timezone(${resolveTimeZone()}, now())::date, 'YYYY-MM-DD')`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS menus (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_date date NOT NULL UNIQUE,
        status text NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
        published_at timestamptz,
        closed_at timestamptz
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS menu_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text NOT NULL DEFAULT '',
        position int NOT NULL DEFAULT 0
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
        user_id text NOT NULL,
        staff_name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (menu_id, user_id)
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS order_items (
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        PRIMARY KEY (order_id, menu_item_id)
    )`);
    log:printInfo("schema ready");
}

function todayExpr() returns sql:ParameterizedQuery => `timezone(${resolveTimeZone()}, now())::date`;

function toStatus(string raw) returns MenuStatus {
    if raw == "open" {
        return "open";
    }
    if raw == "closed" {
        return "closed";
    }
    return "draft";
}

function refuse(int status, string message) returns Failure => error Failure(message, status = status);

function findMenu(boolean forUpdate) returns MenuRow|error? {
    postgresql:Client db = check dbc();
    sql:ParameterizedQuery q = `SELECT id::text AS id, to_char(menu_date, 'YYYY-MM-DD') AS date, status
        FROM menus WHERE menu_date = `;
    q = sql:queryConcat(q, todayExpr());
    if forUpdate {
        q = sql:queryConcat(q, ` FOR UPDATE`);
    }
    MenuRow|sql:Error row = db->queryRow(q);
    if row is sql:NoRowsError {
        return ();
    }
    return row;
}

function todayString() returns string|error {
    postgresql:Client db = check dbc();
    sql:ParameterizedQuery q = `SELECT to_char(`;
    q = sql:queryConcat(q, todayExpr(), `, 'YYYY-MM-DD')`);
    return db->queryRow(q);
}

function loadItems(string menuId) returns MenuItem[]|error {
    postgresql:Client db = check dbc();
    stream<MenuItem, sql:Error?> rows = db->query(`SELECT id::text AS id, name, description
        FROM menu_items WHERE menu_id = ${menuId}::uuid ORDER BY position, id`);
    return check from MenuItem item in rows
        select item;
}

function loadMenu(MenuRow row) returns Menu|error {
    MenuItem[] items = check loadItems(row.id);
    return {date: row.date, status: toStatus(row.status), items};
}

function loadOrderItems(string orderId) returns MenuItem[]|error {
    postgresql:Client db = check dbc();
    stream<MenuItem, sql:Error?> rows = db->query(`SELECT mi.id::text AS id, mi.name AS name, mi.description AS description
        FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = ${orderId}::uuid ORDER BY mi.position, mi.id`);
    return check from MenuItem item in rows
        select item;
}

function toOrder(OrderRow row) returns Order|error {
    MenuItem[] items = check loadOrderItems(row.id);
    return {id: row.id, staffName: row.staffName, items};
}

function getPublishedMenuDb() returns Menu|error {
    MenuRow? row = check findMenu(false);
    if row is () || toStatus(row.status) == "draft" {
        return refuse(404, "today's menu has not been published");
    }
    return loadMenu(row);
}

function getManagementMenuDb() returns Menu|error {
    MenuRow? row = check findMenu(false);
    if row is () {
        return {date: check todayString(), status: "draft", items: []};
    }
    return loadMenu(row);
}

function saveMenuItemsDb(MenuItemsInput input) returns Menu|error {
    transaction {
        Menu result = check saveMenuItemsTx(input);
        check commit;
        return result;
    } on fail error e {
        return e;
    }
}

function saveMenuItemsTx(MenuItemsInput input) returns Menu|error {
    postgresql:Client db = check dbc();
    sql:ParameterizedQuery ins = `INSERT INTO menus (menu_date, status) VALUES (`;
    ins = sql:queryConcat(ins, todayExpr(), `, 'draft') ON CONFLICT (menu_date) DO NOTHING`);
    _ = check db->execute(ins);
    MenuRow? locked = check findMenu(true);
    if locked is () {
        return error("menu row missing after insert");
    }
    MenuStatus status = toStatus(locked.status);
    if status == "closed" {
        return refuse(409, "ordering is closed; the menu can no longer be edited");
    }
    MenuItem[] existing = check loadItems(locked.id);
    string[] existingIds = from MenuItem m in existing
        select m.id;
    string[] keep = [];
    foreach MenuItemInput item in input.items {
        if item.name.trim() == "" {
            return refuse(400, "every menu item needs a name");
        }
        string? itemId = item?.id;
        if itemId is string {
            if existingIds.indexOf(itemId) is () {
                return refuse(400, "unknown menu item id " + itemId);
            }
            if keep.indexOf(itemId) !is () {
                return refuse(400, "menu item id repeated: " + itemId);
            }
            keep.push(itemId);
        }
    }
    if status == "open" && input.items.length() == 0 {
        return refuse(400, "a published menu needs at least one item");
    }
    foreach string existingId in existingIds {
        if keep.indexOf(existingId) is () {
            _ = check db->execute(`DELETE FROM menu_items WHERE id = ${existingId}::uuid`);
        }
    }
    int position = 0;
    foreach MenuItemInput item in input.items {
        string name = item.name.trim();
        string description = item?.description ?: "";
        string? itemId = item?.id;
        if itemId is string {
            _ = check db->execute(`UPDATE menu_items SET name = ${name}, description = ${description},
                position = ${position} WHERE id = ${itemId}::uuid`);
        } else {
            _ = check db->execute(`INSERT INTO menu_items (menu_id, name, description, position)
                VALUES (${locked.id}::uuid, ${name}, ${description}, ${position})`);
        }
        position += 1;
    }
    // An order whose items were all removed is cancelled.
    _ = check db->execute(`DELETE FROM orders o WHERE o.menu_id = ${locked.id}::uuid
        AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)`);
    return loadMenu(locked);
}

function publishMenuDb() returns Menu|error {
    transaction {
        Menu result = check publishTx();
        check commit;
        return result;
    } on fail error e {
        return e;
    }
}

function publishTx() returns Menu|error {
    postgresql:Client db = check dbc();
    MenuRow? locked = check findMenu(true);
    if locked is () {
        return refuse(409, "there is no menu to publish; add at least one item first");
    }
    if toStatus(locked.status) != "draft" {
        return refuse(409, "the menu is already published");
    }
    int count = check db->queryRow(`SELECT count(*) FROM menu_items WHERE menu_id = ${locked.id}::uuid`);
    if count < 1 {
        return refuse(409, "a menu needs at least one item before it can be published");
    }
    _ = check db->execute(`UPDATE menus SET status = 'open', published_at = now() WHERE id = ${locked.id}::uuid`);
    return loadMenu({id: locked.id, date: locked.date, status: "open"});
}

function closeOrderingDb() returns Menu|error {
    transaction {
        Menu result = check closeTx();
        check commit;
        return result;
    } on fail error e {
        return e;
    }
}

function closeTx() returns Menu|error {
    postgresql:Client db = check dbc();
    MenuRow? locked = check findMenu(true);
    if locked is () || toStatus(locked.status) != "open" {
        return refuse(409, "ordering can only be closed while it is open");
    }
    _ = check db->execute(`UPDATE menus SET status = 'closed', closed_at = now() WHERE id = ${locked.id}::uuid`);
    return loadMenu({id: locked.id, date: locked.date, status: "closed"});
}

function getMyOrderDb(string userId) returns Order|error {
    postgresql:Client db = check dbc();
    MenuRow? menu = check findMenu(false);
    if menu is () || toStatus(menu.status) == "draft" {
        return refuse(404, "no order: today's menu has not been published");
    }
    OrderRow|sql:Error row = db->queryRow(`SELECT id::text AS id, staff_name AS "staffName"
        FROM orders WHERE menu_id = ${menu.id}::uuid AND user_id = ${userId}`);
    if row is sql:NoRowsError {
        return refuse(404, "you have no order today");
    }
    if row is sql:Error {
        return row;
    }
    return toOrder(row);
}

function saveMyOrderDb(string userId, string staffName, string[] itemIds) returns Order|error {
    transaction {
        Order result = check saveOrderTx(userId, staffName, itemIds);
        check commit;
        return result;
    } on fail error e {
        return e;
    }
}

function requireOpenMenu(MenuRow? menu) returns MenuRow|Failure {
    if menu is () || toStatus(menu.status) == "draft" {
        return refuse(409, "today's menu has not been published yet");
    }
    if toStatus(menu.status) == "closed" {
        return refuse(409, "ordering is closed");
    }
    return menu;
}

function saveOrderTx(string userId, string staffName, string[] itemIds) returns Order|error {
    postgresql:Client db = check dbc();
    MenuRow|Failure menu = requireOpenMenu(check findMenu(true));
    if menu is Failure {
        return menu;
    }
    string[] chosen = [];
    foreach string itemId in itemIds {
        if chosen.indexOf(itemId) is () {
            chosen.push(itemId);
        }
    }
    if chosen.length() == 0 {
        return refuse(400, "an order needs at least one item; cancel the order instead");
    }
    MenuItem[] items = check loadItems(menu.id);
    string[] validIds = from MenuItem m in items
        select m.id;
    foreach string itemId in chosen {
        if validIds.indexOf(itemId) is () {
            return refuse(400, "item " + itemId + " is not on today's menu");
        }
    }
    string orderId = check db->queryRow(`INSERT INTO orders (menu_id, user_id, staff_name)
        VALUES (${menu.id}::uuid, ${userId}, ${staffName})
        ON CONFLICT (menu_id, user_id) DO UPDATE SET staff_name = EXCLUDED.staff_name, updated_at = now()
        RETURNING id::text`);
    _ = check db->execute(`DELETE FROM order_items WHERE order_id = ${orderId}::uuid`);
    foreach string itemId in chosen {
        _ = check db->execute(`INSERT INTO order_items (order_id, menu_item_id)
            VALUES (${orderId}::uuid, ${itemId}::uuid)`);
    }
    return toOrder({id: orderId, staffName});
}

function cancelMyOrderDb(string userId) returns error? {
    transaction {
        check cancelTx(userId);
        check commit;
        return;
    } on fail error e {
        return e;
    }
}

function cancelTx(string userId) returns error? {
    postgresql:Client db = check dbc();
    MenuRow|Failure menu = requireOpenMenu(check findMenu(true));
    if menu is Failure {
        return menu;
    }
    sql:ExecutionResult res = check db->execute(`DELETE FROM orders
        WHERE menu_id = ${menu.id}::uuid AND user_id = ${userId}`);
    if res.affectedRowCount == 0 {
        return refuse(404, "you have no order to cancel");
    }
    return;
}

function listOrdersDb(int 'limit, int offset) returns OrderPage|error {
    postgresql:Client db = check dbc();
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int firstRow = offset < 0 ? 0 : offset;
    MenuRow? menu = check findMenu(false);
    if menu is () {
        return {count: 0, menuStatus: "draft", data: []};
    }
    int count = check db->queryRow(`SELECT count(*) FROM orders WHERE menu_id = ${menu.id}::uuid`);
    stream<OrderRow, sql:Error?> rows = db->query(`SELECT id::text AS id, staff_name AS "staffName"
        FROM orders WHERE menu_id = ${menu.id}::uuid
        ORDER BY lower(staff_name), staff_name, id LIMIT ${pageSize} OFFSET ${firstRow}`);
    OrderRow[] page = check from OrderRow r in rows
        select r;
    Order[] data = [];
    foreach OrderRow r in page {
        data.push(check toOrder(r));
    }
    return {
        count,
        menuStatus: toStatus(menu.status),
        next: pageLink(pageSize, firstRow, count, true),
        previous: pageLink(pageSize, firstRow, count, false),
        data
    };
}

function pageLink(int pageSize, int firstRow, int count, boolean forward) returns string? {
    if forward {
        if firstRow + pageSize >= count {
            return ();
        }
        return string `/orders/today?limit=${pageSize}&offset=${firstRow + pageSize}`;
    }
    if firstRow <= 0 {
        return ();
    }
    int prev = firstRow - pageSize < 0 ? 0 : firstRow - pageSize;
    return string `/orders/today?limit=${pageSize}&offset=${prev}`;
}
