
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

export function getLocalizedResource(resources: LocalizedResource[], langs: string[] = []) {
    if (resources.length == 0) {
        return undefined;
    }

    for (let langIndex = 0; langIndex < langs.length; ++langIndex) {
        const lang = langs[langIndex];

        for (let resourceIndex = 0; resourceIndex < resources.length; ++resourceIndex) {
            const localizedResource = resources[resourceIndex];
            if (localizedResource.lang === lang) {
                return localizedResource.uri;
            }
        }
    }

    return resources[0].uri;
}
