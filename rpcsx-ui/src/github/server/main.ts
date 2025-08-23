import { Component } from '$core/Component';
import * as impl from './impl';

export async function handleReleasesLatest(_caller: Component, params: GithubReleasesLatestRequest): Promise<GithubReleasesLatestResponse> {
    return impl.fetchReleasesLatest(params);
}

export async function handleReleases(_caller: Component, params: GithubReleasesRequest): Promise<GithubReleasesResponse> {
    return impl.fetchReleases(params);
}
