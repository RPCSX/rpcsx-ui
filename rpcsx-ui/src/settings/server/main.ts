// import * as fs from 'fs/promises';
// import path from "path";
// import { rootPath } from '$core/locations.js';
import * as types from '$/types.js';
// import ExtensionInterfaceStorage from '$core/ExternalInterfaceStorage.js';;
// import { ErrorCode } from '$core/ErrorCode.js';
// import { fixObject, generateObject, validateObject } from '$core/SchemaHelpers.js';
// import { Schema } from '$core/Schema.js';
import { Component, ComponentId } from '$core/Component.js';

export type SettingValue = boolean | number | string | { [key: string]: SettingValue | undefined } | SettingValue[];

// const defaultSettingsDir = rootPath;
// const defaultSettingsPath = path.join(defaultSettingsDir, "settings.json");
// let filePath = defaultSettingsPath;
// let currentSettings: JsonObject = defaultSettings;

export async function activate(_params?: { filePath: string }) {
    
    // if (params) {
    //     filePath = params.filePath;
    // } else {
    //     filePath = defaultSettingsPath;
    // }

    // currentSettings = structuredClone(defaultSettings);

    // try {
    //     let settingsText = await fs.readFile(filePath, { encoding: "utf8" });
    //     set(JSON.parse(settingsText) as Settings);
    // } catch (e) {
    //     console.error('setting load error', e);
    //     set(defaultSettings);
    // }

    // this.manage(
    //     ExtensionInterfaceStorage.exportMethodHandler("settings/update", (caller, params: { path: string, value: SettingValue }) => {
    //         if (!caller?.manifest.contributions?.settings) {
    //             throw { code: ErrorCode.InvalidRequest };
    //         }

    //         let node = this.getForExtension(caller.manifest.name, caller.manifest.contributions.settings);

    //         let schema: Schema = {
    //             type: "object",
    //             properties: caller.manifest.contributions.settings
    //         };

    //         params.path.split('/').forEach((elem, index, array) => {
    //             if (elem.length === 0) {
    //                 if (array.length === 1) {
    //                     if (!validateObject(params.value, schema)) {
    //                         throw { code: ErrorCode.InvalidParams };
    //                     }

    //                     currentSettings.extensions[caller.manifest.name] = params.value;
    //                 }
    //                 return;
    //             }

    //             if (schema.type !== 'object' || !(elem in schema.properties)) {
    //                 throw { code: ErrorCode.InvalidParams };
    //             }

    //             if (index === array.length - 1) {
    //                 if (!validateObject(params.value, schema.properties[elem])) {
    //                     throw { code: ErrorCode.InvalidParams };
    //                 }

    //                 node[elem] = params.value;
    //             }

    //             node = node[elem];
    //             schema = schema.properties[elem];
    //         });

    //         return node;
    //     })
    // );
}

export function deactivate() {
    // return save();
}

// function set(object: Partial<Settings>) {
//     for (const key in object) {
//         (currentSettings as any)[key] = (object as any)[key];
//     }
// }
// function reset(key: keyof Settings) {
//     (currentSettings[key] as any) = defaultSettings[key];
// }

// function get<T extends keyof Settings>(key: T) {
//     return currentSettings[key];
// }
// function getDefault<T extends keyof Settings>(key: T) {
//     return defaultSettings[key];
// }

// function save(filePath?: string) {
//     if (!filePath) {
//         filePath = g_filePath;
//     }

//     return fs.writeFile(filePath, JSON.stringify(currentSettings, null, 4), { encoding: "utf8" });
// }

// function getForExtension(name: string, settings: Record<string, Schema>, fix = true) {
//     const schema: Schema = {
//         type: "object",
//         properties: settings
//     };

//     if (name in currentSettings.extensions) {
//         if (!fix) {
//             return currentSettings.extensions[name];
//         }

//         const fixed = fixObject(currentSettings.extensions[name], schema);
//         currentSettings.extensions[name] = fixed;
//         return fixed;
//     }

//     const result = generateObject(schema);
//     currentSettings.extensions[name] = result;
//     return result;
// }

export async function handleSettingsSet(_caller: Component, _params: types.SettingsSetRequest): Promise<types.SettingsSetResponse> {}

export async function handleSettingsGet(_caller: Component, _params: types.SettingsGetRequest): Promise<types.SettingsGetResponse> {
    return {
        value: ""
    };
}
