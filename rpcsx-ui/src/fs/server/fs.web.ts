import * as self from '$';
import * as core from '$core';
import { createError } from "$core/Error";
import fs from 'fs/promises';

class NativeFile implements FileInterface {
    constructor(private id: number, private handle: fs.FileHandle) { }

    async close(_caller: Component) {
        core.objectDestroy({
            object: this.id
        });
        await this.handle.close();
    }

    async read(_caller: Component, request: FsFileReadRequest): Promise<FsFileReadResponse> {
        const buffer = new Uint8Array(request.size);
        const result = await this.handle.read(buffer, 0, request.size, request.offset);

        return {
            data: Array.from(result.buffer)
        };
    }

    async write(_caller: Component, request: FsFileWriteRequest): Promise<FsFileWriteResponse> {
        const result = await this.handle.write(Uint8Array.from(request.data), {
            position: request.offset
        });

        return {
            written: result.bytesWritten
        };
    }

    getId() {
        return this.id;
    }
}

type WithFileType = {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
};

function toFileType(fileType: WithFileType) {
    if (fileType.isFile()) {
        return FsDirEntryType.File;
    }
    if (fileType.isDirectory()) {
        return FsDirEntryType.Directory;
    }
    if (fileType.isBlockDevice()) {
        return FsDirEntryType.BlockDevice;
    }
    if (fileType.isCharacterDevice()) {
        return FsDirEntryType.CharacterDevice;
    }
    if (fileType.isSocket()) {
        return FsDirEntryType.Socket;
    }
    if (fileType.isSymbolicLink()) {
        return FsDirEntryType.SymbolicLink;
    }
    if (fileType.isFIFO()) {
        return FsDirEntryType.Fifo;
    }

    return FsDirEntryType.Other;

}

class NativeFileSystem implements FileSystemInterface {
    async open(_caller: Component, request: FsFileSystemOpenRequest): Promise<FsFileSystemOpenResponse> {
        const filePath = new URL(request.uri).pathname;

        try {
            const descriptor = await fs.open(filePath, "rb");
            await self.createFileObject(request.uri, NativeFile, descriptor);
        } catch (e) { }

        throw createError(ErrorCode.InvalidParams);
    }

    async readToString(_caller: Component, request: FsFileSystemReadToStringRequest): Promise<FsFileSystemReadToStringResponse> {
        const filePath = new URL(request.uri).pathname;

        try {
            return {
                data: await fs.readFile(filePath, { encoding: "utf8" })
            };
        } catch (e) { }

        throw createError(ErrorCode.InvalidParams);
    }

    async readDir(_caller: Component, request: FsFileSystemReadDirRequest): Promise<FsFileSystemReadDirResponse> {
        const path = new URL(request.uri).pathname;
        const result = await fs.readdir(path, { withFileTypes: true });


        return {
            items: result.map(item => {
                const result: FsDirEntry = {
                    name: item.name,
                    type: toFileType(item)
                };

                return result;
            })
        };
    }

    async stat(_caller: Component, request: FsFileSystemStatRequest): Promise<FsFileSystemStatResponse> {
        const path = new URL(request.uri).pathname;
        const result = await fs.stat(path);

        return {
            item: {
                size: result.size,
                type: toFileType(result)
            }
        };
    }

}

export async function initialize() {
    await self.createFileSystemObject("file:", NativeFileSystem);
}

export async function uninitialize() {
    await Promise.all(self.ownObjects().map(object => object.dispose()));
}

export async function open(_caller: Component, request: FsOpenRequest): Promise<FsOpenResponse> {
    const protocol = new URL(request.uri).protocol;

    const object = await self.findFileSystemObject(protocol);
    return await object.open(request);
}

export async function readToString(_caller: Component, request: FsReadToStringRequest): Promise<FsReadToStringResponse> {
    const protocol = new URL(request.uri).protocol;

    const object = await self.findFileSystemObject(protocol);
    return await object.readToString(request);
}

export async function readDir(_caller: Component, request: FsReadDirRequest): Promise<FsReadDirResponse> {
    const protocol = new URL(request.uri).protocol;

    const object = await self.findFileSystemObject(protocol);
    return await object.readDir(request);
}


export async function stat(_caller: Component, request: FsStatRequest): Promise<FsStatResponse> {
    const protocol = new URL(request.uri).protocol;

    const object = await self.findFileSystemObject(protocol);
    return await object.stat(request);
}

