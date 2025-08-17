import { Stats } from "fs";
import { parse, toNative } from "./path.js";
import * as fs from 'fs/promises';

export type Timestamp = { timestamp: number };

export type FileWithTimestamp = Timestamp & {
    content: string;
};


export function mergeTimestamps<T extends Timestamp>(timestamps: T[]) {
    return timestamps.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
}
export async function calcTimestamp(path: string[] | string): Promise<Timestamp> {
    if (typeof path === 'string') {
        return { timestamp: (await fs.stat(toNative(path))).mtimeMs };
    }

    return { timestamp: (await Promise.all(path.map(async x => (await fs.stat(toNative(x))).mtimeMs))).reduce((x, y) => Math.max(x, y)) };
}

export class FileDb {
    private generated: Record<string, FileWithTimestamp> = {};
    private cache: Record<string, FileWithTimestamp> = {};
    private selfTimestamp: number | undefined = undefined;

    private createFileImpl(path: string) {
        // console.log(`filedb: creating ${path}`);
        this.generated[path] = { content: "", timestamp: 0 };
        return this.generated[path];
    }

    async readFile(path: string, ts?: Timestamp) {
        const fileTimestamp = ts ? ts.timestamp : (await fs.stat(toNative(path))).mtimeMs;
        const cached = this.cache[path];

        if (fileTimestamp <= cached?.timestamp) {
            // console.log(`filedb: reading cached ${path}`);
            return cached;
        }

        // console.log(`filedb: reading ${path}`);
        const content = await fs.readFile(toNative(path), "utf8");
        if (!cached) {
            const result = {
                content,
                timestamp: fileTimestamp
            };
            this.cache[path] = result;
            return result;
        }

        cached.content = content;
        cached.timestamp = fileTimestamp;
        return cached;
    }

    createFile(path: string, sourceTimestamp: Timestamp): Promise<FileWithTimestamp | undefined>;
    createFile(path: string): Promise<FileWithTimestamp>;
    async createFile(filePath: string, sourceTimestamp: Timestamp | undefined = undefined) {
        if (filePath in this.generated) {
            throw new Error(`file '${filePath}' was already generated`);
        }

        if (!sourceTimestamp) {
            return this.createFileImpl(filePath);
        }

        let stat: Stats;

        try {
            stat = await fs.stat(toNative(filePath));
        } catch {
            return this.createFileImpl(filePath);
        }

        if (this.selfTimestamp == undefined) {
            try {
                this.selfTimestamp = (await fs.stat(import.meta.filename)).mtimeMs;
            } catch {
                this.selfTimestamp = 0;
            }
        }

        const timestamp = Math.max(sourceTimestamp.timestamp, this.selfTimestamp);

        if (timestamp > 0 && stat.mtimeMs > timestamp) {
            // console.log(`filedb: skipping ${path}`);
            return undefined;
        }

        return this.createFileImpl(filePath);
    }

    async commit() {
        const files = (await Promise.all(Object.keys(this.generated).map(async path => {
            const file = this.generated[path];

            if (file.timestamp > 0 && (await calcTimestamp(path)).timestamp >= file.timestamp) {
                return undefined;
            }

            return { ...file, path };
        }))).filter(file => file != undefined);

        const dirs = new Set<string>();

        files.forEach(file => {
            dirs.add(parse(file.path).dir);
        });

        await Promise.all([...dirs].map(async dir => {
            await fs.mkdir(toNative(dir), { recursive: true });
        }));

        await Promise.all(files.map(async file => {
            await fs.writeFile(toNative(file.path), file.content, "utf8");
            this.cache[file.path] = {
                content: file.content,
                timestamp: Date.now()
            };
        }));

        this.generated = {};
    }

    dump() {
        const files = (Object.keys(this.generated).map(path => {
            return { ...this.generated[path], path };
        }));

        files.forEach(file => {
            console.log(file.path, file.content);
        });
    }

    clear() {
        this.generated = {};
    }
}
