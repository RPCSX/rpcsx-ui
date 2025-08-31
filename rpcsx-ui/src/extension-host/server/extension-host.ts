import * as core from "$core";
import * as fs from '$fs';
import * as path from '$core/path';

export async function activateLocalExtensions(list: Set<string>) {
    try {
        const rootPath = path.join(await fs.fsGetBuiltinResourcesLocation(undefined), "extensions");
        for (const entry of (await fs.fsReadDir(rootPath)).items) {
            if (entry.type != FsDirEntryType.Directory) {
                continue;
            }

            try {
                await fs.fsStat(path.join(rootPath, entry.name, "extension.json"));
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
