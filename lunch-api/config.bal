import ballerina/os;

// Platform-injected bindings (design.json dependencies). Empty means unset; defaults are applied in db.bal.
configurable string dbHost = os:getEnv("LUNCH_DB_HOST");
configurable string dbPort = os:getEnv("LUNCH_DB_PORT");
configurable string dbName = os:getEnv("LUNCH_DB_DBNAME");
configurable string dbUser = os:getEnv("LUNCH_DB_USER");
configurable string dbPassword = os:getEnv("LUNCH_DB_PASSWORD");

// IANA zone that defines "today" for the office. Empty means UTC.
configurable string officeTimeZone = os:getEnv("OFFICE_TIME_ZONE");

// Create the schema at startup. Disabled only by the test suite, which has no database.
configurable boolean autoMigrate = true;
