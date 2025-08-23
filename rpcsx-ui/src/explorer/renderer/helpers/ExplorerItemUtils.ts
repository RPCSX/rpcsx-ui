import { Region } from '$/Region';
import { IconResolution } from '$core/enums';
import { getLocalizedString, getLocalizedIcon } from '$core/Localized';

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

export function getIcon(item: ExplorerItem, resolution: IconResolution = IconResolution.Normal, langs: string[] = []) {
    if (!item.icon) {
        return undefined;
    }

    return getLocalizedIcon(item.icon, resolution, langs);
}

