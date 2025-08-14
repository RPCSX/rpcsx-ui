import * as api from '$';
import { Component } from '$core/Component';
import { createError } from 'lib/Error';
import { findComponent, findComponentById, unregisterComponent } from './ComponentInstance';
import * as locations from '$core/locations';
import path from 'path';
import fs from 'fs/promises';
import { getLauncher } from './Launcher';
import { Extension } from './Extension';

export function activate() {
    console.log('core: activate');
}

export function deactivate() {
    console.log('core: deactivate');
}

export async function activateComponent(_caller: Component, request: api.ComponentActivateRequest): Promise<api.ComponentActivateResponse> {
    const component = findComponentById(request.id);
    if (!component) {
        throw createError(api.ErrorCode.InvalidParams, `component ${request.id} not found`);
    }

    await component.activate();
}

export async function deactivateComponent(_caller: Component, request: api.ComponentDeactivateRequest): Promise<api.ComponentDeactivateResponse> {
    const component = findComponentById(request.id);
    if (!component) {
        throw createError(api.ErrorCode.InvalidParams, `component ${request.id} not found`);
    }

    await component.deactivate();
}
export async function loadExtension(_caller: Component, request: api.ExtensionLoadRequest): Promise<api.ExtensionLoadResponse> {
    if (findComponentById(request.id)) {
        return;
    }

    const extensionManifestLocation = path.join(locations.extensionsPath, request.id, "extension.json");

    const manifestText = await (async () => {
        try {
            return await fs.readFile(extensionManifestLocation, "utf8");
        } catch {
            throw createError(api.ErrorCode.InvalidParams, `extension ${request.id} not found`);
        }
    })();

    const manifest = await (async () => {
        try {
            return JSON.parse(manifestText) as api.ExtensionInfo;
        } catch {
            throw createError(api.ErrorCode.InternalError, `extension ${request.id} is broken`);
        }
    })();

    const launcher = getLauncher(manifest.launcher.type);
    if (launcher == null) {
        throw createError(api.ErrorCode.InternalError, `launcher ${manifest.launcher.type} not found`);
    }

    const process = await (async () => {
        try {
            return launcher.launch(path.join(locations.extensionsPath, request.id, manifest.executable), manifest.args ?? [], {
                launcherRequirements: manifest.launcher.requirements,
            });
        } catch {
            throw createError(api.ErrorCode.InternalError, `${request.id}: failed to spawn extension process`);
        }
    })();

    new Extension(manifest, process);
}

export async function unloadExtension(_caller: Component, request: api.ExtensionUnloadRequest): Promise<api.ExtensionUnloadResponse> {
    await unregisterComponent(request.id);
}

export async function installExtension(_caller: Component, request: api.ExtensionInstallRequest): Promise<api.ExtensionInstallResponse> {
    // FIXME: unpack package
    const extensionManifestLocation = path.join(request.path, "extension.json");

    const manifestText = await (async () => {
        try {
            return await fs.readFile(extensionManifestLocation, "utf8");
        } catch {
            throw createError(api.ErrorCode.InvalidParams, `extension ${request.path} not found`);
        }
    })();

    const manifest = await (async () => {
        try {
            return JSON.parse(manifestText) as api.ExtensionInfo;
        } catch {
            throw createError(api.ErrorCode.InternalError, `extension ${request.path} is broken`);
        }
    })();

    if (findComponent(manifest.name, manifest.version)) {
        throw createError(api.ErrorCode.InvalidRequest, `extension ${request.path} already installed`);
    }

    const launcher = getLauncher(manifest.launcher.type);
    if (launcher == null) {
        throw createError(api.ErrorCode.InternalError, `launcher ${manifest.launcher.type} not found`);
    }

    const process = await (async () => {
        try {
            return launcher.launch(path.join(request.path, manifest.executable), manifest.args ?? [], {
                launcherRequirements: manifest.launcher.requirements,
            });
        } catch {
            throw createError(api.ErrorCode.InternalError, `${request.path}: failed to spawn extension process`);
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

export async function removeExtension(_caller: Component, request: api.ExtensionRemoveRequest): Promise<api.ExtensionRemoveResponse> {
    if (findComponentById(request.id)) {
        throw createError(api.ErrorCode.InvalidRequest, `extension ${request.id} in use`);
    }

    const extensionLocation = path.join(locations.extensionsPath, request.id);

    try {
        await fs.stat(extensionLocation);
    } catch {
        throw createError(api.ErrorCode.InvalidRequest, `Extension ${request.id} not found`);
    }

    try {
        await fs.rm(extensionLocation, { force: true, recursive: true });
    } catch (e) {
        throw createError(api.ErrorCode.InternalError, `Failed to remove extension ${request.id}: ${e}`);
    }
}
