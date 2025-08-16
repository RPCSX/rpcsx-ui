import EventEmitter from "events";
import { ComponentContext, ComponentId, Component } from "$/Component.js";
import { Disposable, IDisposable } from "$/Disposable.js";
import { isJsonObject } from '$/Json';
import { createError } from "lib/Error";
import { get as settingsGet } from './Settings';
import { Schema } from "lib/Schema";
import { ipcMain } from "electron";

type Key<K, T> = T extends [never] ? string | symbol : K | keyof T;

type Listener<K, T, F> = T extends [never] ? F : (
    K extends keyof T ? (
        T[K] extends unknown[] ? (...args: T[K]) => void : never
    )
    : never
);

export type IComponentImpl = IDisposable & {
    initialize(eventEmitter: (event: string, params: JsonObject) => void): void | Promise<void>;
    activate(context: ComponentContext, settings: JsonObject, signal?: AbortSignal): void | Promise<void>;
    deactivate(context: ComponentContext): void | Promise<void>;
    call?(caller: Component, method: string, params: JsonObject | undefined): Promise<JsonObject | void>;
    notify?(caller: Component, notification: string, params: JsonObject | undefined): Promise<void>;
}

const activateEvent = "activate";
const deactivateEvent = "deactivate";
const builtinEvents = [activateEvent, deactivateEvent];

export class ComponentInstance implements ComponentContext {
    protected initialized = false;
    protected activated = false;
    private disposeList = Disposable.None;
    private eventEmitter = new EventEmitter();
    readonly view = Object.freeze(this.createCallerView(this));

    constructor(private readonly manifest: ComponentManifest, private impl: IComponentImpl) { }

    manage(...objects: (IDisposable | (() => void))[]) {
        this.disposeList = Disposable.Create(
            this.disposeList,
            ...objects
        );
    }

    private createCallerView(caller: ComponentInstance): Component {
        return {
            getId: () => caller.getId(),
            onClose: (listener) => caller.onEvent(this, deactivateEvent, listener),
        };
    }

    async initialize() {
        await this.impl.initialize((event, params) => this.eventEmitter.emit(event, params));
        this.initialized = true;
    }

    async activate(settings?: JsonObject) {
        if (!settings) {
            const schema = this.getContribution("settings");
            if (schema) {
                settings = settingsGet(this.getName(), schema as Record<string, Schema>);
            }

            settings ??= {};
        }

        await this.impl.activate(this, settings);

        const methods = this.getContribution(`methods`);

        const rendererComponent: Component = {
            getId: () => ":renderer",
            onClose: (_listener) => Disposable.None, // FIXME
        };

        if (methods) {
            Object.keys(methods).forEach(method => {
                const channel = `${this.getName()}/${method}`;

                ipcMain.handle(channel, (_, params: JsonObject) => {
                    if (!this.impl.call) {
                        return createError(ErrorCode.InternalError, `component ${this.getName()} not defines call`);
                    }

                    try {
                        return this.impl.call(rendererComponent, method, params);
                    } catch (e) {
                        return e;
                    }
                });
                this.manage(() => ipcMain.removeHandler(channel));
            });
        }

        const notifications = this.getContribution(`notifications`);

        if (notifications) {
            Object.keys(notifications).forEach(notification => {
                const channel = `${this.getName() }/${notification}`;

                const handler = (_: any, params: JsonObject) => {
                    if (!this.impl.notify) {
                        return createError(ErrorCode.InternalError, `component ${this.getName()} not defines notify`);
                    }

                    try {
                        return this.impl.notify(rendererComponent, notification, params);
                    } catch (e) {
                        return e;
                    }
                };

                ipcMain.on(channel, handler);
                this.manage(() => ipcMain.off(channel, handler));
            });
        }

        this.emitEvent(activateEvent);
        this.activated = true;
    }

    async deactivate() {
        this.emitEvent(deactivateEvent);
        await this.impl.deactivate(this);
        await this.disposeList.dispose();
        this.eventEmitter.removeAllListeners();
        this.activated = false;
    }

    async shutdown() {
        if (!this.initialized) {
            return;
        }

        if (this.activated) {
            await this.deactivate();
        }

        await this.impl.dispose();
        this.initialized = false;
    }

    async dispose() {
        try {
            unregisterComponent(this.getId());
        } catch { }

        await this.shutdown();
    }

    subscribe<K, T extends Record<keyof T, any[]> | [never] = [never]>(emitter: NodeJS.EventEmitter<T>, channel: Key<K, T>, listener: Listener<K, T, (...args: any[]) => void>) {
        emitter.on(channel, listener);
        this.manage(() => emitter.off(channel, listener));
    }

    isInitialized() {
        return this.initialized;
    }

    isActivated() {
        return this.activated;
    }

    getContribution(path: string) {
        if (!this.manifest.contributions) {
            return undefined;
        }
        const elems = path.split("/");
        let node: Json = this.manifest.contributions;

        while (true) {
            const elem = elems.shift();

            if (!elem) {
                break;
            }

            if (!isJsonObject(node)) {
                return undefined;
            }

            const elemNode: Json = node[elem];

            if (elemNode == undefined) {
                elems.unshift(elem);
                return node[elems.join("/")];
            }

            node = elemNode;
        }

        return node;
    }

    hasContribution(path: string) {
        return this.getContribution(path) != undefined;
    }

