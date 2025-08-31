export function join(...a: string[]) {
    return a.join("/");
}

export function toURI(path: string) {
    path = path.replaceAll("\\", "/")

    if (path.startsWith("/")) {
        return "file://" + path;
    } else {
        return "file:///" + path;
    }
}
