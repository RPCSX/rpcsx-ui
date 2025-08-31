import * as fs from '$fs';
import * as path from '$core/path';
import { fixObject, generateObject, Schema } from '$/Schema';

let currentSettings: JsonObject = {};

export async function load(params?: { uri: string }) {
    let uri: string;

    if (params) {
        uri = params.uri;
    } else {
        uri = path.join(await fs.fsGetConfigLocation(undefined), "settings.json");
    }

    console.log("settings uri:", uri);

    try {
        const settingsText = await fs.fsReadToString({ uri });
        currentSettings = JSON.parse(settingsText);
    } catch (e) {
        console.error('failed to load settings', e);
        currentSettings = {};
    }
}

export async function save(uri?: string) {
    if (!uri) {
        uri = path.join(await fs.fsGetConfigLocation(undefined), "settings.json");
    }

    return fs.fsWriteString({ uri, string: JSON.stringify(currentSettings, null, 4) });
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
