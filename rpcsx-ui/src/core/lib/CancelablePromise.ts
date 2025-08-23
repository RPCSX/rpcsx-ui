export interface CancelablePromise<T> extends Promise<T> {
    cancel(): void;
}
