import * as path from '$/path';
import * as fs from '$fs';
import { findComponent, findComponentById, getComponentId, unregisterComponent } from './ComponentInstance';
import { createError } from 'lib/Error';
import { getLauncher } from './Launcher';
import { Extension } from './Extension';

export async function loadExtension(request: ExtensionLoadRequest): Promise<ExtensionLoadResponse> {
    if (findComponentById(request.id)) {
        return;
    }

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

    const launcher = getLauncher(manifest.launcher.type);
    if (launcher == null) {
        throw createError(ErrorCode.InternalError, `launcher ${manifest.launcher.type} not found`);
    }

    const process = await (async () => {
        try {
            return launcher.launch(path.join(localExtensionsPath, request.id, manifest.executable), manifest.args ?? [], {
                launcherRequirements: manifest.launcher.requirements ?? {},
            });
        } catch {
            throw createError(ErrorCode.InternalError, `${request.id}: failed to spawn extension process`);
        }
    })();

    new Extension(manifest, process);
}

export async function unloadExtension(request: ExtensionUnloadRequest): Promise<ExtensionUnloadResponse> {
    await unregisterComponent(request.id);
}

export async function installExtension(request: ExtensionInstallRequest): Promise<ExtensionInstallResponse> {
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

    if (findComponent(manifest.name[0].text, manifest.version)) {
        throw createError(ErrorCode.InvalidRequest, `extension ${request.path} already installed`);
    }

    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function removeExtension(request: ExtensionRemoveRequest): Promise<ExtensionRemoveResponse> {
    if (findComponentById(request.id)) {
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
