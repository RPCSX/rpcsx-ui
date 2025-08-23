import { fixObject, generateObject, Schema } from '$/Schema';

let currentSettings: JsonObject = {};

export async function load(_params?: { filePath: string }) {
    // FIXME: implement
    currentSettings = {};
}

export function save(_filePath?: string) {
    // FIXME: implement
}

export function get(name: string, settings: Record<string, Schema>, fix = true) {
    const schema: Schema = {
        type: "object",
        properties: settings
    };

    if (name in currentSettings) {
        if (!fix) {
            return currentSettings[name];
        }

        const fixed = fixObject(currentSettings[name], schema);
        currentSettings[name] = fixed;
        return fixed;
    }

    const result = generateObject(schema);
    currentSettings[name] = result;
    return result;
}
