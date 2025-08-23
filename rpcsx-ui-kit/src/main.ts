import { glob } from 'glob';
import * as esbuild from 'esbuild';
import * as path from './path.js';

import {
    ComponentGenerator,
    ConfigGenerator,
    preloadGenerator,
    ProjectGenerator,
    RpcsxKit,
    RendererApiGenerator,
    ReactRendererGenerator,
    TsConfigGenerator,
    TsLibGenerator,
    TsProjectInfo,
    TsServerGenerator,
    TsServerMainGenerator,
    Workspace
} from './generators.js';

export type BuildOptions = {
    rootDir?: string;
    outDir?: string;
    buildDir?: string;
    distDir?: string;
};

function getPaths(options: BuildOptions) {
    const cwd = process.cwd();
    const rootDir = path.toUnix(options.rootDir ? path.resolve(cwd, options.rootDir) : cwd);
    const outDir = options.outDir ? path.resolve(cwd, options.outDir) : path.join(rootDir, ".rpcsx-ui-kit");
    const buildDir = options.buildDir ? path.resolve(cwd, options.buildDir) : path.join(outDir, "build");
    const distDir = options.distDir ? path.resolve(cwd, options.distDir) : path.join(rootDir, "build");

    return {
        projectRootDir: rootDir,
        outDir,
        buildDir,
        distDir,
    };
}

export type GeneratedWorkspace = {
    workspace: Workspace;
    tsProjects: TsProjectInfo[];
};

export type Resolver = ((source: string, importer: string, platform: string) => string | undefined);

export async function generate(options: BuildOptions & { noCommit?: boolean }): Promise<GeneratedWorkspace> {
    const paths = getPaths(options);
    const tsProjectInfos: TsProjectInfo[] = [];

    const rendererGenerator = new ReactRendererGenerator(paths);

    const projectGenerators: ProjectGenerator[] = [
        new TsServerGenerator(paths),
        new TsLibGenerator(paths),
        new RendererApiGenerator(paths),
        rendererGenerator,
        preloadGenerator,
    ];

    const configGenerators: ConfigGenerator[] = [
        new TsConfigGenerator({ ...paths, projectInfos: tsProjectInfos })
    ];

    const componentGenerators: ComponentGenerator[] = [
        rendererGenerator,
        new TsServerMainGenerator(paths),
    ];

    const kit = new RpcsxKit(projectGenerators, componentGenerators, configGenerators);
    const workspace = await kit.generate([paths.projectRootDir]);

    if (!options.noCommit) {
        await kit.commit();
    }

    return {
        workspace,
        tsProjects: tsProjectInfos
    };
}

export async function createResolver(workspace: GeneratedWorkspace): Promise<Resolver> {
    const fileMap: Record<string, Record<string, string[]> | undefined> = {};

    await Promise.all(workspace.tsProjects.map(async info => {
        const excludeFiles = await glob(info.exclude, { absolute: true, nodir: true });
        const files = (await glob(info.include, { absolute: true, nodir: true })).filter(path => !excludeFiles.includes(path));
        Object.keys(info.paths).filter(path => path.endsWith("*")).forEach(path => delete info.paths[path]);

        files.forEach(file => {
            fileMap[path.toUnix(file)] = info.paths;
        });
    }));

    const canResolveForPlatform = (source: string) =>
        !source.endsWith(".ts") &&
        !source.endsWith(".js") &&
        !source.endsWith(".tsx") &&
        !source.endsWith(".jsx");
    
    const ext = ["", ".ts", ".js", ".tsx", ".jsx"];

    const resolveImpl = (source: string, importer: string, platform: string) => {
        importer = path.toUnix(importer);

        const paths = fileMap[importer];

        if (!paths) {
            return undefined;
        }

        {
            const filePath = paths[source];
            if (filePath && filePath.length == 1) {
                return filePath[0];
            }
        }

        for (const projectPath in paths) {
            if (!source.startsWith(projectPath)) {
                continue;
            }

            const testPaths = paths[projectPath];
            const relativeSource = source.slice(projectPath.length);

            const resolve = (relativeSource: string) => {
                const prefix = testPaths.find(testPath => path.join(testPath, relativeSource) in fileMap);

                if (prefix == undefined) {
                    return undefined;
                }

                // console.log(`resolve: using prefix ${prefix} to resolve ${relativeSource} (${source}), file ${path.join(prefix, relativeSource)}`);
                return path.join(prefix, relativeSource);
            };

            if (!canResolveForPlatform(relativeSource)) {
                const result = resolve(relativeSource);

                if (!result && relativeSource.endsWith(".js")) {
                    return resolve(relativeSource.slice(0, -3) + ".ts");
                }

                return result;
            }

            for (let i = 0; i < ext.length; ++i) {
                const resolved = resolve(relativeSource + (platform ? platform : "") + ext[i]);
                if (resolved) {
                    return resolved;
                }
            }
        }

        return undefined;
    };

    return (source: string, importer: string, platform: string) => {
        if (source.startsWith("./")) {
            source = path.resolve(path.parse(importer).dir, source);

            if (source in fileMap) {
                return source;
            }

            platform = "." + platform;

            for (let i = 0; i < ext.length; ++i) {
                const testSource = source + platform + ext[i];

                if (testSource in fileMap) {
                    return path.toNative(testSource);
                }
            }

            for (let i = 0; i < ext.length; ++i) {
                const testSource = source + ext[i];

                if (testSource in fileMap) {
                    return path.toNative(testSource);
                }
            }

            return undefined;
        }

        if (canResolveForPlatform(source)) {
            const resolved = resolveImpl(source, importer, "." + platform);
            if (resolved) {
                return path.toNative(resolved);
            }
        }

        return resolveImpl(source, importer, "");
    };
}

