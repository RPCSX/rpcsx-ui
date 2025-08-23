// Explorer types for React conversion

export interface ExplorerItem {
    name: string | Array<{ lang: string; text: string }>;
    publisher: string;
    version: string;
    titleId?: string;
    size?: number;
    contentId?: string;
    icon?: string | Array<{ lang: string; resolution: ExplorerIconResolution; uri: string }>;
    // Add other properties as needed
}

export enum ExplorerIconResolution {
    Normal = "Normal"
}

export interface ExplorerItemFilter {
    // Define filter properties as needed
    [key: string]: unknown;
}

export interface FileHelper {
    humanFileSize: (bytes: number, si: boolean) => string;
}

// Mock FileHelper for now
export const FileHelper: FileHelper = {
    humanFileSize: (bytes: number, si: boolean = false) => {
        const thresh = si ? 1000 : 1024;
        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        const units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while (Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1) + ' ' + units[u];
    }
};

export enum Region {
    Unknown = "Unknown",
    Europe = "Europe", 
    Asia = "Asia",
    World = "World",
    Japan = "Japan",
    Korea = "Korea",
    USA = "USA"
}

export function getRegion(contentId?: string): Region {
    if (contentId === undefined || contentId.length !== 36) {
        return Region.Unknown;
    }

    switch (contentId[0]) {
        case 'E': return Region.Europe;
        case 'H': return Region.Asia;
        case 'I': return Region.World;
        case 'J': return Region.Japan;
        case 'K': return Region.Korea;
        case 'U': return Region.USA;
        default:
            return Region.Unknown;
    }
}

export function getName(item: ExplorerItem, langs: string[] = []): string {
    if (!Array.isArray(item.name)) {
        return item.name;
    }

    for (const lang of langs) {
        for (const name of item.name) {
            if (name.lang === lang) {
                return name.text;
            }
        }
    }

    // Return first available name if no language match
    return item.name.length > 0 ? item.name[0].text : '';
}

export function getIcon(item: ExplorerItem, resolution: ExplorerIconResolution = ExplorerIconResolution.Normal, langs: string[] = []): string | undefined {
    if (!item.icon) {
        return undefined;
    }

    if (!Array.isArray(item.icon)) {
        return item.icon;
    }

    for (const lang of langs) {
        for (const icon of item.icon) {
            if (icon.lang === lang && icon.resolution === resolution) {
                return icon.uri;
            }
        }
    }

    for (const lang of langs) {
        for (const icon of item.icon) {
            if (icon.lang === lang) {
                return icon.uri;
            }
        }
    }

    return item.icon[0]?.uri;
}
