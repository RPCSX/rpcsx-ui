import { CancelablePromise } from "./CancelablePromise";
import { IDisposable, Disposable } from "./Disposable";
import { createError } from "./Error";
import { LinkedList } from "./LinkedList";

export interface Event<T> {
    (listener: (e: T) => unknown, disposable?: Disposable): IDisposable;
}

export namespace Event {
    export const None: Event<any> = () => Disposable.None;

    export function once<T>(event: Event<T>): Event<T> {
        return (listener, disposable?) => {
            let fired = false;

            const result = event(e => {
                if (fired) {
                    return;
                }

                if (result) {
                    result.dispose();
                } else {
                    fired = true;
                }

                return listener(e);
            }, disposable);

            if (fired) {
                result.dispose();
            }

            return result;
        };
    }

    export function toPromise<T>(event: Event<T>, disposable?: Disposable): CancelablePromise<T> {
        const promise = new Promise((resolve, reject) => {
            const listener = once(event)(resolve, disposable);
            promise.cancel = () => {
                listener.dispose();
                reject(createError(ErrorCode.RequestCancelled));
            };
        }) as CancelablePromise<T>;

        return promise;
    }
}

type Listener<T> = (data: T) => void;

export class Emitter<T> implements IDisposable {
    private _firstListener?: Listener<T>;
    private _restListeners?: LinkedList<Listener<T>>;
    private _event?: Event<T>;
    private _disposed?: boolean;


    dispose() {
        this._disposed = true;
        this._restListeners?.dispose();
        this._restListeners = undefined;
        this._firstListener = undefined;
        this._event = undefined;
    }

    get event(): Event<T> {
        this._event ??= (callback: (e: T) => unknown, disposable?: Disposable) => {
            if (this._disposed) {
                return Disposable.None;
            }

            if (!this._restListeners && !this._firstListener) {
                this._firstListener = callback;

                const result = {
                    dispose: () => this._firstListener = undefined
                };

                disposable?.add(result);
                return result;
            }

            if (!this._restListeners) {
                this._restListeners = new LinkedList();
            }

            const removeListener = this._restListeners.unshift(callback);
            const result = {
                dispose: () => {
                    removeListener();

                    if (this._restListeners?.empty()) {
                        this._restListeners.dispose();
                        this._restListeners = undefined;
                    }
                }
            };

            disposable?.add(result);
            return result;
        }

        return this._event;
    }

    emit(event: T) {
        if (this._restListeners) {
            this._restListeners.forEach(listener => listener(event));
        }

        if (this._firstListener) {
            this._firstListener(event);
        }
    }

    hasListeners() {
        return this._firstListener || this._restListeners;
    }
};
