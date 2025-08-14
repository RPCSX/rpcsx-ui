import { defineConfig, Plugin } from "vite";
import { rpcsx } from "rpcsx-ui-kit/build/main";

export default defineConfig(async () => ({
    plugins: [
        rpcsx() as Promise<Plugin[]>,
    ],
    build: {
        target: "esnext",
        minify: false
    }
}));