function plugin(resolver: Resolver): esbuild.Plugin[] {
    return [
        {
            name: "rpcsx",
            setup(build) {
                build.onResolve({
                    filter: /./
                }, (args) => {
                    if (args.importer.length == 0) {
                        return {
                            path: args.path
                        };
                    }

                    const resolved = resolver(args.path, args.importer, "web");

                    return {
                        pluginName: "rpcsx",
                        path: resolved,
                    };
                });
            },
        }
    ];
}

export async function buildGenerated(options: BuildOptions, workspace: Workspace, resolver: Resolver) {
    const paths = getPaths(options);
    const esbuildPlugin = plugin(resolver);

    const enums = Object.values(workspace)
        .filter(component => "lib" in component.projects && "server" in component.projects && component.projects.server.rootDir != "")
        .map(component => path.join(paths.outDir, component.manifest.name, "lib", "src", "enums.ts"));

    const serverPromise = esbuild.build({
        outdir: path.join(paths.distDir),
        entryPoints: [
            path.join(workspace["rpcsx-ui-server"].projects["server-main"].rootDir, "main.ts")
        ],
        plugins: [...esbuildPlugin],
        inject: enums,
        packages: 'external',
        bundle: true,
        platform: 'node',
        format: 'esm',
        sourcemap: 'both',
    });

    const preloadPromise = esbuild.build({
        outdir: path.join(paths.distDir),
        entryPoints: [
            path.join(workspace["core"].projects["renderer"].rootDir, "preload", "preload.ts")
        ],
        plugins: [...esbuildPlugin],
        inject: enums,
        packages: 'external',
        bundle: true,
        platform: 'neutral',
        format: 'cjs',
        sourcemap: 'both',
    });


    const server = await serverPromise;

    if (server.errors.length > 0) {
        throw new AggregateError(server.errors);
    }

    const preload = await preloadPromise;

    if (preload.errors.length > 0) {
        throw new AggregateError(preload.errors);
    }
}

export async function build(options: BuildOptions) {
    const paths = getPaths(options);
    const generatedWorkspace = await generate(paths);
    const resolver = await createResolver(generatedWorkspace);

    return buildGenerated(paths, generatedWorkspace.workspace, resolver);
}

export async function watch(options: BuildOptions) {
    const paths = getPaths(options);
    const generatedWorkspace = await generate(paths);
    const resolver = await createResolver(generatedWorkspace);
    const esbuildPlugin = plugin(resolver);

    const enums = Object.values(generatedWorkspace.workspace)
        .filter(component => "lib" in component.projects && "server" in component.projects && component.projects.server.rootDir != "")
        .map(component => path.join(paths.outDir, component.manifest.name, "lib", "src", "enums.ts"));

    const serverContext = await esbuild.context({
        outdir: path.join(paths.distDir),
        entryPoints: [
            path.join(generatedWorkspace.workspace["rpcsx-ui-server"].projects["server-main"].rootDir, "main.ts")
        ],
        plugins: [...esbuildPlugin],
        inject: enums,
        packages: 'external',
        bundle: true,
        platform: 'node',
        format: 'esm',
        sourcemap: 'both',
    });

    const preloadContext = await esbuild.context({
        outdir: path.join(paths.distDir),
        entryPoints: [
            path.join(generatedWorkspace.workspace["core"].projects["renderer"].rootDir, "preload", "preload.ts")
        ],
        plugins: [...esbuildPlugin],
        inject: enums,
        packages: 'external',
        bundle: true,
        platform: 'neutral',
        format: 'cjs',
        sourcemap: 'both',
    });

    const serverPromise = serverContext.watch();
    const preloadPromise = preloadContext.watch();

    await serverPromise;
    await preloadPromise;
}

