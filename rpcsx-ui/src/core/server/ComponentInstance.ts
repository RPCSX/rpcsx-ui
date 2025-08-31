import * as Event from "$/Event";
import { Disposable, IDisposable } from "$/Disposable";
import { isJsonObject } from '$/Json';
import { createError } from "$/Error";
import { get as settingsGet } from './Settings';
import { Schema } from "$/Schema";
import { onComponentActivation } from './ComponentActivation';
import * as objects from './Objects';

type Key<K, T> = T extends [never] ? string | symbol : K | keyof T;

type Listener<K, T, F> = T extends [never] ? F : (
    K extends keyof T ? (
        T[K] extends unknown[] ? (...args: T[K]) => void : never
    )
    : never
);

export type IComponentImpl = IDisposable & {
    initialize(eventEmitter: (event: string, params: Json) => void): void | Promise<void>;
    activate(context: ComponentContext, settings: Json, signal?: AbortSignal): void | Promise<void>;
    deactivate(context: ComponentContext): void | Promise<void>;
    call?(caller: Component, method: string, params: Json | undefined): Promise<Json | void>;
    notify?(caller: Component, notification: string, params: Json | undefined): Promise<void>;
    getPid?(): number;
}

const activateEvent = "activate";
const deactivateEvent = "deactivate";
const builtinEvents = [activateEvent, deactivateEvent];

export class ComponentInstance implements ComponentContext {
    protected initialized = false;
    protected activated = false;
    private disposeList = Disposable.None;
    private eventEmitter: Record<string, Event.Emitter<any>> = {};
    private externalEventEmitter: Record<string, Event.Emitter<any>> = {};
    readonly view = Object.freeze(this.createCallerView(this));

    constructor(private readonly manifest: ComponentManifest, private impl: IComponentImpl) { }

    manage(...objects: (IDisposable | (() => void))[]) {
        this.disposeList = Disposable.Create(
            this.disposeList,
            ...objects
        );
    }

    private handleExternalEvent(sender: ComponentInstance, event: string, params: any) {
        this.externalEventEmitter[`${sender.getId()}/${event}`]?.emit(params);
    }

    private createCallerView(caller: ComponentInstance): Component {
        return {
            getId: () => caller.getId(),
            onClose: (listener) => caller.onEvent(this, deactivateEvent, listener),
            sendEvent: (event, params) => caller.handleExternalEvent(this, event, params),
            getPid: () => caller.getPid()
        };
    }

    async initialize() {
        await this.impl.initialize((event, params) => this.eventEmitter[event]?.emit(params));
        this.initialized = true;
    }

    async activate(settings?: JsonObject) {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        this.activated = true;

        try {
            if (!settings) {
                const schema = this.getContribution("settings");
                if (schema) {
                    settings = settingsGet(this.getName(), schema as Record<string, Schema>);
                }

                settings ??= {};
            }

            {
                const interfaces = this.getContribution("interfaces");

                if (interfaces) {
                    Object.keys(interfaces).forEach(iface => objects.registerInterface(this, iface));
                }
            }

            onComponentActivation(this);
            await this.impl.activate(this, settings);
        } catch (e) {
            this.activated = false;
            throw e;
        }

        this.emitEvent(activateEvent);
    }

    async deactivate() {
        this.emitEvent(deactivateEvent);
        Object.values(this.externalEventEmitter).forEach(e => e.dispose());
        this.externalEventEmitter = {};
        await this.impl.deactivate(this);
        await this.disposeList.dispose();
        Object.values(this.eventEmitter).forEach(e => e.dispose());

        {
            const interfaces = this.getContribution("interfaces");

            if (interfaces) {
                Object.keys(interfaces).forEach(iface => objects.unregisterInterface(this, iface));
            }
        }

        this.eventEmitter = {};
        this.activated = false;
    }

    async shutdown() {
        if (!this.initialized) {
            return;
        }

        this.initialized = false;

        if (this.activated) {
            try {
                await this.deactivate();
            } catch (e) {
                console.error(`Exception in component ${this.getId()} deactivation implementation`, e);
            }
        }

        try {
            await this.impl.dispose();
        } catch (e) {
            console.error(`Exception in component ${this.getId()} dispose implementation`, e);
        }
    }

