import * as posix_path from 'path/posix';
import * as native_path from 'path';

export const sep = posix_path.sep;

export function toUnix(path: string) {
    return native_path.sep == posix_path.sep ? path : path.replaceAll(native_path.sep, posix_path.sep);
}

export function toNative(path: string) {
    return native_path.sep == posix_path.sep ? path : path.replaceAll(posix_path.sep, native_path.sep);
}

export function resolve(...paths: string[]) {
    return native_path.sep == posix_path.sep ? native_path.resolve(...paths) : toUnix(native_path.resolve(...paths.map(x => toNative(x))));
}

export function join(...paths: string[]) {
    return native_path.sep == posix_path.sep ? native_path.join(...paths) : toUnix(native_path.join(...paths.map(x => toNative(x))));
}

export function relative(from: string, to: string) {
    return native_path.sep == posix_path.sep ? native_path.relative(from, to) : toUnix(native_path.relative(toNative(from), toNative(to)));
}

export function parse(path: string) {
    if (native_path.sep == posix_path.sep)
        return native_path.parse(path);

    const result = native_path.parse(toNative(path));
    result.dir = toUnix(result.dir);
    return result;
}
