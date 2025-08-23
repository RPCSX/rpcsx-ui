type JsonNumber = number;
type JsonString = string;
type JsonNull = null;
type JsonBoolean = boolean;
type JsonObject = {
    [P in string]: Json;
};
type JsonArray = Array<Json>;
type Json = JsonNumber | JsonBoolean | JsonNull | JsonString | JsonArray | { [P in string]: Json };
