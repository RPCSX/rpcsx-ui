import * as path from '$core/path';
import * as fs from '$fs';
import * as core from '$core';
import { createError } from '$core/Error';

export async function loadExtension(request: ExtensionHostLoadRequest): Promise<ExtensionHostLoadResponse> {
    try {
        const componentObject = await core.findExternalComponentObject(request.id);

        if (componentObject) {
            return;
        }
    } catch { }

    const localExtensionsPath = path.join(await fs.fsGetBuiltinResourcesLocation(undefined), "extensions");
    const extensionManifestLocation = path.join(localExtensionsPath, request.id, "extension.json");

    const manifestText = await (async () => {
        try {
            return await fs.fsReadToString({ uri: extensionManifestLocation });
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `extension ${request.id} not found, uri ${extensionManifestLocation}, error ${e}`);
        }
    })();

    const manifest = await (async () => {
        try {
            return JSON.parse(manifestText) as ExtensionInfo;
        } catch {
            throw createError(ErrorCode.InternalError, `extension ${request.id} is broken`);
        }
    })();

    const launcher = await core.findLauncherObject(manifest.launcher.type);
    if (launcher == null) {
        throw createError(ErrorCode.InternalError, `launcher ${manifest.launcher.type} not found`);
    }

    try {
        await launcher.launch({
            path: path.join(localExtensionsPath, request.id, manifest.executable),
            args: manifest.args ?? [],
            manifest,
            launcherParams: manifest.launcher.requirements ?? {}
        });
    } catch (e) {
        throw createError(ErrorCode.InternalError, `${request.id}: failed to spawn extension process: ${e}`);
    }
}

export async function unloadExtension(request: ExtensionHostUnloadRequest): Promise<ExtensionHostUnloadResponse> {
    const componentObject = await core.findExternalComponentObject(request.id);
    await componentObject.destroy();
}

export async function installExtension(request: ExtensionHostInstallRequest): Promise<ExtensionHostInstallResponse> {
    // FIXME: unpack package
    const extensionManifestLocation = path.join(request.path, "extension.json");

    const manifestText = await (async () => {
        try {
            return await fs.fsReadToString({ uri: extensionManifestLocation });
        } catch {
            throw createError(ErrorCode.InvalidParams, `extension ${request.path} not found`);
        }
    })();

    const manifest = await (async () => {
        try {
            return JSON.parse(manifestText) as ExtensionInfo;
        } catch {
            throw createError(ErrorCode.InternalError, `extension ${request.path} is broken`);
        }
    })();

    void manifest;

    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function removeExtension(request: ExtensionHostRemoveRequest): Promise<ExtensionHostRemoveResponse> {
    const component = await (async () => {
        try {
            return await core.findExternalComponentObject(request.id);
        } catch {
            return undefined;
        }
    })();

    if (component) {
        throw createError(ErrorCode.InvalidRequest, `extension ${request.id} in use`);
    }

    const localExtensionsPath = path.join(await fs.fsGetBuiltinResourcesLocation(undefined), "extensions");
    const extensionLocation = path.join(localExtensionsPath, request.id);

    try {
        await fs.fsStat(extensionLocation);
    } catch {
        throw createError(ErrorCode.InvalidRequest, `extension ${request.id} not found`);
    }

    // FIXME: implement
    // try {
    //     await fs.rm(extensionLocation, { force: true, recursive: true });
    // } catch (e) {
    //     throw createError(ErrorCode.InternalError, `Failed to remove extension ${request.id}: ${e}`);
    // }
}
