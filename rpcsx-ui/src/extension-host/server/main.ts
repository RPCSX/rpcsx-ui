import { activateLocalExtensions } from './extension-host';
import * as core from "$core";

const activatedExtensions = new Set<string>();

export function activate() {
    return activateLocalExtensions(activatedExtensions);
}

export async function deactivate() {
    for (const extension of activatedExtensions) {
        try {
            await core.componentDeactivate({
                id: extension
            });
        } catch (e) {
            console.warn(`failed to deactivate extension '${extension}'`, e);
        }
    }
}

