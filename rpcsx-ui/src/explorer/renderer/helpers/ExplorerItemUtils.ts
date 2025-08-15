import { Region } from 'models/Region';

export function getRegion(contentId?: string) {
    if (contentId === undefined || contentId.length != 36) {
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

export function getName(item: ExplorerItem, langs: string[] = []) {
    if (!Array.isArray(item.name)) {
        return item.name;
    }

    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let nameIndex = 0; nameIndex < item.name.length; ++nameIndex) {
            if (item.name[nameIndex].lang === lang) {
                return item.name[nameIndex].text;
            }
        }
    }

    return item.name[0].text;
}

export function getIcon(item: ExplorerItem, resolution: IconResolution = 'normal', langs: string[] = []) {
    if (!item.icon) {
        return undefined;
    }

    if (!Array.isArray(item.icon)) {
        return item.icon;
    }

    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let iconIndex = 0; iconIndex < item.icon.length; ++iconIndex) {
            const icon = item.icon[iconIndex];
            if (icon.lang === lang && icon.resolution === resolution) {
                return icon.uri;
            }
        }
    }

    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let iconIndex = 0; iconIndex < item.icon.length; ++iconIndex) {
            const icon = item.icon[iconIndex];
            if (icon.lang === lang) {
                return icon.uri;
            }
        }
    }

    return item.icon[0].uri;
}

