import * as self from '$';
import * as core from '$core';
import { createError } from "$core/Error";
import nodeFs from 'fs/promises';
import { app } from 'electron';
import nodePath from 'path';
import * as path from '$core/path';
import { dialog } from 'electron';
import { pathToFileURL } from 'url';
import nativePath from 'path';

function parseUri(uri: string) {
    return new URL(uri);
}

function parseFileUriPath(uri: string) {
    const pathName = decodeURI(parseUri(uri).pathname);

    if (nativePath.sep == "\\" && pathName.startsWith("/")) {
        return pathName.slice(1);
    }

    return pathName;
}


class NativeFile implements FileInterface {
    constructor(private id: number, private handle: nodeFs.FileHandle) { }

    async close(_caller: ComponentRef) {
        core.objectDestroy({
            object: this.id
        });
        await this.handle.close();
    }

    async read(_caller: ComponentRef, request: FsFileReadRequest): Promise<FsFileReadResponse> {
        const buffer = new Uint8Array(request.size);
        const result = await this.handle.read(buffer, 0, request.size, request.offset);

        return {
            data: Array.from(result.buffer)
        };
    }

    async write(_caller: ComponentRef, request: FsFileWriteRequest): Promise<FsFileWriteResponse> {
        const result = await this.handle.write(Uint8Array.from(request.data), {
            position: request.offset
        });

        return result.bytesWritten;
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
    async open(_caller: ComponentRef, request: FsFileSystemOpenRequest): Promise<FsFileSystemOpenResponse> {
        const filePath = parseFileUriPath(request.uri);

        try {
            const descriptor = await nodeFs.open(filePath, "rb");
            const object = await self.createFileObject(request.uri, NativeFile, descriptor);
            return object.getId();
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async readToString(_caller: ComponentRef, request: FsFileSystemReadToStringRequest): Promise<FsFileSystemReadToStringResponse> {
        const filePath = parseFileUriPath(request.uri);

        try {
            return await nodeFs.readFile(filePath, { encoding: "utf8" });
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async writeString(_caller: ComponentRef, request: FsFileSystemWriteStringRequest) {
        const filePath = parseFileUriPath(request.uri);

        try {
            return await nodeFs.writeFile(filePath, request.string, { encoding: "utf8" });
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async readDir(_caller: ComponentRef, request: FsFileSystemReadDirRequest): Promise<FsFileSystemReadDirResponse> {
        const path = parseFileUriPath(request);
        try {
            const result = await nodeFs.readdir(path, { withFileTypes: true });

            return {
                items: result.map(item => {
                    const result: FsDirEntry = {
                        name: item.name,
                        type: toFileType(item)
                    };

                    return result;
                })
            };
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async stat(_caller: ComponentRef, request: FsFileSystemStatRequest): Promise<FsFileSystemStatResponse> {
        const path = parseFileUriPath(request);

        try {
            const result = await nodeFs.stat(path);

            return {
                size: result.size,
                type: toFileType(result)
            };
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }
}

export async function initialize() {
    await self.createFileSystemObject("file:", NativeFileSystem);
}

export async function uninitialize() {
    await Promise.all(self.ownObjects().map(object => object.dispose()));
}

export async function open(_caller: ComponentRef, request: FsOpenRequest): Promise<FsOpenResponse> {
    const protocol = parseUri(request.uri).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.open(request);
}

export async function readToString(_caller: ComponentRef, request: FsReadToStringRequest): Promise<FsReadToStringResponse> {
    const protocol = parseUri(request.uri).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.readToString(request);
}

export async function writeString(_caller: ComponentRef, request: FsWriteStringRequest): Promise<FsWriteStringResponse> {
    const protocol = parseUri(request.uri).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.writeString(request);
}

export async function readDir(_caller: ComponentRef, request: FsReadDirRequest): Promise<FsReadDirResponse> {
    const protocol = parseUri(request).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.readDir(request);
}

export async function stat(_caller: ComponentRef, request: FsStatRequest): Promise<FsStatResponse> {
    const protocol = parseUri(request).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.stat(request);
}

export function getBuiltinResourcesLocation(_caller: ComponentRef, _request: FsGetBuiltinResourcesLocationRequest): FsGetBuiltinResourcesLocationResponse {
    if (app.isPackaged && "resourcesPath" in process && typeof process.resourcesPath == "string") {
        return pathToFileURL(process.resourcesPath).toString();
    }

    return encodeURI(path.toURI(nodePath.resolve(import.meta.dirname, "..")));
}

export function getConfigLocation(_caller: ComponentRef, _request: FsGetConfigLocationRequest): FsGetConfigLocationResponse {
    return encodeURI(path.toURI(nodePath.dirname(process.execPath)));
}

export async function openDirectorySelector(caller: ComponentRef, request: FsOpenDirectorySelectorRequest): Promise<FsOpenDirectorySelectorResponse> {
    const result = await dialog.showOpenDialog({
        properties: [
            'openDirectory',
            'createDirectory',
        ]
    });

    if (result.canceled || result.filePaths.length != 1) {
        throw createError(ErrorCode.RequestCancelled);
    }

    return pathToFileURL(result.filePaths[0]).toString();
}
