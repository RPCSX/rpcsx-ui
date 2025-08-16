import esbuild from 'esbuild';
import { parseArgs } from 'util';


const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        dev: {
            type: 'boolean',
            short: 'd',
            default: false
        },
        watch: {
            type: 'boolean',
            short: 'w',
            default: false
        }
    },
    allowPositionals: true
});

const options = {
    bundle: true,
    minify: values.dev == false,
    packages: 'external',
    platform: 'neutral',
    format: 'esm',
    sourcemap: values.dev ? 'linked' : undefined,
    outdir: "build",
    entryPoints: ["src/main.ts"]
};

try {
    if (values.watch) {
        const context = await esbuild.context(options);
        await context.watch();
    } else {
        await esbuild.build(options);
    }
} catch (e) {
    console.error(e);
    process.exit(1);
}