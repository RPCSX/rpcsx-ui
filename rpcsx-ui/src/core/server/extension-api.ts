import { createError } from '$/Error';

import { NativeModule, requireNativeModule } from 'expo';

declare class ExtensionLoaderModule extends NativeModule {
    loadExtension(path: string): Promise<number>;
    unloadExtension(id: number): Promise<void>;
    call(extension: number, method: string, params: string): Promise<string>;
    notify(extension: number, notification: string, params: string): Promise<void>;
    sendResponse(methodId: number, body: string): Promise<void>;
}

const nativeLoader = requireNativeModule<ExtensionLoaderModule>('ExtensionLoader');

const loadedExtensions: Record<string, number> = {};

export async function loadExtension(request: ExtensionLoadRequest): Promise<ExtensionLoadResponse> {
    const nativeId = await nativeLoader.loadExtension(request.id);
    loadedExtensions[request.id] = nativeId;
}

export async function unloadExtension(request: ExtensionUnloadRequest): Promise<ExtensionUnloadResponse> {
    const nativeId = loadedExtensions[request.id];
    if (nativeId === undefined) {
        throw createError(ErrorCode.InvalidRequest, `extension ${request.id} is not loaded`);
    }

    await nativeLoader.unloadExtension(nativeId);
}

export async function installExtension(_request: ExtensionInstallRequest): Promise<ExtensionInstallResponse> {
    throw createError(ErrorCode.InvalidRequest);
}

export async function removeExtension(_request: ExtensionRemoveRequest): Promise<ExtensionRemoveResponse> {
    throw createError(ErrorCode.InvalidRequest);
}
