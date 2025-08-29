import * as self from '$';
import { createError } from '$core/Error';
import { ComponentInstance, findComponentById, getActivatedComponentList, getComponentList, initializeComponent } from './ComponentInstance';
import * as instance from './ComponentInstance';
import * as settings from './Settings';
import { Schema, SchemaError, SchemaObject, validateObject } from 'lib/Schema';
import * as extensionApi from './extension-api';
import { registerBuiltinLaunchers } from './registerBuiltinLaunchers';
import { initialize } from './initialize';
import * as objects from './Objects';

initialize();
registerBuiltinLaunchers();

export async function activate() {
    await settings.load();

    const components = getComponentList();

    await Promise.all(Object.values(components).map(component => initializeComponent(component.getManifest())));

    for (const component of Object.values(components)) {
        if (component.getName() == "core") {
            continue;
        }

        try {
            await instance.activateComponent(component.getManifest());
        } catch (e) {
            console.error(`failed to activate ${component.getId()}`, e);
        }
    }
}

export async function deactivate() {
    await settings.save();

    const components = getComponentList();

    for (const component of Object.values(components)) {
        if (component.getName() == "core") {
            continue;
        }
        try {
            await instance.unregisterComponent(component.getId());
        } catch (e) {
            console.error(`failed to shutdown ${component.getId()}`, e);
        }
    }
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
    return extensionApi.loadExtension(request);
}

export async function unloadExtension(_caller: Component, request: ExtensionUnloadRequest): Promise<ExtensionUnloadResponse> {
    return extensionApi.unloadExtension(request);
}

export async function installExtension(_caller: Component, request: ExtensionInstallRequest): Promise<ExtensionInstallResponse> {
    return extensionApi.installExtension(request);
}

export async function removeExtension(_caller: Component, request: ExtensionRemoveRequest): Promise<ExtensionRemoveResponse> {
    return extensionApi.removeExtension(request);
}

function getComponentInstanceSettings(instance: ComponentInstance) {
    const schema = instance.getContribution("settings");
    if (!schema) {
        throw createError(ErrorCode.InvalidRequest, `Component ${instance.getId()} has no settings contribution`);
    }

    return {
        settings: settings.get(instance.getName(), schema as Record<string, Schema>),
        schema: {
            type: "object",
            label: instance.getName(),
            properties: schema
        } as SchemaObject
    };
}

function getComponentSettings(component: Component) {
    if (component.getId() == ":renderer") {
        // for renderer collect settings for all activated components

        const result: { settings: any, schema: SchemaObject } = {
            settings: {},
            schema: {
                type: "object",
                properties: {}
            }
        };

        getActivatedComponentList().map(instance => {
            try {
                const { settings, schema } = getComponentInstanceSettings(instance);

                result.settings[instance.getName()] = settings;
                result.schema.properties[instance.getName()] = schema;
            } catch { }
        });

        return result;
    }

    const instance = findComponentById(component.getId());
    if (!instance) {
        throw createError(ErrorCode.InvalidRequest, `Caller ${component.getId()} not found`);
    }

    return getComponentInstanceSettings(instance);
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
    self.emitSettingsUpdateEvent(request);
}

export async function handleSettingsGet(caller: Component, request: SettingsGetRequest): Promise<SettingsGetResponse> {
    const { settings, schema } = getComponentSettings(caller);
    const path = request.path.split("/");

    return { value: getObjectMember(settings, path), schema: getObjectMember(schema, path) };
}

export async function shutdown(caller: Component, _request: ShutdownRequest): Promise<ShutdownResponse> {
    console.warn(`shutdown invoked by ${caller.getId()}`);
    await instance.uninitializeComponent(self.thisComponent().getManifest());
}

export async function handleObjectCreate(caller: Component, request: ObjectCreateRequest): Promise<ObjectCreateResponse> {
    return {
        object: objects.createObject(caller, request.name, request.interface)
    };
}

export async function handleObjectDestroy(caller: Component, request: ObjectDestroyRequest): Promise<ObjectDestroyResponse> {
    return objects.destroyObject(caller, request.object)
}

export async function handleFindObject(_caller: Component, request: ObjectFindRequest): Promise<ObjectFindResponse> {
    return {
        object: objects.findObject(request.interfaceName, request.objectName)
    };
}

export async function handleObjectGetName(_caller: Component, request: ObjectGetNameRequest): Promise<ObjectGetNameResponse> {
    return {
        name: objects.getName(request.object)
    };
}


export async function handleObjectGetList(_caller: Component, request: ObjectGetListRequest): Promise<ObjectGetListResponse> {
    return {
        objects: objects.getObjectList(request.interface)
    };
}

export async function handleObjectCall(caller: Component, request: ObjectCallRequest): Promise<ObjectCallResponse> {
    return {
        result: await objects.call(caller, request.object, request.method, request.params) ?? {}
    };
}

export async function handleObjectNotify(caller: Component, request: ObjectNotifyRequest) {
    return objects.notify(caller, request.object, request.notification, request.params);
}
