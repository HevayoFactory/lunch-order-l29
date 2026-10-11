import ballerina/http;
import ballerina/io;
import ballerina/jwt;
import ballerina/os;
import ballerina/test;

const string TEST_ISSUER = "aep-gateway-test";
const string TEST_HEADER = "x-jwt-assertion";

// A probe service guarded by the same interceptor as the real one.
service class Probe {
    *http:InterceptableService;

    public function createInterceptors() returns AssertionInterceptor => new;

    resource function get who(http:RequestContext ctx) returns string|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        return caller.userId;
    }

    resource function get open() returns string {
        return "public";
    }
}

http:Client? probeClient = ();

function mint(string keyFile, string subject) returns string|error {
    jwt:IssuerConfig config = {
        issuer: TEST_ISSUER,
        username: subject,
        expTime: 300,
        signatureConfig: {algorithm: jwt:RS256, config: {keyFile}}
    };
    return jwt:issue(config);
}

@test:BeforeSuite
function startProbe() returns error? {
    string cert = check io:fileReadString("tests/resources/gateway.crt");
    check os:setEnv("GATEWAY_ASSERTION_CERTIFICATE", cert);
    check os:setEnv("GATEWAY_ASSERTION_ISSUER", TEST_ISSUER);
    check os:setEnv("GATEWAY_ASSERTION_HEADER", TEST_HEADER);
    http:Listener probeListener = check new (9291);
    check probeListener.attach(new Probe(), "/");
    check probeListener.'start();
    probeClient = check new ("http://localhost:9291");
}

function probe() returns http:Client {
    http:Client? c = probeClient;
    if c is http:Client {
        return c;
    }
    panic error("probe not started");
}

@test:Config {}
function validAssertionIsAccepted() returns error? {
    http:Client c = probe();
    string token = check mint("tests/resources/gateway.key", "user-1");
    http:Response res = check c->get("/who", {[TEST_HEADER]: token});
    test:assertEquals(res.statusCode, 200);
    test:assertEquals(check res.getTextPayload(), "user-1");
}

@test:Config {}
function otherKeyIsRejected() returns error? {
    http:Client c = probe();
    string token = check mint("tests/resources/other.key", "user-1");
    http:Response res = check c->get("/who", {[TEST_HEADER]: token});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function tamperedPayloadIsRejected() returns error? {
    http:Client c = probe();
    string token = check mint("tests/resources/gateway.key", "user-1");
    string[] parts = re `\.`.split(token);
    string forged = (check mint("tests/resources/gateway.key", "admin-9")).toString();
    string[] forgedParts = re `\.`.split(forged);
    string tampered = parts[0] + "." + forgedParts[1] + "." + parts[2];
    http:Response res = check c->get("/who", {[TEST_HEADER]: tampered});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function missingAssertionIs401OnIdentityResourceAndPublicIs200() returns error? {
    http:Client c = probe();
    http:Response res = check c->get("/who");
    test:assertEquals(res.statusCode, 401);
    http:Response open = check c->get("/open");
    test:assertEquals(open.statusCode, 200);
}

@test:Config {}
function pagingLinks() {
    test:assertEquals(pageLink(20, 0, 45, true), "/orders/today?limit=20&offset=20");
    test:assertEquals(pageLink(20, 40, 45, true), ());
    test:assertEquals(pageLink(20, 0, 45, false), ());
    test:assertEquals(pageLink(20, 10, 45, false), "/orders/today?limit=20&offset=0");
}

@test:Config {}
function displayNameFallsBackToSubject() {
    test:assertEquals(displayName({userId: "u1", username: "ann", scopes: [], orgHandle: ""}), "ann");
    test:assertEquals(displayName({userId: "u1", username: " ", scopes: [], orgHandle: ""}), "u1");
}
