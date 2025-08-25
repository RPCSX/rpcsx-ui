import { activateLocalExtensions } from './extension-host';
import * as core from "$core";

const activatedExtensions = new Set<string>();

export function activate() {
    return activateLocalExtensions(activatedExtensions);
}

export async function deactivate() {
    for (const extension of activatedExtensions) {
        core.componentDeactivate({
            id: extension
        });
    }
}

