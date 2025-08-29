import { createError } from "lib/Error";
import { ComponentInstance, findComponentById } from "./ComponentInstance";
import * as self from '$';

let nextObjectId = 0;

type InterfaceObject = {
    owner: ComponentId;
    objectName: string,
    interfaceName: string;
};

const objects: Record<number, InterfaceObject> = {};
const interfaceObjects: Record<string, Set<number>> = {};

export function registerInterface(component: ComponentInstance, interfaceName: string) {
    interfaceObjects[`${component.getId()}/${interfaceName}`] ??= new Set();
}
export function unregisterInterface(component: ComponentInstance, interfaceName: string) {
    const id = `${component.getId()}/${interfaceName}`;
    const iface = interfaceObjects[id];

    iface.forEach(async objectId => {
        const instance = objects[objectId];
        delete objects[objectId];

        const component = findComponentById(instance.owner);

        try {
            await component?.objectDestroy(component, instance.interfaceName, objectId);
        } catch {}
    });

    delete interfaceObjects[id];
}

export function createObject(caller: Component, objectName: string, interfaceName: string) {
    if (!(interfaceName in interfaceObjects)) {
        throw createError(ErrorCode.InvalidParams, `Unknown interface ${interfaceName}`);
    }

    const objectId = nextObjectId++;
    objects[objectId] = {
        owner: caller.getId(),
        objectName,
        interfaceName
    };

    interfaceObjects[interfaceName].add(objectId);
    caller.onClose(() => destroyObject(caller, objectId));
    self.emitObjectCreatedEvent({ interface: interfaceName, object: objectId });
    return objectId;
}

export function destroyObject(caller: Component, objectId: number) {
    const instance = objects[objectId];

    if (!instance) {
        return;
    }

    if (instance.owner != caller.getId()) {
        throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: Cannot destroy object '${instance.objectName}' created by component '${instance.owner}'`);
    }

    delete objects[objectId];
    interfaceObjects[instance.interfaceName]?.delete(objectId);
}

export function findObject(interfaceName: string, objectName: string) {
    const interfaceInstance = interfaceObjects[interfaceName];

    if (!interfaceInstance) {
        throw createError(ErrorCode.InvalidParams, `Interface '${interfaceName}' not exists`);
    }

    for (const objectId of interfaceInstance) {
        const objectInstance = objects[objectId];

        if (objectInstance?.objectName === objectName) {
            return objectId;
        }
    }

    throw createError(ErrorCode.InvalidParams, `Interface '${interfaceName}' has no '${objectName}' object`);
}

export function getName(objectId: number) {
    const objectInstance = objects[objectId];

    if (!objectInstance) {
        throw createError(ErrorCode.InvalidParams, `Object '${objectId}' not found`);
    }

    return objectInstance.objectName;
}

export function call(caller: Component, objectId: number, method: string, params: JsonObject) {
    const instance = objects[objectId];

    const callerComponent = findComponentById(caller.getId());
    if (!callerComponent) {
        throw createError(ErrorCode.InvalidRequest, "Cannot find caller component");
    }

    const component = findComponentById(instance.owner);
    if (!component) {
        throw createError(ErrorCode.InvalidRequest, "Cannot find object component");
    }

    return component.objectCall(callerComponent, objectId, method, params);
}

export function notify(caller: Component, objectId: number, notification: string, params: JsonObject) {
    const instance = objects[objectId];

    const callerComponent = findComponentById(caller.getId());
    if (!callerComponent) {
        throw createError(ErrorCode.InvalidRequest, "Cannot find caller component");
    }

    const component = findComponentById(instance.owner);
    if (!component) {
        throw createError(ErrorCode.InvalidRequest, "Cannot find object component");
    }

    return component.objectNotify(callerComponent, objectId, notification, params);
}

export function getObjectList(interfaceName: string) {
    if (!(interfaceName in interfaceObjects)) {
        throw createError(ErrorCode.InvalidParams, `Unknown interface ${interfaceName}`);
    }

    return [...interfaceObjects[interfaceName]];
}
