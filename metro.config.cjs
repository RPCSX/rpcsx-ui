const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(path.join(__dirname));

const kit = require(`./rpcsx-ui-kit/build/main.js`);

const options = { rootDir: path.join(__dirname) };
const generatedWorkspacePromise = kit.generate(options);
module.exports = async () => {
    const generatedWorkspace = await generatedWorkspacePromise;
    const resolver = await kit.createResolver(generatedWorkspace);
    await kit.buildGenerated(options, generatedWorkspace.workspace, resolver);

    if (config.resolver) {
        config.resolver.resolveRequest = (context, moduleName, platform) => {
            const result = resolver(moduleName, context.originModulePath, platform);

            if (result) {
                return {
                    type: 'sourceFile',
                    filePath: result
                };
            }

            return context.resolveRequest(context, moduleName, platform);
        };
    }

    return config;
};
