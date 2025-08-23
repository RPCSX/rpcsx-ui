
import * as self from '$';
import http from 'https';

type CacheEntry = {
    timestamp: number;
    content: string;
};

const cache: Record<string, CacheEntry> = {};
const invalidationPeriodMs = 10 * 60000;

function get(url: string) {
    const currentTime = Date.now();
    const cacheEntry = cache[url];
    if (cacheEntry && cacheEntry.timestamp < currentTime && currentTime - cacheEntry.timestamp < invalidationPeriodMs) {
        return cacheEntry.content;
    }

    return new Promise<string>((resolve, reject) => {
        http.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, res => {
            let content = '';
            res.on("data", chunk => {
                content += chunk;
            });

            res.on('error', e => {
                reject(e);
            });

            res.on('end', () => {
                try {
                    cache[url] = {
                        timestamp: Date.now(),
                        content
                    };

                    setTimeout(() => {
                        const currentTime = Date.now();
                        const cacheEntry = cache[url];
                        if (currentTime - cacheEntry.timestamp >= invalidationPeriodMs) {
                            delete cache[url];
                        }
                    }, invalidationPeriodMs);
                    resolve(content);
                } catch (e) {
                    reject(e);
                }
            });
        });
    });
}

export async function fetchReleasesLatest(params: GithubReleasesLatestRequest): Promise<GithubReleasesLatestResponse> {
    const url = `${(await self.settings.getUrl()).value}/repos/${params.owner}/${params.repository}/releases/latest`;

    const content = await get(url);
    return { release: JSON.parse(content) as GithubRelease };
}

export async function fetchReleases(params: GithubReleasesRequest): Promise<GithubReleasesResponse> {
    const url = `${(await self.settings.getUrl()).value}/repos/${params.owner}/${params.repository}/releases`;

    const content = await get(url);
    return { releases: JSON.parse(content) as Array<GithubRelease> };
}
