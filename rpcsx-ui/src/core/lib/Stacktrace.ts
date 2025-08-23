export class Stacktrace {
    static Create() {
        const err = new Error();
        return new Stacktrace(err.stack ?? '');
    }

    private constructor(readonly trace: string) { }

    print() {
        console.warn(this.trace.split('\n').slice(2).join('\n'));
    }
};
