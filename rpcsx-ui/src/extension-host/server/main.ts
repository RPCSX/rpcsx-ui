import { activateLocalExtensions } from './extension-host';
import * as core from "$core";
import * as extensionApi from './extension-api';
import { registerBuiltinLaunchers } from './registerBuiltinLaunchers';

const activatedExtensions = new Set<string>();

export async function activate() {
    await registerBuiltinLaunchers();
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

export async function loadExtension(_caller: ComponentRef, request: ExtensionHostLoadRequest): Promise<ExtensionHostLoadResponse> {
    return extensionApi.loadExtension(request);
}

export async function unloadExtension(_caller: ComponentRef, request: ExtensionHostUnloadRequest): Promise<ExtensionHostUnloadResponse> {
    return extensionApi.unloadExtension(request);
}

export async function installExtension(_caller: ComponentRef, request: ExtensionHostInstallRequest): Promise<ExtensionHostInstallResponse> {
    return extensionApi.installExtension(request);
}

export async function removeExtension(_caller: ComponentRef, request: ExtensionHostRemoveRequest): Promise<ExtensionHostRemoveResponse> {
    return extensionApi.removeExtension(request);
}
