import { Component } from '$core/Component';
import * as github from './github';

export async function handleReleasesLatest(_caller: Component, params: GithubReleasesLatestRequest): Promise<GithubReleasesLatestResponse> {
    return github.fetchReleasesLatest(params);
}

export async function handleReleases(_caller: Component, params: GithubReleasesRequest): Promise<GithubReleasesResponse> {
    return github.fetchReleases(params);
}
