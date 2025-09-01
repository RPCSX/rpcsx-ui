class Callback<T extends (...args: any[]) => any>  {
    private _callback: T | undefined;
    private _queue: (() => void)[] = [];

    set(callback: T) {
        this._callback = callback;
        this._queue.forEach(x => x());
        this._queue = [];
    }

    call(...args: Parameters<T>) {
        if (this._callback) {
            return this._callback(...args);
        }


        return new Promise<ReturnType<T>>((resolve, reject) => {
            this._queue.push(() => {
                try {
                    if (this._callback) {
                        resolve(this._callback(...args));
                        return;
                    }

                    reject(new Error("unexpected callback state"));
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
};

const callCb = new Callback<(method: string, params: any) => any>();
const invokeCb = new Callback<(method: string, params: any) => void | Promise<void>>();
const eventCb = new Callback<(event: string, handler: (...args: any[]) => Promise<void> | void) => () => void>();
const viewPushCb = new Callback<(name: string, props: any) => void>();
const viewSetCb = new Callback<(name: string, props: any) => void>();
const viewPopCb = new Callback<() => void>();

export function setOnCall(cb: (method: string, params: any) => any) {
    callCb.set(cb);
}
export function setOnInvoke(cb: (notification: string, params: any) => void | Promise<void>) {
    invokeCb.set(cb);
}
export function setOnEvent(cb: (event: string, params: any) => () => void) {
    eventCb.set(cb);
}

export function onViewPush(cb: (name: string, props: any) => void) {
    viewPushCb.set(cb);
}
export function onViewSet(cb: (name: string, props: any) => void) {
    viewSetCb.set(cb);
}
export function onViewPop(cb: () => void) {
    viewPopCb.set(cb);
}

export function onEvent(event: string, handler: (...args: any[]) => Promise<void> | void) {
    return eventCb.call(event, handler);
}

export async function invoke(method: string, params: any): Promise<void> {
    return invokeCb.call(method, params);
}

export async function call(method: string, params: any): Promise<any> {
    return callCb.call(method, params);
}

export function viewPush(name: string, props: any) {
    viewPushCb.call(name, props);
}
export function viewSet(name: string, props: any) {
    viewSetCb.call(name, props);
}
export function viewPop() {
    viewPopCb.call();
}

export function sendViewInitializationComplete() {
}
