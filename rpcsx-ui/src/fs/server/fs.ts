import { createError } from "$core/Error";

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

export async function readDir(_caller: Component, _request: FsReadDirRequest): Promise<FsReadDirResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}

export async function stat(_caller: Component, _request: FsStatRequest): Promise<FsStatResponse> {
    throw createError(ErrorCode.InternalError, "not implemented");
}
