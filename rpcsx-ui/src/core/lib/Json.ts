
export function isJsonString(json: Json): json is JsonString {
    return typeof json == 'string';
}
export function isJsonNumber(json: Json): json is JsonNumber {
    return typeof json == 'number';
}
export function isJsonObject(json: Json): json is JsonObject {
    return typeof json == 'object' && !Array.isArray(json);
}
export function isJsonArray(json: Json): json is JsonArray {
    return Array.isArray(json);
}
export function isJsonNull(json: Json): json is JsonNull {
    return json == null;
}
export function isJsonBoolean(json: Json): json is JsonBoolean {
    return typeof json == 'boolean';
}
