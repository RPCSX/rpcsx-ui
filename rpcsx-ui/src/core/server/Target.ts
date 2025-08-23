export class Target {
    constructor(
        public fileFormat: string,
        public arch: string,
        public platform: string,
    ) { }

    static parse(triple: string) {
        const parts = triple.split('-');
        if (parts.length != 3) {
            return undefined;
        }

        return new Target(parts[0], parts[1], parts[2]);
    }

    static native() {
        return nativeTarget;
    }

    format(): string {
        return this.fileFormat + "-" + this.arch + "-" + this.platform;
    }
}

const nativeTarget = new Target("none", "none", "none");
