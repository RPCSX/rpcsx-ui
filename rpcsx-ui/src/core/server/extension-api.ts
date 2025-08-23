import { createError } from '$/Error';

export async function loadExtension(_request: ExtensionLoadRequest): Promise<ExtensionLoadResponse> {
    throw createError(ErrorCode.InvalidRequest);
}

export async function unloadExtension(_request: ExtensionUnloadRequest): Promise<ExtensionUnloadResponse> {
    throw createError(ErrorCode.InvalidRequest);
}

export async function installExtension(_request: ExtensionInstallRequest): Promise<ExtensionInstallResponse> {
    throw createError(ErrorCode.InvalidRequest);
}

export async function removeExtension(_request: ExtensionRemoveRequest): Promise<ExtensionRemoveResponse> {
    throw createError(ErrorCode.InvalidRequest);
}
