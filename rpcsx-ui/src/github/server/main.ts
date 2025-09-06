import * as github from './github';

export async function handleReleasesLatest(_caller: ComponentRef, params: GithubReleasesLatestRequest): Promise<GithubReleasesLatestResponse> {
    return github.fetchReleasesLatest(params);
}

export async function handleReleases(_caller: ComponentRef, params: GithubReleasesRequest): Promise<GithubReleasesResponse> {
    return github.fetchReleases(params);
}
