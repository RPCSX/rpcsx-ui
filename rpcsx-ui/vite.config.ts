import { defineConfig, Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { rpcsx } from "rpcsx-ui-kit/build/main";

export default defineConfig(async () => ({
    plugins: [
        tailwindcss(),
        rpcsx() as Promise<Plugin[]>,
    ],
    build: {
        target: "esnext",
        minify: false,
    }
}));
