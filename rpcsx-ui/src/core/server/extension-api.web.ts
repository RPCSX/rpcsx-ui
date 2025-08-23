import path from 'path';
import fs from 'fs/promises';
import * as locations from '$core/locations';
import { findComponent, findComponentById, unregisterComponent } from './ComponentInstance';
import { createError } from 'lib/Error';
import { getLauncher } from './Launcher';
import { Extension } from './Extension';

export async function loadExtension(request: ExtensionLoadRequest): Promise<ExtensionLoadResponse> {
    if (findComponentById(request.id)) {
        return;
    }

    const extensionManifestLocation = path.join(locations.extensionsPath, request.id, "extension.json");

    const manifestText = await (async () => {
        try {
            return await fs.readFile(extensionManifestLocation, "utf8");
        } catch {
            throw createError(ErrorCode.InvalidParams, `extension ${request.id} not found`);
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
            return launcher.launch(path.join(locations.extensionsPath, request.id, manifest.executable), manifest.args ?? [], {
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
            return await fs.readFile(extensionManifestLocation, "utf8");
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

    const launcher = getLauncher(manifest.launcher.type);
    if (launcher == null) {
        throw createError(ErrorCode.InternalError, `launcher ${manifest.launcher.type} not found`);
    }

    const process = await (async () => {
        try {
            return launcher.launch(path.join(request.path, manifest.executable), manifest.args ?? [], {
                launcherRequirements: manifest.launcher.requirements ?? {},
            });
        } catch {
            throw createError(ErrorCode.InternalError, `${request.path}: failed to spawn extension process`);
        }
    })();

    try {
        const extension = new Extension(manifest, process);
        return { id: extension.getId() };
    } catch (e) {
        process.kill("SIGKILL");
        throw e;
    }
}

export async function removeExtension(request: ExtensionRemoveRequest): Promise<ExtensionRemoveResponse> {
    if (findComponentById(request.id)) {
        throw createError(ErrorCode.InvalidRequest, `extension ${request.id} in use`);
    }

    const extensionLocation = path.join(locations.extensionsPath, request.id);

    try {
        await fs.stat(extensionLocation);
    } catch {
        throw createError(ErrorCode.InvalidRequest, `Extension ${request.id} not found`);
    }

    try {
        await fs.rm(extensionLocation, { force: true, recursive: true });
    } catch (e) {
        throw createError(ErrorCode.InternalError, `Failed to remove extension ${request.id}: ${e}`);
    }
}
