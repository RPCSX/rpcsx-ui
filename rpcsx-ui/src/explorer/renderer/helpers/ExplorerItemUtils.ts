import { Region } from '$/Region';
import { ImageResolution } from '$core/enums';
import { getLocalizedString } from '$core/Localized';

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
    return getLocalizedString(item.name, langs);
}

export function getIcon(item: ExplorerItem, resolution: ImageResolution = ImageResolution.Normal, langs: string[] = []) {
    if (!item.icon) {
        return undefined;
    }

    return getLocalizedImage(item.icon, resolution, langs);
}

export function getLocalizedImage(icon: LocalizedImage[], resolution: ImageResolution = ImageResolution.Normal, langs: string[] = []) {
    if (icon.length == 0) {
        return undefined;
    }

    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let iconIndex = 0; iconIndex < icon.length; ++iconIndex) {
            const localizedIcon = icon[iconIndex];
            if (localizedIcon.lang === lang && localizedIcon.resolution === resolution) {
                return localizedIcon.uri;
            }
        }
    }

    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let iconIndex = 0; iconIndex < icon.length; ++iconIndex) {
            const localizedIcon = icon[iconIndex];
            if (localizedIcon.lang === lang) {
                return localizedIcon.uri;
            }
        }
    }

    return icon[0].uri;
}

