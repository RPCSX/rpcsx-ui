import { ErrorCode, Error } from "$/types";
export { ErrorCode, Error } from "$/types";

export function createError(code: ErrorCode, message?: string): Error {
    return { code, message };
}
