import * as core from "$core";
import * as locations from "$core/locations";
import fs from 'fs/promises';
import path from 'path';

export async function activateLocalExtensions(list: Set<string>) {
    try {
        for (const entry of await fs.readdir(locations.localExtensionsPath, { withFileTypes: true, encoding: 'utf-8' })) {
            if (!entry.isDirectory()) {
                continue;
            }

            try {
                await fs.stat(path.join(path.join(entry.parentPath, entry.name, "extension.json")));
            } catch {
                continue;
            }

            try {
                await core.extensionLoad({ id: entry.name });
            } catch (e) {
                console.error(`failed to load local extension ${entry.name}`, e);
                continue;
            }

            try {
                await core.componentActivate({ id: entry.name });
            } catch (e) {
                console.error(`failed to activate extension ${entry.name}`, e);
                try {
                    await core.extensionUnload({ id: entry.name });
                } catch (e) {
                    console.error(`failed to unload extension ${entry.name}`, e);
                }
                continue;
            }

            list.add(entry.name);
        }
    } catch (e) {
        console.error(`failed to load local extensions`, e);
    }
}
