import { IDisposable } from "./Disposable";


type Key<K, T> = T extends [never] ? string | symbol : K | keyof T;

type Listener<K, T, F> = T extends [never] ? F : (
    K extends keyof T ? (
        T[K] extends unknown[] ? (...args: T[K]) => void : never
    )
    : never
);

export type ComponentContext = {
    manage(...objects: (IDisposable | (() => void))[]): void;
    subscribe<K, T extends Record<keyof T, any[]> | [never] = [never]>(emitter: NodeJS.EventEmitter<T>, channel: Key<K, T>, listener: Listener<K, T, (...args: any[]) => void>): void;
};

export type ComponentId = string;

export type Component = {
    getId(): ComponentId;
    onClose(listener: () => void): IDisposable;
    sendEvent(event: string, params?: any): void;
};
