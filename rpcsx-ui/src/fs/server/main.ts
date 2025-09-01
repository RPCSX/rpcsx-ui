import * as fs from './fs';

export async function activate() {
    await fs.initialize();
}
export async function deactivate() {
    await fs.uninitialize();
}

export async function handleOpen(caller: Component, request: FsOpenRequest) {
    return fs.open(caller, request);
}

export async function handleReadToString(caller: Component, request: FsReadToStringRequest) {
    return fs.readToString(caller, request);
}
export async function handleWriteString(caller: Component, request: FsWriteStringRequest) {
    return fs.writeString(caller, request);
}

export async function handleReadDir(caller: Component, request: FsReadDirRequest) {
    return fs.readDir(caller, request);
}

export async function handleStat(caller: Component, request: FsStatRequest) {
    return fs.stat(caller, request);
}

export function handleGetBuiltinResourcesLocation(caller: Component, request: FsGetBuiltinResourcesLocationRequest) {
    return fs.getBuiltinResourcesLocation(caller, request);
}

export function handleGetConfigLocation(caller: Component, request: FsGetConfigLocationRequest) {
    return fs.getConfigLocation(caller, request);
}

export function handleOpenDirectorySelector(caller: Component, request: FsOpenDirectorySelectorRequest) {
    return fs.openDirectorySelector(caller, request);
}
