const kit = await import("./rpcsx-ui-kit/build/main.js");
const options = { rootDir: import.meta.dirname, distDir: `${import.meta.dirname}/electron/build` };

try {
    await kit.build(options);
} catch (e) {
    console.error(e);
    process.exit(1);
}
