import { NativeModule, requireNativeModule } from 'expo';
import { NativeTarget } from '$core/NativeTarget';
import * as core from "$core";
import * as self from "$";

declare class ExtensionLoaderModule extends NativeModule {
    loadExtension(path: string): Promise<number>;
    unloadExtension(id: number): Promise<void>;
    call(extension: number, method: string, params: string): Promise<string>;
    notify(extension: number, notification: string, params: string): Promise<void>;
    sendResponse(methodId: number, body: string): Promise<void>;
}

const nativeLoader = requireNativeModule<ExtensionLoaderModule>('ExtensionLoader');

class NativeProtocol implements ExternalComponentInterface {
    constructor(
        private objectId: number,
        private extensionId: number,
        public manifest: ExtensionInfo) {
    }

    async activate(_caller: ComponentRef, request: ExternalComponentActivateRequest) {
        return JSON.parse(await nativeLoader.call(this.extensionId, "$/activate", JSON.stringify(request)));
    }

    deactivate(_caller: ComponentRef): ExternalComponentDeactivateResponse | Promise<ExternalComponentDeactivateResponse> {
        return nativeLoader.notify(this.extensionId, "$/deactivate", "{}");
    }

    async call(_caller: ComponentRef, request: ExternalComponentCallRequest) {
        return JSON.parse(await nativeLoader.call(this.extensionId, request.method, JSON.stringify(request.params)));
    }

    dispose() {
        nativeLoader.unloadExtension(this.extensionId);
    }

    getPid() {
        return 0;
    }

    async initialize() {
        return JSON.parse(await nativeLoader.call(this.extensionId, "$/initialize", "{}"));
    }

    notify(_caller: ComponentRef, request: ExternalComponentNotifyRequest): void | Promise<void> {
        return nativeLoader.notify(this.extensionId, request.method, JSON.stringify(request.params));
    }

    async objectCall(_caller: ComponentRef, request: ExternalComponentObjectCallRequest) {
        return JSON.parse(await nativeLoader.call(this.extensionId, "$/object/activate", JSON.stringify(request)));
    }

    objectDestroy(caller: ComponentRef, request: ExternalComponentObjectDestroyRequest): void | Promise<void> {
        return nativeLoader.notify(this.extensionId, "$/object/destroy", JSON.stringify(request));
    }

    objectNotify(caller: ComponentRef, request: ExternalComponentObjectNotifyRequest): void | Promise<void> {
        return nativeLoader.notify(this.extensionId, "$/object/notify", JSON.stringify(request));
    }

    getObjectId() {
        return this.objectId;
    }
}

class InlineLauncher implements LauncherInterface {
    async launch(_caller: ComponentRef, request: LauncherLaunchRequest): Promise<LauncherLaunchResponse> {
        const extensionId = await nativeLoader.loadExtension(request.path);
        const protocol = await core.createExternalComponentObject(request.manifest.name[0].text, NativeProtocol, extensionId, request.manifest);
        
        try {
            await protocol.initialize();
            return protocol.getObjectId();
        } catch (e) {
            self.destroyObject(protocol.getObjectId());
            nativeLoader.unloadExtension(extensionId);
            throw e;
        }
    }
}

export async function registerBuiltinLaunchers() {
    await core.createLauncherObject(NativeTarget.format(), InlineLauncher);
}
