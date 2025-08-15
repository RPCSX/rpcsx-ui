import * as api from '$';
import { Component } from '$core/Component';
import { createError } from '$core/Error';
import { findComponent, findComponentById, unregisterComponent } from './ComponentInstance';
import * as locations from '$core/locations';
import path from 'path';
import fs from 'fs/promises';
import * as settings from './Settings';
import { getLauncher } from './Launcher';
import { Extension } from './Extension';
import { Schema, SchemaError, validateObject } from 'lib/Schema';
import { ipcMain } from 'electron';

ipcMain.on('view/push', (event, view: string, ...args: any[]) => {
    event.sender.send('view/push', view, ...args);
});
ipcMain.on('view/set', (event, view: string, ...args: any[]) => {
    event.sender.send('view/set', view, ...args);
});
ipcMain.on('view/pop', (event, view: string, ...args: any[]) => {
    event.sender.send('view/pop', view, ...args);
});

export async function activate() {
    await settings.load();
}

export async function deactivate() {
    await settings.save();
}

export async function activateComponent(_caller: Component, request: ComponentActivateRequest): Promise<ComponentActivateResponse> {
    const component = findComponentById(request.id);
    if (!component) {
        throw createError(ErrorCode.InvalidParams, `component ${request.id} not found`);
    }

    await component.activate();
}

export async function deactivateComponent(_caller: Component, request: ComponentDeactivateRequest): Promise<ComponentDeactivateResponse> {
    const component = findComponentById(request.id);
    if (!component) {
        throw createError(ErrorCode.InvalidParams, `component ${request.id} not found`);
    }

    await component.deactivate();
}

export async function loadExtension(_caller: Component, request: ExtensionLoadRequest): Promise<ExtensionLoadResponse> {
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
                launcherRequirements: manifest.launcher.requirements,
            });
        } catch {
            throw createError(ErrorCode.InternalError, `${request.id}: failed to spawn extension process`);
        }
    })();

    new Extension(manifest, process);
}

export async function unloadExtension(_caller: Component, request: ExtensionUnloadRequest): Promise<ExtensionUnloadResponse> {
    await unregisterComponent(request.id);
}

export async function installExtension(_caller: Component, request: ExtensionInstallRequest): Promise<ExtensionInstallResponse> {
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

    if (findComponent(manifest.name, manifest.version)) {
        throw createError(ErrorCode.InvalidRequest, `extension ${request.path} already installed`);
    }

    const launcher = getLauncher(manifest.launcher.type);
    if (launcher == null) {
        throw createError(ErrorCode.InternalError, `launcher ${manifest.launcher.type} not found`);
    }

    const process = await (async () => {
        try {
            return launcher.launch(path.join(request.path, manifest.executable), manifest.args ?? [], {
                launcherRequirements: manifest.launcher.requirements,
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

export async function removeExtension(_caller: Component, request: ExtensionRemoveRequest): Promise<ExtensionRemoveResponse> {
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

function getComponentSettings(component: Component) {
    const instance = findComponentById(component.getId());
    if (!instance) {
        throw createError(ErrorCode.InvalidRequest, `Caller ${component.getId()} not found`);
    }

    const schema = instance.getContribution("settings");
    if (!schema) {
        throw createError(ErrorCode.InvalidRequest, `Component ${component.getId()} has no settings contribution`);
    }

    return {
        settings: settings.get(instance.getName(), schema as Record<string, Schema>),
        schema
    };
}

function getObjectMember(object: any, path: string[]) {
    while (true) {
        const entity = path.shift();

        if (!entity) {
            return object;
        }

        if (typeof object !== "object") {
            throw createError(ErrorCode.InvalidRequest, `Expected object ${object}`);
        }

        const node = object[entity];

        if (node === undefined) {
            throw createError(ErrorCode.InvalidRequest, `Unknown key ${entity}`);
        }

        object = node;
    }

}

export async function handleSettingsSet(caller: Component, request: SettingsSetRequest): Promise<SettingsSetResponse> {
    const path = request.path.split("/");
    const name = path.pop();

    if (!name) {
        return;
    }

    const { settings, schema } = getComponentSettings(caller);

    try {
        await validateObject(request.value, getObjectMember(schema, path));
    } catch (e) {
        const error = e as SchemaError;
        throw createError(ErrorCode.InvalidParams, `invalid value: ${JSON.stringify(error)}`);
    }

    const member = getObjectMember(settings, path);

    if (typeof member !== "object") {
        throw createError(ErrorCode.InvalidRequest, `Expected object ${name}`);
    }

    const prevValue = member[name];

    if (prevValue == request.value) {
        return;
    }

    member[name] = request.value;
    api.emitSettingsUpdateEvent(request);
}

export async function handleSettingsGet(caller: Component, request: SettingsGetRequest): Promise<SettingsGetResponse> {
    const { settings } = getComponentSettings(caller);
    const path = request.path.split("/");

    return { value: getObjectMember(settings, path) };
}
