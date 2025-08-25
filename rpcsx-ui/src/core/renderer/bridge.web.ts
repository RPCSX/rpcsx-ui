
import * as Disposable from '$core/Disposable';
import { createError } from '$core/Error';
import * as bridge from '../lib/bridge';
export { viewPush, viewSet, viewPop } from '../lib/bridge';

export function setOnCall(_cb: (...args: any[]) => any) {}
export function setOnInvoke(_cb: (...args: any[]) => void | Promise<void>) {}
export function setOnEvent(_cb: (...args: any[]) => () => void) { }

export function onViewPush(cb: (name: string, props: any) => void) {
    if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.on("view/push", cb);
    }

    bridge.onViewPush(cb);
}
export function onViewSet(cb: (name: string, props: any) => void) {
    if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.on("view/set", cb);
    }

    bridge.onViewSet(cb);
}
export function onViewPop(cb: () => void) {
    if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.on("view/pop", cb);
    }

    bridge.onViewPop(cb);
}

export function onEvent(event: string, handler: (...args: any[]) => Promise<void> | void) {
    if (!window?.electron?.ipcRenderer) {
        return Disposable.noneFn;
    }

    return window.electron.ipcRenderer.on(event, handler);
}

export async function invoke(method: string, params: any): Promise<void> {
    if (!window?.electron?.ipcRenderer) {
        return;
    }

    return window.electron.ipcRenderer.send(method, params);
}

export async function call(method: string, params: any): Promise<any> {
    if (!window?.electron?.ipcRenderer) {
        throw createError(ErrorCode.InvalidRequest, "electron is not available");
    }

    return window.electron.ipcRenderer.invoke(method, params);
}

export function sendViewInitializationComplete() {
    if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send("frame/initialized");
    } else {
        // Page was open in browser, show explorer screen
        bridge.viewPush("Explorer", {});
    }
}

bridge.setOnEvent(onEvent);
bridge.setOnInvoke(invoke);
bridge.setOnCall(call);
