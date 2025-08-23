export type IDisposable = {
    dispose: () => void | Promise<void>
}

export const noneFn = Object.freeze(function () { });

const noneDisposable: IDisposable = Object.freeze({
    dispose: noneFn
});

type AnyDisposable = (() => void) | IDisposable;

export class Disposable implements IDisposable {
    private constructor(private _impl: (() => void | Promise<void>) | (() => void | Promise<void>)[]) {
    }

    private static IsNone(x: AnyDisposable) {
        if (x === noneDisposable || x === noneFn) {
            return true;
        }

        if (x instanceof Disposable && x._impl == noneFn) {
            return true;
        }

        return false;
    }

    static get None() {
        return noneDisposable;
    }

    private static Unwrap(x: AnyDisposable | AnyDisposable[]) {
        if (typeof x === 'function') {
            return x;
        }

        if (x instanceof Disposable) {
            return x._impl;
        }

        if (x === noneDisposable) {
            return noneFn;
        }

        if (Array.isArray(x)) {
            const result: (() => void | Promise<void>)[] = [];

            for (let i = 0; i < x.length; ++i) {
                if (Disposable.IsNone(x[i])) {
                    continue;
                }

                const unwrapped = this.Unwrap(x[i]);

                if (!Array.isArray(unwrapped)) {
                    result.push(unwrapped);
                    continue;
                }

                for (let j = 0; j < unwrapped.length; ++j) {
                    result.push(unwrapped[j]);
                }
            }

            if (result.length === 0) {
                return noneFn;
            }

            if (result.length === 1) {
                return result[0];
            }

            return result;
        }

        if (x.dispose === noneFn) {
            return noneFn;
        }

        return () => x.dispose();
    }

    static Create(...x: (IDisposable | (() => void | Promise<void>))[]): IDisposable {
        const result = this.Unwrap(x);
        return result === noneFn ? noneDisposable : new Disposable(result);
    }

    static CreateEmpty(): Disposable {
        return new Disposable(noneFn);
    }

    add(...x: (IDisposable | (() => void | Promise<void>))[]) {
        const unwrapped = Disposable.Unwrap(x);
        if (Disposable.IsNone(this)) {
            this._impl = unwrapped;
            return;
        }

        if (typeof this._impl == "function") {
            if (typeof unwrapped == "function") {
                if (!Disposable.IsNone(unwrapped)) {
                    this._impl = [this._impl, unwrapped];
                }

                return;
            }

            unwrapped.unshift(this._impl);
            this._impl = unwrapped;
            return;
        }

        if (typeof unwrapped == "function") {
            if (!Disposable.IsNone(unwrapped)) {
                this._impl.push(unwrapped);
            }

            return;
        }

        this._impl.push(...unwrapped);
    }

    async dispose() {
        const exceptions: any[] = [];

        if (typeof this._impl === 'function') {
            try {
                await  this._impl();
            } catch (e) {
                exceptions.push(e);
            }

        } else {
            for (let i = 0; i < this._impl.length; ++i) {
                try {
                    await this._impl[i]();
                } catch (e) {
                    exceptions.push(e);
                }
            }
        }

        this._impl = noneFn;

        if (exceptions.length === 1) {
            throw exceptions[0];
        } else if (exceptions.length > 0) {
            throw new AggregateError(exceptions);
        }
    }
}
