import { createError } from "$core/Error";


export async function fetchReleasesLatest(_params: GithubReleasesLatestRequest): Promise<GithubReleasesLatestResponse> {
    throw createError(ErrorCode.InternalError, "Method not implemented");
}

export async function fetchReleases(params: GithubReleasesRequest): Promise<GithubReleasesResponse> {
    throw createError(ErrorCode.InternalError, "Method not implemented");
}