    async dispose() {
        if (this.isActivated()) {
            try {
                await this.deactivate();
            } catch (e) {
                console.error(`Exception during component ${this.getId()} deactivation`, e);
            }
        }

        if (this.isInitialized()) {
            await this.shutdown();
        }
    }

    getPid() {
        return this.impl.getPid ? this.impl.getPid() : 0;
    }

    subscribe<K, T extends Record<keyof T, any[]> | [never] = [never]>(emitter: NodeJS.EventEmitter<T>, channel: Key<K, T>, listener: Listener<K, T, (...args: any[]) => void>) {
        emitter.on(channel, listener);
        const disposable = Disposable.Create(() => { emitter.off(channel, listener); });
        this.manage(disposable);
        return disposable;
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


    async objectCall(caller: ComponentInstance, objectId: number, method: string, params: Json | undefined): Promise<Json | void> {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.call) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no interface method support`);
        }

        return await this.impl.call(this.createCallerView(caller), `$/object/call`, {
            object: objectId,
            method,
            params: params ?? {}
        });
    }

    async objectNotify(caller: ComponentInstance, objectId: number, notification: string, params: Json | undefined): Promise<void> {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.notify) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no interface support`);
        }

        return await this.impl.notify(this.createCallerView(caller), `$/object/notify`, {
            object: objectId,
            notification,
            params: params ?? {}
        });
    }

    async objectDestroy(caller: ComponentInstance, interfaceName: string, objectId: number) {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.notify) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no interface support`);
        }

        return await this.impl.notify(this.createCallerView(caller), `$/object/destroy`, {
            objectId,
            interface: interfaceName
        });
    }

    async call(caller: ComponentInstance, method: string, params: Json | undefined): Promise<Json | void> {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.call || !this.hasContribution(`methods/${method}`)) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no method ${method}`);
        }

        return await this.impl.call(this.createCallerView(caller), method, params);
    }

    async notify(caller: ComponentInstance, notification: string, params: Json | undefined) {
        if (!this.isActivated()) {
            throw createError(ErrorCode.InvalidRequest, `${caller.getId()}: component ${this.getName()} is not active`);
        }

        if (!this.impl.notify || !this.hasContribution(`notifications/${notification}`)) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} has no notification ${notification}`);
        }

        return await this.impl.notify(this.createCallerView(caller), notification, params);
    }

    onEvent(caller: ComponentInstance, event: string, listener: (params?: Json) => Promise<void> | void) {
        if (!builtinEvents.includes(event) && !this.hasContribution(`events/${event}`)) {
            throw createError(ErrorCode.InvalidParams, `${caller.getId()}: component ${this.getName()} not emits event '${event}'`);
        }

        const externalEvent = `${this.getId()}/${event}`;

        caller.externalEventEmitter[externalEvent] ??= new Event.Emitter();
        const externalEmitter = caller.externalEventEmitter[externalEvent];

        this.eventEmitter[event] ??= new Event.Emitter();
        const emitter = this.eventEmitter[event];

        const externalDisposable = externalEmitter.event(listener);
        const emitterDisposable = emitter.event(listener);

        const disposable = Disposable.Create(async () => {
            if (!externalEmitter.hasListeners()) {
                delete caller.externalEventEmitter[externalEvent];
            }

            if (!emitter.hasListeners()) {
                delete this.eventEmitter[event];
            }

            try {
                await externalDisposable.dispose();
            } catch (e) {
                console.error('externalDisposable throws error', e);
            }

            try {
                await emitterDisposable.dispose();
            } catch (e) {
                console.error('emitterDisposable throws error', e);
            }
        });

        caller.manage(disposable);
        this.manage(disposable);
        return disposable;
    }

    emitEvent(event: string, params?: Json) {
        this.eventEmitter[event]?.emit(params);
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

    getImpl() {
        return this.impl;
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

export async function activateComponentByName(name: string) {
    const manifest = findComponent(name)?.getManifest();

    if (!manifest) {
        throw createError(ErrorCode.InvalidParams, `component ${name} not found`);
    }

    return activateComponent(manifest);
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

    try {
        await component.dispose();
    } catch (e) {
        console.error(`Exception during component ${id} dispose`, e);
    }

    delete registeredComponents[id];
}
