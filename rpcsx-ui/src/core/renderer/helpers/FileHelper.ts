export class FileHelper {
    public static humanFileSize(bytes: number, si: boolean = true, dp: number = 1): string {
        const threshold = si ? 1000 : 1024;

        if (Math.abs(bytes) < threshold) {
            return bytes + ' B';
        }

        const units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10 ** dp;

        do {
            bytes /= threshold;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= threshold && u < units.length - 1);

        return bytes.toFixed(dp) + ' ' + units[u];
    }
}
