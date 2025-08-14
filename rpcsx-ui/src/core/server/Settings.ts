import fs from 'fs/promises';
import path from "path";
import * as types from '$/types';
import * as locations from '$/locations';
import { fixObject, generateObject, Schema } from '$/Schema';

const defaultSettingsDir = locations.rootPath;
const defaultSettingsPath = path.join(defaultSettingsDir, "settings.json");
let g_filePath = defaultSettingsPath;
let currentSettings: types.JsonObject = {};

export async function load(params?: { filePath: string }) {
    if (params) {
        g_filePath = params.filePath;
    } else {
        g_filePath = defaultSettingsPath;
    }

    try {
        const settingsText = await fs.readFile(g_filePath, { encoding: "utf8" });
        currentSettings = JSON.parse(settingsText);
    } catch (e) {
        console.error('failed to load settings', e);
        currentSettings = {};
    }
}

export function save(filePath?: string) {
    if (!filePath) {
        filePath = g_filePath;
    }

    return fs.writeFile(filePath, JSON.stringify(currentSettings, null, 4), { encoding: "utf8" });
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
