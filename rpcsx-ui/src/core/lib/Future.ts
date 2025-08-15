import { createError } from "./Error.js";

export class Future<T> {
    resolve: (value: T) => void;
    reject: (error: ErrorInstance) => void;
    private _promise: Promise<T> | undefined;
    private _value: { resolved: T } | { rejected: ErrorInstance } | undefined = undefined;

    constructor() {
        this.resolve = (value: T) => {
            if (!this._value || !("rejected" in this._value)) {
                this._value = { resolved: value };
            }
        };

        this.reject = (value: ErrorInstance) => {
            this._value = { rejected: value };
        };
    }

    get value() {
        if (this._value === undefined) {
            if (this._promise) {
                return this._promise;
            }

            this._promise = new Promise<T>((resolve, reject) => {
                if (this._value !== undefined) {
                    if ("rejected" in this._value) {
                        reject(this._value.rejected);
                    } else {
                        resolve(this._value.resolved);
                    }

                    this._promise = undefined;
                    return;
                }

                this.resolve = value => {
                    this._value = { resolved: value };
                    this._promise = undefined;
                    resolve(value);
                };
                this.reject = error => {
                    this._value = { rejected: error };
                    this._promise = undefined;
                    reject(error);
                };
            });

            return this._promise;
        }

        if ("resolved" in this._value) {
            return this._value.resolved;
        }

        throw this._value.rejected;
    }

    get error() {
        if (this._value && "rejected" in this._value) {
            return this._value.rejected;
        }

        return undefined;
    }

    hasResult() {
        return this._value !== undefined;
    }

    hasError() {
        return this._value !== undefined && "rejected" in this._value;
    }

    hasValue() {
        return this._value !== undefined && "resolved" in this._value;
    }

    dispose() {
        if (this._promise !== undefined && this.reject !== undefined) {
            this.reject(createError(ErrorCode.RequestCancelled, "Future was disposed"));
            this._promise = undefined;
        }

        this._value = undefined;
        this.reject = this.resolve = function () { };
    }
}
