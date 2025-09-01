import { createError } from "$core/Error";
import { pickDirectory } from '@react-native-documents/picker';


export async function initialize() {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function uninitialize() {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function open(_caller: Component, _request: FsOpenRequest): Promise<FsOpenResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function readToString(_caller: Component, _request: FsReadToStringRequest): Promise<FsReadToStringResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function writeString(_caller: Component, _request: FsWriteStringRequest): Promise<FsWriteStringResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function readDir(_caller: Component, _request: FsReadDirRequest): Promise<FsReadDirResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function stat(_caller: Component, _request: FsStatRequest): Promise<FsStatResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export function getBuiltinResourcesLocation(_caller: Component, _request: FsGetBuiltinResourcesLocationRequest): Promise<FsGetBuiltinResourcesLocationResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export function getConfigLocation(_caller: Component, _request: FsGetConfigLocationRequest): Promise<FsGetConfigLocationResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function openDirectorySelector(caller: Component, request: FsOpenDirectorySelectorRequest): Promise<FsOpenDirectorySelectorResponse> {
    try {
        return (await pickDirectory({
            requestLongTermAccess: true
        })).uri;
    } catch {
        throw createError(ErrorCode.RequestCancelled);
    }
}
