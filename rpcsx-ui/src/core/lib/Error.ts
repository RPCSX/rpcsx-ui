export function createError(code: ErrorCode, message?: string): ErrorInstance {
    return { code, message };
}
