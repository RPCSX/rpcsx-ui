import * as fs from 'fs/promises'
import path from "path";
import { rootPath } from './locations.js'

export type Settings = {
    window: {
        width: number;
        height: number;
        x?: number;
        y?: number;
        fullscreen: boolean;
        devTools?: boolean;
    },
    grid: boolean;
}

const defaultSettings: Settings = {
    window: {
        width: 800,
        height: 600,
        fullscreen: false,
    },
    grid: false
};

const defaultSettingsDir = rootPath;
const defaultSettingsPath = path.join(defaultSettingsDir, "settings.json");
const currentSettings = structuredClone(defaultSettings);

export function setSetting(object: Partial<Settings>) {
    for (const key in object) {
        (currentSettings as any)[key] = (object as any)[key];
    }
}
export function resetSetting(key: keyof Settings) {
    (currentSettings[key] as any) = defaultSettings[key];
}

export function getSetting<T extends keyof Settings>(key: T) {
    return currentSettings[key];
}
export function getDefaultSetting<T extends keyof Settings>(key: T) {
    return defaultSettings[key];
}
export async function loadSettings(filePath?: string) {
    if (!filePath) {
        filePath = defaultSettingsPath;
    }

    try {
        let settingsText = await fs.readFile(filePath, { encoding: "utf8" });
        setSetting(JSON.parse(settingsText) as Settings);
    } catch (e) {
        setSetting(defaultSettings);
    }
}

export function saveSettings(filePath?: string) {
    if (!filePath) {
        filePath = defaultSettingsPath;
    }

    return fs.writeFile(filePath, JSON.stringify(currentSettings, null, 4), { encoding: "utf8" });
}
