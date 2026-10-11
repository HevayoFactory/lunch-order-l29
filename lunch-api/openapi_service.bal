import ballerina/constraint;
import ballerina/http;
import ballerina/log;

listener http:Listener ep0 = new (9090);

type Refusal ErrorBadRequest|ErrorConflict|ErrorNotFound;

function refusal(Failure f) returns Refusal {
    int status = f.detail().status;
    Error body = {code: status, message: f.message()};
    if status == 400 {
        return <ErrorBadRequest>{body};
    }
    if status == 409 {
        return <ErrorConflict>{body};
    }
    return <ErrorNotFound>{body};
}

function serverError(string op, error err) returns http:InternalServerError {
    log:printError("request failed", op = op, 'error = err);
    return <http:InternalServerError>{body: {code: 500, message: "internal error"}};
}

function displayName(GatewayCaller caller) returns string {
    string name = caller.username.trim();
    return name == "" ? caller.userId : name;
}

service http:InterceptableService / on ep0 {
    public function createInterceptors() returns AssertionInterceptor => new;

    # Today's menu as staff see it, once published
    resource function get published\-menus/today() returns Menu|Refusal|http:InternalServerError {
        Menu|error r = getPublishedMenuDb();
        if r is Menu {
            return r;
        }
        if r is Failure {
            return refusal(r);
        }
        return serverError("getPublishedMenu", r);
    }

    # Today's menu in any status, for the office manager
    resource function get menus/today() returns Menu|http:InternalServerError {
        Menu|error r = getManagementMenuDb();
        if r is error {
            return serverError("getMenuForManagement", r);
        }
        return r;
    }

    # Set the items of today's menu (creates it as a draft if absent)
    resource function put menus/today(@http:Payload MenuItemsInput payload) returns Menu|Refusal|http:InternalServerError {
        Menu|error r = saveMenuItemsDb(payload);
        if r is Menu {
            return r;
        }
        if r is Failure {
            return refusal(r);
        }
        return serverError("saveMenuItems", r);
    }

    # Publish today's menu so staff can order
    resource function post menus/today/publish() returns Menu|Refusal|http:InternalServerError {
        Menu|error r = publishMenuDb();
        if r is Menu {
            return r;
        }
        if r is Failure {
            return refusal(r);
        }
        return serverError("publishMenu", r);
    }

    # Close ordering for today, for good
    resource function post menus/today/close() returns Menu|Refusal|http:InternalServerError {
        Menu|error r = closeOrderingDb();
        if r is Menu {
            return r;
        }
        if r is Failure {
            return refusal(r);
        }
        return serverError("closeOrdering", r);
    }

    # The caller's order for today
    resource function get me/orders/today(http:RequestContext ctx) returns Order|Refusal|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        Order|error r = getMyOrderDb(caller.userId);
        if r is Order {
            return r;
        }
        if r is Failure {
            return refusal(r);
        }
        return serverError("getMyOrder", r);
    }

    # Place or change the caller's order while ordering is open
    resource function put me/orders/today(http:RequestContext ctx, @http:Payload OrderInput payload)
            returns Order|Refusal|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        Order|error r = saveMyOrderDb(caller.userId, displayName(caller), payload.menuItemIds);
        if r is Order {
            return r;
        }
        if r is Failure {
            return refusal(r);
        }
        return serverError("saveMyOrder", r);
    }

    # Cancel the caller's order while ordering is open
    resource function delete me/orders/today(http:RequestContext ctx)
            returns http:NoContent|Refusal|http:Unauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        error? r = cancelMyOrderDb(caller.userId);
        if r is Failure {
            return refusal(r);
        }
        if r is error {
            return serverError("cancelMyOrder", r);
        }
        return http:NO_CONTENT;
    }

    # Every person's order for today, sorted by staff name A to Z
    resource function get orders/today(int 'limit = 20, int offset = 0) returns OrderPage|http:InternalServerError {
        OrderPage|error r = listOrdersDb('limit, offset);
        if r is error {
            return serverError("listOrders", r);
        }
        return r;
    }
}

public type MenuItemsInput record {
    MenuItemInput[] items;
};

public type Order record {
    string id;
    # display name of the person who ordered
    string staffName;
    MenuItem[] items;
};

public type OrderPage record {
    # total orders today
    int count;
    "draft"|"open"|"closed" menuStatus;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Order[] data;
};

public type ErrorConflict record {|
    *http:Conflict;
    Error body;
|};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type MenuItem record {
    string id;
    string name;
    string description;
};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type MenuOk record {|
    *http:Ok;
    Menu body;
|};

public type OrderInput record {
    @constraint:Array {minLength: 1}
    string[] menuItemIds;
};

public type MenuItemInput record {
    # existing item id to keep; omit for a new item
    string id?;
    string name;
    string description?;
};

public type Menu record {
    string date;
    "draft"|"open"|"closed" status;
    MenuItem[] items;
};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};
