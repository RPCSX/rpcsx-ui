export type Window = {
    pushView: (name: string, props: any) => void | Promise<void>;
    setView: (name: string, props: any) => void | Promise<void>;
    popView: () => void | Promise<void>;
};
