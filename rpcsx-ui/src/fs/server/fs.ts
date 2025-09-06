import * as self from '$';
import { createError } from "$core/Error";
import { pickDirectory } from '@react-native-documents/picker';
import { ErrorCode } from '$core/enums';
import { FileHandle, File, Directory, Paths } from 'expo-file-system/next';
import * as core from '$core';

class NativeFile implements FileInterface {
    constructor(private id: number, private handle: FileHandle) { }

    close(_caller: ComponentRef) {
        core.objectDestroy({
            object: this.id
        });
        this.handle.close();
    }

    read(_caller: ComponentRef, request: FsFileReadRequest): FsFileReadResponse {
        this.handle.offset = request.offset;
        const result = this.handle.readBytes(request.size);

        return {
            data: Array.from(result)
        };
    }

    write(_caller: ComponentRef, request: FsFileWriteRequest): FsFileWriteResponse {
        this.handle.offset = request.offset;
        this.handle.writeBytes(Uint8Array.from(request.data));
        return request.data.length;
    }

    getId() {
        return this.id;
    }
}

class NativeFileSystem implements FileSystemInterface {
    async open(_caller: ComponentRef, request: FsFileSystemOpenRequest): Promise<FsFileSystemOpenResponse> {
        try {
            const descriptor = new File(request.uri).open();
            const object = await self.createFileObject(request.uri, NativeFile, descriptor);
            return object.getId();
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async readToString(_caller: ComponentRef, request: FsFileSystemReadToStringRequest): Promise<FsFileSystemReadToStringResponse> {
        try {
            return new File(request.uri).text();
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async writeString(_caller: ComponentRef, request: FsFileSystemWriteStringRequest) {
        try {
            return new File(request.uri).write(request.string);
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async readDir(_caller: ComponentRef, request: FsFileSystemReadDirRequest): Promise<FsFileSystemReadDirResponse> {
        try {
            const result = new Directory(request).list();

            return {
                items: result.map(item => {
                    const result: FsDirEntry = {
                        name: item.name,
                        type: item instanceof File ? FsDirEntryType.File : FsDirEntryType.Directory
                    };

                    return result;
                })
            };
        } catch (e) {
            throw createError(ErrorCode.InvalidParams, `${e}`);
        }
    }

    async stat(_caller: ComponentRef, request: FsFileSystemStatRequest): Promise<FsFileSystemStatResponse> {
        try {
            const result = new File(request);

            return {
                size: result.size ?? 0,
                type: result.type == null ? FsDirEntryType.Directory : FsDirEntryType.File
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
    const protocol = new URL(request.uri).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.open(request);
}

export async function readToString(_caller: ComponentRef, request: FsReadToStringRequest): Promise<FsReadToStringResponse> {
    const protocol = new URL(request.uri).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.readToString(request);
}

export async function writeString(_caller: ComponentRef, request: FsWriteStringRequest): Promise<FsWriteStringResponse> {
    const protocol = new URL(request.uri).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.writeString(request);
}

export async function readDir(_caller: ComponentRef, request: FsReadDirRequest): Promise<FsReadDirResponse> {
    const protocol = new URL(request).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.readDir(request);
}

export async function stat(_caller: ComponentRef, request: FsStatRequest): Promise<FsStatResponse> {
    const protocol = new URL(request).protocol || "file:";

    const object = await self.findFileSystemObject(protocol);
    return await object.stat(request);
}

export function getBuiltinResourcesLocation(_caller: ComponentRef, _request: FsGetBuiltinResourcesLocationRequest): FsGetBuiltinResourcesLocationResponse {
    return Paths.document.uri;
}

export function getConfigLocation(_caller: ComponentRef, _request: FsGetConfigLocationRequest): FsGetConfigLocationResponse {
    return Paths.document.uri;
}

export async function openDirectorySelector(caller: ComponentRef, request: FsOpenDirectorySelectorRequest): Promise<FsOpenDirectorySelectorResponse> {
    try {
        return (await pickDirectory({
            requestLongTermAccess: true
        })).uri;
    } catch {
        throw createError(ErrorCode.RequestCancelled);
    }
}