    async call(caller: ComponentInstance, method: string, params: JsonObject | undefined): Promise<Json | void> {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.call || !this.hasContribution(`methods/${method}`)) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no method ${method}`);
        }

        return await this.impl.call(this.createCallerView(caller), method, params);
    }

    async notify(caller: ComponentInstance, notification: string, params: JsonObject | undefined) {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.notify || !this.hasContribution(`notifications/${notification}`)) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no notification ${notification}`);
        }

        return await this.impl.notify(this.createCallerView(caller), notification, params);
    }

    onEvent(caller: ComponentInstance, event: string, listener: (params?: JsonObject) => Promise<void> | void) {
        if (!builtinEvents.includes(event) && !this.hasContribution(`events/${event}`)) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} not emits event '${event}'`);
        }

        this.eventEmitter.on(event, listener);
        const disposable = Disposable.Create(() => {
            this.eventEmitter.off(event, listener);
        });
        caller.manage(disposable);
        return disposable;
    }

    emitEvent(event: string, params?: JsonObject) {
        this.eventEmitter.emit(event, params);
        ipcMain.emit(`${this.getName()}/${event}`, params);
    }

    getManifest() {
        return this.manifest;
    }

    getName() {
        return this.manifest.name;
    }

    getVersion() {
        return this.manifest.version;
    }

    getId() {
        return getComponentId(this.manifest);
    }
}

const registeredComponents: Record<string, ComponentInstance> = {};

function createComponentId(name: string, _version?: string): ComponentId {
    return name; //+ (_version ? "-" + _version : "");
}

export function getComponentId(info: ComponentManifest): ComponentId {
    return createComponentId(info.name, info.version);
}

export function registerComponent(info: ComponentManifest, impl: IComponentImpl) {
    const id = getComponentId(info);

    if (id in registeredComponents) {
        throw Error(`component ${id} already registered`);
    }

    const component = new ComponentInstance(info, impl);
    registeredComponents[id] = component;
    return component;
}

export function findComponent(name: string, version?: string): ComponentInstance | undefined {
    return registeredComponents[createComponentId(name, version)];
}

export function findComponentById(id: ComponentId): ComponentInstance | undefined {
    return registeredComponents[id];
}


export function getComponent(info: ComponentManifest) {
    const id = getComponentId(info);
    const component = registeredComponents[id];

    if (!component) {
        throw new Error(`component ${id} is not registered`);
    }

    return component;
}

const initializedComponents: Record<string, ComponentInstance> = {};
const activatedComponents: Record<string, ComponentInstance> = {};

export function getComponentList(): ComponentInstance[] {
    return Object.values(registeredComponents);
}
export function getActivatedComponentList(): ComponentInstance[] {
    return Object.values(activatedComponents);
}

export async function initializeComponent(info: ComponentManifest) {
    const id = getComponentId(info);

    if (id in initializedComponents) {
        return;
    }

    const component = registeredComponents[id];
    if (!component) {
        throw Error(`component ${id} not registered`);
    }
    if (component.isInitialized()) {
        return;
    }

    initializedComponents[id] = component;

    try {
        await component.initialize();
    } catch (e) {
        delete initializedComponents[id];
        throw e;
    }
}

export async function activateComponent(info: ComponentManifest) {
    const id = getComponentId(info);

    if (id in activatedComponents) {
        return true;
    }

    const component = registeredComponents[id];
    if (!component) {
        throw Error(`component ${id} not registered`);
    }

    await initializeComponent(info);

    activatedComponents[id] = component;

    if (info.dependencies) {
        let ok = true;
        for (const dependency of info.dependencies) {
            const depId = createComponentId(dependency.name, dependency.version);
            if (depId == id) {
                continue;
            }

            const depComponent = registeredComponents[depId];
            if (!depComponent) {
                console.error(`failed to find dependency ${depId} of component ${id}`);
                ok = false;
                break;
            }

            try {
                if (!await activateComponent(depComponent.getManifest())) {
                    console.error(`failed to activate dependency ${depId} of component ${id}`);
                    ok = false;
                    break;
                }
            } catch (e) {
                console.error(`exception during dependency ${depId} activation of component ${id}`, e);
                ok = false;
                break;
            }
        }

        if (!ok) {
            delete activatedComponents[id];
            return false;
        }
    }

    try {
        console.log(`activation ${component.getId()}`);
        await component.activate();
    } catch (e) {
        delete activatedComponents[id];
        throw e;
    }

    return true;
}

export async function uninitializeComponent(info: ComponentManifest) {
    const id = getComponentId(info);

    if (id in activatedComponents) {
        await deactivateComponent(info);
    }

    const component = initializedComponents[id];

    if (!component) {
        return false;
    }

    await component.shutdown();
    delete activatedComponents[id];
    return true;
}

export async function deactivateComponent(info: ComponentManifest) {
    const id = getComponentId(info);
    const component = activatedComponents[id];

    if (!component) {
        return false;
    }

    await component.deactivate();
    delete activatedComponents[id];
    return true;
}

export async function unregisterComponent(id: ComponentId) {
    const component = registeredComponents[id];

    if (!component) {
        throw createError(ErrorCode.InvalidParams, `component ${id} is not registered`);
    }

    if (component.isActivated()) {
        await component.deactivate();
    }

    if (component.isInitialized()) {
        await component.shutdown();
    }

    delete registeredComponents[id];
}


export async function startup() {
    Object.values(registeredComponents).forEach(component => console.log(component.getId()));
    await Promise.all(Object.values(registeredComponents).map(component => initializeComponent(component.getManifest())));

    for (const component of Object.values(registeredComponents)) {
        await activateComponent(component.getManifest());
    }
}

export async function shutdown() {
    for (const component of Object.values(registeredComponents)) {
        await unregisterComponent(component.getId());
    }
}
