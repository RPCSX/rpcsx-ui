
export function getLocalizedString(string: LocalizedString[], langs: string[] = []) {
    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let nameIndex = 0; nameIndex < string.length; ++nameIndex) {
            if (string[nameIndex].lang === lang) {
                return string[nameIndex].text;
            }
        }
    }

    return string[0].text;
}

export function getLocalizedIcon(icon: LocalizedIcon[], resolution: IconResolution = IconResolution.Normal, langs: string[] = []) {
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
