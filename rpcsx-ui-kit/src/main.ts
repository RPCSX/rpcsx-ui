#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as posix_path from 'path/posix';
import * as native_path from 'path';
import { Plugin } from 'vite';
import { sveltekit } from "@sveltejs/kit/vite";
import { Stats } from 'fs';
import { glob } from 'glob';
import * as esbuild from 'esbuild';

export type Dependency = {
    name: string;
    version?: string;
};

export type ComponentInfo = Dependency & {
    capabilities?: Record<string, any>;
    contributions?: Record<string, any>,
    dependencies?: Dependency[];
};


type Timestamp = { timestamp: number };

type FileWithTimestamp = Timestamp & {
    content: string;
};

type Project = {
    name: string;
    rootDir: string;
    component: Component;
    dependencies: Project[];
    include: string[];
    exclude: string[];
};

type Component = {
    workspace: Workspace;
    path: string;
    manifestFile: FileWithTimestamp;
    manifest: ComponentInfo;
    projects: Record<string, Project>;
    dependencies: Component[];
};

type Workspace = Record<string, Component>;

type ProjectGenerator = {
    name: string;
    projectId: string;
    shouldImport?(projectId: string): boolean;
    generateProjects?(project: Project, fileDb: FileDb): Promise<(Project | undefined)[]>;
};

type ComponentGenerator = {
    name: string;
    projectId: string;
    generateComponents(workspace: Workspace, fileDb: FileDb): Promise<(Component | undefined)[]>;
};

type ConfigGenerator = {
    processProject?(project: Project, fileDb: FileDb): Promise<void> | void;
    processComponent?(component: Component, fileDb: FileDb): Promise<void> | void;
    processWorkspace?(workspace: Workspace, fileDb: FileDb): Promise<void> | void;
}

type ContributionGenerator = {
    generateType?(component: string, type: object, name: string): void | Promise<void>;
    generateMethod?(component: string, method: object, name: string): void | Promise<void>;
    generateNotification?(component: string, notification: object, name: string): void | Promise<void>;
    generateEvent?(component: string, event: object, name: string): void | Promise<void>;
    generateView?(component: string, path: string, name: string): void | Promise<void>;
    generateSetting?(component: string, schema: object, name: string): void | Promise<void>;
    toString(): string;
};

type RpcsxKitConfig = {
    projectRootDir: string;
    outDir: string;
    buildDir: string;
    svelteDir: string;
};

const componentManifestName = "component.json";
const generatedHeader = `
///////////////////////////////////////
//  FILE GENERATED, DO NOT EDIT!     //
///////////////////////////////////////
`;

const baseTsConfig = {
    compilerOptions: {
        allowJs: false,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        strictFunctionTypes: true,
        strictNullChecks: true,
        strictPropertyInitialization: true,
        noImplicitAny: true,
        noImplicitOverride: true,
        noImplicitReturns: true,
        noImplicitThis: true,
        noUnusedLocals: true,
        noFallthroughCasesInSwitch: true,
        sourceMap: true,
        strict: true,
        noEmit: false,
        declaration: true,
        composite: true,
        resolveJsonModule: true,
    }
};

function pascalToCamelCase(name: string) {
    return name[0].toLowerCase() + name.slice(1);
}

function generateLabelName(entityName: string, isPascalCase = false) {
    const name = entityName.replaceAll(" ", "-").replaceAll("_", "-").replaceAll(".", "-").replaceAll("/", "-").split("-");
    return [...(isPascalCase ? name[0][0].toUpperCase() + name[0].slice(1).toLowerCase() : name[0].toLowerCase()), ...name.slice(1).map(word => {
        if (word.length == 0) {
            return word;
        }
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })].reduce((a, b) => a + b);
}

function generateComponentLabelName(componentName: string, entityName: string, isPascalCase = false) {
    return generateLabelName(componentName == 'core' ? entityName : `${componentName}/${entityName}`, isPascalCase);
}

function pathToUnix(path: string) {
    return native_path.sep == posix_path.sep ? path : path.replaceAll(native_path.sep, posix_path.sep);
}

function pathToNative(path: string) {
    return native_path.sep == posix_path.sep ? path : path.replaceAll(posix_path.sep, native_path.sep);
}

function pathResolve(...paths: string[]) {
    return native_path.sep == posix_path.sep ? native_path.resolve(...paths) : pathToUnix(native_path.resolve(...paths.map(x => pathToNative(x))));
}

function pathJoin(...paths: string[]) {
    return native_path.sep == posix_path.sep ? native_path.join(...paths) : pathToUnix(native_path.join(...paths.map(x => pathToNative(x))));
}

function pathRelative(from: string, to: string) {
    return native_path.sep == posix_path.sep ? native_path.relative(from, to) : pathToUnix(native_path.relative(pathToNative(from), pathToNative(to)));
}

function pathParse(path: string) {
    if (native_path.sep == posix_path.sep)
        return native_path.parse(path);

    const result = native_path.parse(pathToNative(path));
    result.dir = pathToUnix(result.dir);
    return result;
}

function mergeConfig<O, M>(original: O, modification: M) {
    if (modification === undefined) {
        return original;
    }

    if (original === undefined) {
        return modification;
    }

    if (Array.isArray(original)) {
        if (!Array.isArray(modification)) {
            return modification;
        }

        return [
            ...original,
            ...modification
        ];
    }

    if (typeof original === "object") {
        if (typeof modification !== "object") {
            return modification;
        }

        if (original === null) {
            return modification;
        }

        if (modification === null) {
            return null;
        }

        const result: Record<string, unknown> = {};

        for (const key in original) {
            if (key in modification) {
                continue;
            }

            result[key] = original[key];
        }

        for (const key in modification) {
            if (key in original) {
                result[key] = mergeConfig((original as Record<string, unknown>)[key], modification[key]);
            } else {
                result[key] = modification[key];
            }
        }

        return result;
    }

    return modification;
}

function mergeTimestamps<T extends Timestamp>(timestamps: T[]) {
    return timestamps.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
}
async function calcTimestamp(path: string[] | string): Promise<Timestamp> {
    if (typeof path === 'string') {
        return { timestamp: (await fs.stat(pathToNative(path))).mtimeMs };
    }

    return { timestamp: (await Promise.all(path.map(async x => (await fs.stat(pathToNative(x))).mtimeMs))).reduce((x, y) => Math.max(x, y)) };
}

class FileDb {
    private generated: Record<string, FileWithTimestamp> = {};
    private cache: Record<string, FileWithTimestamp> = {};
    private selfTimestamp: number | undefined = undefined;

    private createFileImpl(path: string) {
        // console.log(`filedb: creating ${path}`);
        this.generated[path] = { content: "", timestamp: 0 };
        return this.generated[path];
    }

    async readFile(path: string, ts?: Timestamp) {
        const fileTimestamp = ts ? ts.timestamp : (await fs.stat(pathToNative(path))).mtimeMs;
        const cached = this.cache[path];

        if (fileTimestamp <= cached?.timestamp) {
            // console.log(`filedb: reading cached ${path}`);
            return cached;
        }

        // console.log(`filedb: reading ${path}`);
        const content = await fs.readFile(pathToNative(path), "utf8");
        if (!cached) {
            const result = {
                content,
                timestamp: fileTimestamp
            };
            this.cache[path] = result;
            return result;
        }

        cached.content = content;
        cached.timestamp = fileTimestamp;
        return cached;
    }

    createFile(path: string, sourceTimestamp: Timestamp): Promise<FileWithTimestamp | undefined>;
    createFile(path: string): Promise<FileWithTimestamp>;
    async createFile(filePath: string, sourceTimestamp: Timestamp | undefined = undefined) {
        if (filePath in this.generated) {
            throw new Error(`file '${filePath}' was already generated`);
        }

        if (!sourceTimestamp) {
            return this.createFileImpl(filePath);
        }

        let stat: Stats;

        try {
            stat = await fs.stat(pathToNative(filePath));
        } catch {
            return this.createFileImpl(filePath);
        }

        if (this.selfTimestamp == undefined) {
            try {
                this.selfTimestamp = (await fs.stat(import.meta.filename)).mtimeMs;
            } catch {
                this.selfTimestamp = 0;
            }
        }

        const timestamp = Math.max(sourceTimestamp.timestamp, this.selfTimestamp);

        if (timestamp > 0 && stat.mtimeMs > timestamp) {
            // console.log(`filedb: skipping ${path}`);
            return undefined;
        }

        return this.createFileImpl(filePath);
    }

    async commit() {
        const files = (await Promise.all(Object.keys(this.generated).map(async path => {
            const file = this.generated[path];

            if (file.timestamp > 0 && (await calcTimestamp(path)).timestamp >= file.timestamp) {
                return undefined;
            }

            return { ...file, path };
        }))).filter(file => file != undefined);

        const dirs = new Set<string>();

        files.forEach(file => {
            dirs.add(pathParse(file.path).dir);
        });

        await Promise.all([...dirs].map(async dir => {
            await fs.mkdir(pathToNative(dir), { recursive: true });
        }));

        await Promise.all(files.map(async file => {
            await fs.writeFile(pathToNative(file.path), file.content, "utf8");
            this.cache[file.path] = {
                content: file.content,
                timestamp: Date.now()
            };
        }));

        this.generated = {};
    }

    dump() {
        const files = (Object.keys(this.generated).map(path => {
            return { ...this.generated[path], path };
        }));

        files.forEach(file => {
            console.log(file.path, file.content);
        });
    }

    clear() {
        this.generated = {};
    }
}

function shouldIgnoreDir(name: string) {
    if (name.startsWith('.')) {
        return true;
    }

    return [
        "node_modules", "build", "out"
    ].includes(name);
}

async function parseManifest(fileDb: FileDb, manifestPath: string, projectIds: string[]): Promise<undefined | Component> {
    const componentRootDir = pathParse(manifestPath).dir;

    try {
        const manifestFile = await fileDb.readFile(manifestPath);
        const manifest = JSON.parse(manifestFile.content) as ComponentInfo;

        const component: Component = {
            path: componentRootDir,
            manifestFile,
            manifest,
            projects: {},
            dependencies: [],
            workspace: {}
        };

        for (const projects of await fs.readdir(pathToNative(componentRootDir), { recursive: false, withFileTypes: true })) {
            if (!projects.isDirectory()) {
                continue;
            }

            if (!projectIds.includes(projects.name)) {
                throw Error(`${manifest.name}: unknown project ${projects.name}`);
            }

            component.projects[projects.name] = {
                name: projects.name,
                rootDir: pathJoin(projects.parentPath, projects.name),
                component,
                dependencies: [],
                include: [],
                exclude: [],
            };
        }

        // add dummy lib if it not exists, we can generate types later
        const libProject = "lib";
        if (!(libProject in component.projects)) {
            component.projects[libProject] = {
                name: libProject,
                rootDir: pathJoin(componentRootDir, libProject),
                component,
                dependencies: [],
                include: [],
                exclude: [],
            };
        }

        // renderer with views provides api for server, create dummy server if it not exists
        const serverProject = "server";
        if ("renderer" in component.projects) {
            const project = component.projects.renderer;
            const srcDir = pathJoin(project.rootDir, "views");
            const views: Record<string, string> = {};

            try {
                for (const view of await fs.readdir(pathToNative(srcDir), { recursive: false, withFileTypes: true })) {
                    if (!view.isFile()) {
                        continue;
                    }

                    const parsedName = pathParse(view.name);

                    if (parsedName.ext === ".svelte" && parsedName.name.length > 0) {
                        const viewName = parsedName.name;
                        const viewPath = pathJoin(view.parentPath, view.name);
                        views[viewName] = viewPath;
                    }
                }
            } catch { }

            // populate views contributions, so we can handle them later
            if (Object.keys(views).length > 0) {
                component.manifest.contributions ??= {};
                component.manifest.contributions["views"] = views;

                if (!(serverProject in component.projects)) {
                    component.projects[serverProject] = {
                        name: serverProject,
                        rootDir: "",
                        component,
                        dependencies: [],
                        include: [],
                        exclude: [],
                    };
                }
            }
        }

        return component;
    } catch (e) {
        throw new Error(`failed to read manifest ${manifestPath}: ${e}`);
    }
}


function createServerManifest(manifest: ComponentInfo, workspace: Workspace) {
    const result = { ...manifest };

    result.dependencies = result.dependencies?.filter(dep => {
        const component = workspace[dep.name];

        return component && "server" in component.projects && component.projects.server.rootDir != "";
    });

    return result;
}

class RpcsxKit {
    private fileDb = new FileDb();
    private projectGenerators: Record<string, ProjectGenerator[]> = {};

    constructor(_config: RpcsxKitConfig, projectGenerators: ProjectGenerator[], private configGenerators: ConfigGenerator[], private componentGenerators: ComponentGenerator[]) {
        projectGenerators.forEach(generator => {
            this.projectGenerators[generator.projectId] ??= [];
            this.projectGenerators[generator.projectId].push(generator);
        });
    }

    dump() {
        this.fileDb.dump();
    }

    async generate(roots: string[]) {
        const workspace = await this._generateWorkspace(roots);
        this._resolveComponentDependencies(workspace);

        await Promise.all(Object.values(workspace).map(async component => {
            const generateProjectsPromises = Object.values(component.projects).map(project => {
                const generators = this.projectGenerators[project.name]!;

                return generators.map(async generator => {
                    if (generator.generateProjects) {
                        const result = generator.generateProjects(project, this.fileDb);
                        if (Array.isArray(result)) {
                            return await Promise.all(result);
                        }

                        return await result;
                    }

                    return undefined;
                });
            }).flat();

            const generatedProjects = (await Promise.all(generateProjectsPromises)).flat();

            generatedProjects.forEach(generatedProject => {
                if (generatedProject) {
                    component.projects[generatedProject.name] = generatedProject;
                }
            });
        }));

        const generatedComponents = (await Promise.all(this.componentGenerators.map(generator => generator.generateComponents(workspace, this.fileDb)).flat()));

        generatedComponents.flat().forEach(generatedComponent => {
            if (generatedComponent) {
                workspace[generatedComponent.manifest.name] = generatedComponent;
            }
        });

        // resolve dependencies before config generators, but after projects/components generation
        this._resolveComponentDependencies(workspace);

        await Promise.all(this.configGenerators
            .map(generator => generator.processProject?.bind(generator))
            .filter(generator => generator != undefined)
            .map(generator => Object.values(workspace).map(component => Object.values(component.projects).map(project => generator(project, this.fileDb))))
            .flat(2)
        );

        await Promise.all(this.configGenerators
            .map(generator => generator.processComponent?.bind(generator))
            .filter(generator => generator != undefined)
            .map(generator => Promise.all(Object.values(workspace).map(component => generator(component, this.fileDb))))
            .flat(1)
        );

        await Promise.all(this.configGenerators
            .map(generator => generator.processWorkspace?.bind(generator))
            .filter(generator => generator != undefined)
            .map(generator => generator(workspace, this.fileDb))
        );

        await this.fileDb.commit();
        return workspace;
    }

    private async _generateWorkspace(roots: string[]) {
        const result: Workspace = {};
        const workList: string[] = [];
        const projectIds = Object.keys(this.projectGenerators);

        workList.push(...roots);

        while (true) {
            const dir = workList.pop();

            if (dir === undefined) {
                break;
            }

            for (const item of await fs.readdir(pathToNative(dir), { recursive: false, withFileTypes: true })) {
                if (item.isDirectory()) {
                    if (shouldIgnoreDir(item.name)) {
                        continue;
                    }

                    workList.push(pathJoin(item.parentPath, item.name));
                    continue;
                }

                if (item.name !== componentManifestName) {
                    continue;
                }

                const component = await parseManifest(this.fileDb, pathJoin(item.parentPath, componentManifestName), projectIds);

                if (component) {
                    component.workspace = result;
                    result[component.manifest.name] = component;
                }
            }
        }

        return result;
    }

    private _resolveComponentDependencies(workspace: Workspace) {
        Object.keys(workspace).forEach(componentName => {
            const component = workspace[componentName];

            // populate implicit core component dependency
            if (componentName != "core" && "core" in workspace) {
                component.manifest.dependencies ??= [];
                if (!component.manifest.dependencies.find(dep => dep.name == "core")) {
                    component.manifest.dependencies.push({
                        name: "core"
                    });
                }
            }

            // resolve cross this project dependencies
            Object.values(component.projects).forEach(targetProject => {
                const projectGenerators = this.projectGenerators[targetProject.name];

                if (!projectGenerators) {
                    return;
                }

                Object.values(component.projects).forEach(project => {
                    if (project == targetProject || targetProject.dependencies.find(x => x === project)) {
                        return;
                    }

                    // FIXME: improve shouldImport api
                    const forceImport = project.name == "lib";

                    const shouldImport = forceImport || (projectGenerators && projectGenerators.find(projectGenerator => {
                        const shouldImport = projectGenerator.shouldImport;

                        if (!shouldImport) {
                            return false;
                        }

                        return shouldImport(project.name);
                    }));

                    if (shouldImport) {
                        targetProject.dependencies.push(project);
                    }
                });
            });

            const deps = component.manifest.dependencies;

            if (!deps) {
                return;
            }

            // resolve cross component dependencies
            deps.forEach(dep => {
                const depComponent = workspace[dep.name];

                if (!depComponent) {
                    throw new Error(`${component.manifest.name}: dependency ${dep.name} not found`);
                }

                if (!component.dependencies.find(x => x === depComponent)) {
                    component.dependencies.push(depComponent);
                }

                Object.keys(component.projects).forEach(projectName => {
                    const project = component.projects[projectName];
                    const projectGenerators = this.projectGenerators[projectName];

                    Object.keys(depComponent.projects).forEach(depProjectName => {
                        const depProject = depComponent.projects[depProjectName];

                        if (project.dependencies.find(x => x === depProject)) {
                            return;
                        }

                        // FIXME: improve shouldImport api
                        const forceImport = depProjectName == "lib" || ((project.name == "server" || project.name == "main") && depProjectName == "server-public-api");

                        const shouldImport = forceImport || /*project.name == depProjectName || */(projectGenerators && projectGenerators.find(projectGenerator => {
                            const shouldImport = projectGenerator.shouldImport;

                            if (!shouldImport) {
                                return false;
                            }

                            return shouldImport(depProjectName);
                        }));

                        if (shouldImport) {
                            project.dependencies.push(depProject);
                        }
                    });
                });
            });
        });
    }
}


class EnumsGenerator implements ContributionGenerator {
    generatedTypes: Record<string, string> = {};

    toString() {
        if (Object.keys(this.generatedTypes).length > 0) {
            return Object.keys(this.generatedTypes).map(type => this.generatedTypes[type]).join("\n");
        }

        return `${generatedHeader}\n`;
    }

    generateType(component: string, type: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const typeName = labelName;

        if (typeof type != 'object') {
            throw `${type}: must be object`;
        }
        if (!("type" in type)) {
            throw `${type}: type must be present`;
        }

        if (typeof type.type != "string") {
            throw `${name}: type must be string value`;
        }

        if (!(typeName in this.generatedTypes)) {
            let paramsType = "";
            if (type.type === "enum") {
                if (!("enumerators" in type)) {
                    throw `${type}: enumerators must be present`;
                }

                if ((typeof type.enumerators != 'object') || !type.enumerators) {
                    throw `${type.enumerators}: must be object`;
                }

                paramsType += `export enum ${labelName} {\n${this.generateEnumBody(type.enumerators)}}\n`;
            }

            this.generatedTypes[typeName] = paramsType;
        } else {
            throw new Error(`${name}: type ${typeName} already declared`);
        }
    }

    generateEnumBody(enumerators: object) {
        let body = "";

        Object.keys(enumerators).forEach(fieldName => {
            const value = (enumerators as Record<string, object>)[fieldName];
            body += `  ${generateLabelName(fieldName, true)} = ${value},\n`;
        });

        return body;
    }
};
class TypesGenerator implements ContributionGenerator {
    generatedTypes: Record<string, string> = {};
    imports: Record<string, Set<string>> = {};

    toString() {
        if (Object.keys(this.generatedTypes).length > 0) {
            let result = '';
            result += Object.keys(this.imports).map(from => `import { ${Array.from(this.imports[from]).join(", ")} } from '${from}/types'`).join(';\n');
            if (result.length > 0) {
                result += ";\n";
            }
            result += Object.keys(this.generatedTypes).map(type => this.generatedTypes[type]).join("\n");
            return result;
        }

        return `${generatedHeader}\n`;
    }

    generateType(component: string, type: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const typeName = labelName;

        if (typeof type != 'object') {
            throw `${type}: must be object`;
        }
        if (!("type" in type)) {
            throw `${type}: type must be present`;
        }

        if (typeof type.type != "string") {
            throw `${name}: type must be string value`;
        }

        if (!(typeName in this.generatedTypes)) {
            let paramsType = "";
            if (type.type === "object") {
                if (!("params" in type)) {
                    throw `${type}: params must be present`;
                }

                if ((typeof type.params != 'object') || !type.params) {
                    throw `${type.params}: must be object`;
                }

                paramsType += `type ${labelName} = {\n${this.generateObjectBody(component, type.params)}};\n`;
            } else if (type.type === "enum") {
                if (!("enumerators" in type)) {
                    throw `${type}: enumerators must be present`;
                }

                if ((typeof type.enumerators != 'object') || !type.enumerators) {
                    throw `${type.enumerators}: must be object`;
                }

                paramsType += `enum ${labelName} {\n${this.generateEnumBody(type.enumerators)}}\n`;
            } else {
                paramsType += `type ${labelName} = ${this.getTypeName(component, type.type)};\n`;
            }

            this.generatedTypes[typeName] = paramsType;
        } else {
            throw new Error(`${name}: type ${typeName} already declared`);
        }
    }

    generateMethod(component: string, method: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const requestTypeName = `${labelName}Request`;
        const responseTypeName = `${labelName}Response`;

        if (!(requestTypeName in this.generatedTypes)) {
            let paramsType = `type ${requestTypeName} = `;

            if ("params" in method && method.params && typeof method.params == "object") {
                paramsType += "{\n";
                paramsType += this.generateObjectBody(component, method.params);
                paramsType += "};\n";
            } else {
                paramsType += "undefined;\n";
            }
            this.generatedTypes[requestTypeName] = paramsType;
        } else {
            throw new Error(`${name}: type ${requestTypeName} already declared`);
        }

        if (!(responseTypeName in this.generatedTypes)) {
            let responseType = `type ${responseTypeName} = `;
            if ("returns" in method && method.returns && typeof method.returns == "object") {
                responseType += "{\n";
                responseType += this.generateObjectBody(component, method.returns);
                responseType += "}\n";
            } else {
                responseType += "void;\n";
            }
            this.generatedTypes[responseTypeName] = responseType;
        } else {
            throw new Error(`${name}: type ${responseTypeName} already declared`);
        }
    }

    generateNotification(component: string, notification: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const requestTypeName = `${labelName}Request`;

        if (!(requestTypeName in this.generatedTypes)) {
            let paramsType = `type ${requestTypeName} = `;
            if ("params" in notification && notification.params && typeof notification.params == "object") {
                paramsType += "{\n";
                paramsType += this.generateObjectBody(component, notification.params);
                paramsType += "};\n";
            } else {
                paramsType += "undefined;\n";
            }
            this.generatedTypes[requestTypeName] = paramsType;
        } else {
            throw new Error(`${name}: type ${requestTypeName} already declared`);
        }
    }

    generateEvent(component: string, event: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const typeName = `${labelName}Event`;

        if (!(typeName in this.generatedTypes)) {
            if (typeof event == 'object') {
                const type = this.generateObjectBody(component, event);
                let paramsType = `type ${typeName} = `;
                if (type.length === 0) {
                    // paramsType += "undefined;\n";
                    return;
                } else {
                    paramsType += `{\n${type}\n};\n`;
                }
                this.generatedTypes[typeName] = paramsType;
            } else if (typeof event == 'string') {
                this.generatedTypes[typeName] = `export type ${typeName} = ${this.getTypeName(component, event)};\n`;
            } else {
                throw new Error(`${name}: must be object or string`);
            }
        } else {
            throw new Error(`${name}: type ${typeName} already declared`);
        }
    }

    getTypeName(component: string, type: string, object?: object): string {
        switch (type) {
            case "string":
            case "number":
            case "void":
            case "boolean":
                return type;
            case "json":
                return "Json";
            case "json-object":
                return "JsonObject";
            case "json-array":
                return "JsonArray";

            case "array":
                if (!object || !("item-type" in object) || typeof object["item-type"] != "string") {
                    throw new Error(`item-type must be defined for array`);
                }
                return this.getTypeName(component, object["item-type"]) + '[]';

            default:
                if (type.startsWith("$")) {
                    const [refComponent, ...nameParts] = type.split("/");
                    const typeName = nameParts.join("/");
                    this.imports[refComponent] ??= new Set();
                    this.imports[refComponent].add(typeName);

                    return generateComponentLabelName(refComponent.slice(1), typeName, true);
                }

                return generateComponentLabelName(component, type, true);
        }
    }

    generateEnumBody(enumerators: object) {
        let body = "";

        Object.keys(enumerators).forEach(fieldName => {
            const value = (enumerators as Record<string, object>)[fieldName];
            body += `  ${generateLabelName(fieldName, true)} = ${value},\n`;
        });

        return body;
    }

    generateObjectBody(component: string, params: object) {
        let body = "";

        Object.keys(params).forEach(fieldName => {
            const param = (params as Record<string, object>)[fieldName];
            if (typeof param != 'object') {
                throw `${fieldName}: must be object`;
            }
            if (!("type" in param)) {
                throw `${fieldName}: type must be present`;
            }

            if (typeof param.type != "string") {
                throw `${fieldName}: type must be string value`;
            }

            const isOptional = ("optional" in param) && param.optional === true;

            body += `  ${generateLabelName(fieldName, false)}${isOptional ? "?" : ""}: ${this.getTypeName(component, param.type, param)};\n`;
        });

        return body;
    }
}

class ServerPublicApiGenerator implements ContributionGenerator {

    toString(): string {
        return `${generatedHeader}
import { thisComponent } from "$/component-info";
import { ComponentInstance } from '$core/ComponentInstance.js';

export async function call(caller: ComponentInstance, method: string, params?: JsonObject): Promise<Json | void> {
    return thisComponent().call(caller, method, params);
}

export async function notify(caller: ComponentInstance, notification: string, params?: JsonObject) {
    return thisComponent().notify(caller, notification, params);
}

export async function onEvent(caller: ComponentInstance, event: string, listener: (params?: JsonObject) => Promise<void> | void) {
    return thisComponent().onEvent(caller, event, listener);
}
`;
    }
};

class ServerComponentApiGenerator implements ContributionGenerator {
    private body = '';
    private viewBody = '';
    private externalComponent?: string;

    generateMethod(component: string, method: object, name: string) {
        if ("virtual" in method && method.virtual === true) {
            return;
        }

        this.externalComponent ??= component;
        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `export async function ${label}(params: ${uLabel}Request): Promise<${uLabel}Response> {
    return ${generateLabelName(component, false)}.call(thisComponent(), "${name}", params) as any;
}
`;
    }

    generateNotification(component: string, notification: object, name: string) {
        if ("virtual" in notification && notification.virtual === true) {
            return;
        }

        this.externalComponent ??= component;
        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `export async function ${label}(params: ${uLabel}Request) {
    return ${generateLabelName(component, false)}.notify(thisComponent(), "${name}", params) as any;
}
`;
    }

    generateEvent(component: string, event: object, name: string) {
        this.externalComponent ??= component;
        const label = generateComponentLabelName(component, name, true);
        if (Object.keys(event).length == 0) {
            this.body += `export async function on${label}(handler: () => Promise<void> | void) {
    return ${generateLabelName(component, false)}.onEvent(thisComponent(), "${name}", handler as any);
}
`;
            return;
        }
        this.body += `export async function on${label}(handler: (event: ${label}Event) => Promise<void> | void) {
    return ${generateLabelName(component, false)}.onEvent(thisComponent(), "${name}", handler as any);
}
`;
    }

    generateView(_component: string, _path: string, name: string) {
        this.viewBody += `
export function push${name}View(target: Electron.WebContents, params: ${name}Props) {
    return target.send("view/push", "${pascalToCamelCase(name)}", params);
}

export function set${name}View(target: Electron.WebContents, params: ${name}Props) {
    return target.send("view/set", "${pascalToCamelCase(name)}", params);
}
`;
    }

    toString(): string {
        if (this.body.length === 0 || !this.externalComponent) {
            return `${generatedHeader}export { };\n`;
        }

        return `${generatedHeader}
import { thisComponent } from "$/component-info";
import * as ${generateLabelName(this.externalComponent, false)} from '$${this.externalComponent}/api';
import 'electron';

${this.body}
${this.viewBody}
${this.externalComponent == "core" ? `
export function popView(target: Electron.WebContents) {
    return target.send("view/pop");
}
` : ''}

`;
    }
};


class ServerPrivateApiGenerator implements ContributionGenerator {
    private body = '';
    private callBody = '';
    private notifyBody = '';
    private viewBody = '';
    private settingBody = `
    async get() { return core.settingsGet({ path: "" }); },
    async set(value: Json) { return core.settingsSet({ path: "", value }); },
`;
    private component = '';

    generateEvent(component: string, event: object, name: string) {
        this.component = component;
        const label = generateComponentLabelName(component, name, true);
        if (Object.keys(event).length == 0) {
            this.body += `
export function emit${label}Event() {
    return thisComponent().emitEvent("${name}");
}\n`;
            return;
        }

        this.body += `
export function emit${label}Event(params: ${label}Event) {
    return thisComponent().emitEvent("${name}", params);
}\n`;
    }

    generateMethod(component: string, method: object, name: string) {
        this.component = component;
        if (typeof method != 'object') {
            throw `${name}: must be object`;
        }
        if ("virtual" in method && method.virtual === true) {
            return;
        }
        if (!("handler" in method)) {
            throw `${name}: must contain handler field`;
        }
        if (typeof method.handler != 'string') {
            throw `${name}/handler: must be string`;
        }

        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `
export async function call${uLabel}(caller: Component, params: ${uLabel}Request): Promise<${uLabel}Response> {
    return impl.${method.handler}(caller, params);
}

export async function ${label}(params: ${uLabel}Request): Promise<${uLabel}Response> {
    return impl.${method.handler}(thisComponent().view, params);
}
`;
        // FIXME: implement type validation
        this.callBody += `        case "${name}": return call${uLabel}(caller, params as ${uLabel}Request);\n`;
    }

    generateNotification(component: string, notification: object, name: string) {
        this.component = component;
        if (typeof notification != 'object') {
            throw `${name}: must be object`;
        }
        if ("virtual" in notification && notification.virtual === true) {
            return;
        }
        if (!("handler" in notification)) {
            throw `${name}: must contain handler field`;
        }
        if (typeof notification.handler != 'string') {
            throw `${name}/handler: must be string`;
        }

        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `
export async function notify${uLabel}(caller: Component, params: ${uLabel}Request) {
    impl.${notification.handler}(caller, params);
}
export async function ${label}(params: ${uLabel}Request) {
    impl.${notification.handler}(thisComponent().view, params);
}
`;
        this.notifyBody += `        case "${name}": return notify${uLabel}(caller, params as ${uLabel}Request);\n`;
    }

    generateView(component: string, _path: string, name: string) {
        this.component = component;
        this.viewBody += `
export function push${name}View(target: Electron.WebContents, params: ${name}Props) {
    return target.send("view/push", "${pascalToCamelCase(name)}", params);
}

export function set${name}View(target: Electron.WebContents, params: ${name}Props) {
    return target.send("view/set", "${pascalToCamelCase(name)}", params);
}
`;
    }

    generateSetting(component: string, _setting: object, name: string) {
        this.component = component;
        this.settingBody += `
    async set${generateLabelName(name, true)}(value: Json) {
        return await core.settingsSet({ path: "${name}", value });
    },
    async get${generateLabelName(name, true)}() {
        return await core.settingsGet({ path: "${name}" });
    },
`;
    }


    toString(): string {
        if (this.body.length === 0) {
            return `${generatedHeader}
import { createError } from "$core/Error";
import { Component } from "$core/Component";
import * as core from "$core";
import 'electron';

export async function call(_caller: Component, _method: string, _params: JsonObject | undefined): Promise<JsonObject | void> {
    throw createError(ErrorCode.MethodNotFound);
}

export async function notify(_caller: Component, _method: string, _params: JsonObject | undefined) {
    throw createError(ErrorCode.MethodNotFound);
}

export const settings = {${this.settingBody}};
${this.viewBody}
${this.component == "core" ? `
export function popView(target: Electron.WebContents) {
    return target.send("view/pop");
}
` : ''}
`;
        }

        return `${generatedHeader}
${this.callBody.length > 0 || this.notifyBody.length > 0 ? 'import * as impl from "$/main";' : ""}
import { createError } from "$core/Error";
import { Component } from "$core/Component";
import { thisComponent } from "$/component-info";
import * as core from "$core";
import 'electron';

${this.body}

export async function call(caller: Component, method: string, params: JsonObject | undefined): Promise<JsonObject | void> {
    void caller, params;

    switch (method) {
${this.callBody}
    default:
        throw createError(ErrorCode.MethodNotFound);
    }
}

export async function notify(caller: Component, method: string, params: JsonObject | undefined) {
    void caller, params;

    switch (method) {
${this.notifyBody}
    default:
        throw createError(ErrorCode.MethodNotFound);
    }
}

export const settings = {${this.settingBody}};

${this.viewBody}
${this.component == "core" ? `
export function popView(target: Electron.WebContents) {
    return target.send("view/pop");
}
` : ''}

`;
    }
}

class SvelteElectronComponentApiGenerator implements ContributionGenerator {
    private body = '';
    private hasMethod = false;
    private hasEvent = false;
    private component = '';

    generateMethod(component: string, method: object, name: string) {
        if ("virtual" in method && method.virtual === true) {
            return;
        }

        this.component = component;

        this.hasMethod = true;
        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `
export async function ${label}(params: ${uLabel}Request): Promise<${uLabel}Response> {
    if (!window?.electron?.ipcRenderer) {
        throw createError(ErrorCode.InvalidRequest, "electron is not available");
    }

    return window.electron.ipcRenderer.invoke("${component}/${name}", params);
}
`;
    }

    generateNotification(component: string, notification: object, name: string) {
        if ("virtual" in notification && notification.virtual === true) {
            return;
        }

        this.component = component;

        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `
export function ${label}(params: ${uLabel}Request) {
    if (!window?.electron?.ipcRenderer) {
        return;
    }

    return window.electron.ipcRenderer.send("${component}/${name}", params);
}
`;
    }

    generateEvent(component: string, event: object, name: string) {
        this.component = component;
        this.hasEvent = true;
        const label = generateComponentLabelName(component, name, true);
        this.body += "\n";

        if (Object.keys(event).length == 0) {
            this.body += `export async function on${label}(handler: () => Promise<void> | void) {`;
        } else {
            this.body += `export async function on${label}(handler: (event: ${label}Event) => Promise<void> | void) {`;
        }

        this.body += `
    if (!window?.electron?.ipcRenderer) {
        return Disposable.None;
    }

    const result = Disposable.Create(window.electron.ipcRenderer.on("${component}/${name}", handler));
    onDestroy(() => result.dispose());
    return result;
}
`;
    }

    generateView(component: string, _path: string, name: string) {
        this.component = component;
        this.body += `
export function push${name}View(params: ${name}Props) {
    if (!window?.electron?.ipcRenderer) {
        return;
    }

    return window.electron.ipcRenderer.send("view/push", "${pascalToCamelCase(name)}", params);
}

export function set${name}View(params: ${name}Props) {
    if (!window?.electron?.ipcRenderer) {
        return;
    }

    return window.electron.ipcRenderer.send("view/set", "${pascalToCamelCase(name)}", params);
}
`;
    }

    toString(): string {
        if (this.body.length === 0) {
            return `${generatedHeader}export { };\n`;
        }

        return `${generatedHeader}
${this.hasMethod ? 'import { createError } from "$core/Error";' : ""}
${this.hasEvent ? 'import { Disposable } from "$core/Disposable";' : ""}
${this.hasEvent ? 'import { onDestroy } from "svelte";' : ""}
${this.body}
${this.component == "core" ? `
export function popView() {
if (!window?.electron?.ipcRenderer) {
        return;
    }

    return window.electron.ipcRenderer.send("view/pop");
}
` : ''}

`;
    }
};


function generateContributions<Params extends [], RT extends ContributionGenerator>(component: Component, Generator: new (...params: Params) => RT, ...params: Params) {
    const generator = new Generator(...params);
    const contributions = component.manifest.contributions ?? {};

    if (typeof contributions !== 'object' || Array.isArray(contributions) || !contributions) {
        throw new Error('contributions must be object');
    }

    contributions.events = contributions.events ?? {};

    Object.keys(contributions).forEach(contributionType => {
        const contribution = (contributions as Record<string, Record<string, any>>)[contributionType];
        switch (contributionType) {
            case "methods":
                Object.keys(contribution).forEach(name => {
                    if (generator.generateMethod) {
                        try {
                            generator.generateMethod(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                });
                break;

            case "notifications":
                Object.keys(contribution).forEach(name => {
                    if (generator.generateNotification) {
                        try {
                            generator.generateNotification(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                });
                break;

            case "events": {
                let events: Record<string, object> = contribution;

                if ("server" in component.projects) {
                    // add builtin server events

                    events = {
                        ...contribution,
                        activate: {},
                        deactivate: {}
                    };
                }

                Object.keys(events).forEach(name => {
                    if (generator.generateEvent) {
                        try {
                            generator.generateEvent(component.manifest.name, events[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                });
                break;
            }

            case "types":
                Object.keys(contribution).forEach(name => {
                    if (generator.generateType) {
                        try {
                            generator.generateType(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                });
                break;

            case "views":
                Object.keys(contribution).forEach(name => {
                    if (generator.generateView) {
                        try {
                            generator.generateView(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                });
                break;

            case "settings":
                Object.keys(contribution).forEach(name => {
                    if (generator.generateSetting) {
                        try {
                            generator.generateSetting(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                });
                break;

            default:
                throw `unexpected contribution ${contributionType}`;
        }
    });

    return generator;
}

type TsGeneratorConfig = {
    outDir: string;
    buildDir: string;
};

class TsLibGenerator implements ProjectGenerator {
    name = "TsLibGenerator";
    projectId = "lib";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return projectId == "lib";
    }

    async generateTypesFile(project: Project, fileDb: FileDb) {
        const projectPath = pathJoin(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = pathJoin(projectPath, "src");
        const generatedFilePath = pathJoin(genDir, "types.d.ts");
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = generateContributions(project.component, TypesGenerator).toString();
            } catch (e) {
                throw Error(`${project.component.manifest.name}: ${e}`);
            }
        }
    }

    async generateEnumsFile(project: Project, fileDb: FileDb) {
        const projectPath = pathJoin(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = pathJoin(projectPath, "src");
        const generatedFilePath = pathJoin(genDir, "enums.ts");
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = generateContributions(project.component, EnumsGenerator).toString();
            } catch (e) {
                throw Error(`${project.component.manifest.name}: ${e}`);
            }
        }
    }

    async generateProjects(project: Project, fileDb: FileDb) {
        await Promise.all([
            this.generateTypesFile(project, fileDb),
            this.generateEnumsFile(project, fileDb),
        ]);
        return [];
    }
};

class SvelteElectronApiGenerator implements ProjectGenerator {
    name = "TsLibGenerator";
    projectId = "server";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return projectId == "lib";
    }

    async generateProjects(project: Project, fileDb: FileDb) {
        const projectName = "server-renderer-api";
        const generatedFileName = "api.ts";
        const newProjectPath = pathJoin(this.config.outDir, project.component.manifest.name, projectName);
        const genDir = pathJoin(newProjectPath, "src");
        const generatedFilePath = pathJoin(genDir, generatedFileName);
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = generateContributions(project.component, SvelteElectronComponentApiGenerator).toString();
            } catch (e) {
                throw Error(`${project.component.manifest.name}: ${e}`);
            }
        }

        const newProject: Project = {
            name: projectName,
            rootDir: genDir,
            component: project.component,
            dependencies: [project.component.projects["lib"]],
            include: [generatedFilePath],
            exclude: [],
        };

        return [newProject];
    }
};
class TsServerGenerator implements ProjectGenerator {
    name = "TsServerGenerator";
    projectId = "server";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return ["lib"].includes(projectId);
    }

    async generateContributionFile<Params extends []>(sourceComponent: Component, project: Project, fileDb: FileDb, generatedFileName: string, Generator: new (...params: Params) => ContributionGenerator, ...params: Params) {
        const projectPath = pathJoin(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = pathJoin(projectPath, "src");
        const generatedFilePath = pathJoin(genDir, generatedFileName);
        const generatedFile = await fileDb.createFile(generatedFilePath, sourceComponent.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = generateContributions(sourceComponent, Generator, ...params).toString();
            } catch (e) {
                throw Error(`${sourceComponent.manifest.name}: ${e}`);
            }
        }
    }

    async generateProject<Params extends []>(project: Project, fileDb: FileDb, projectName: string, generatedFileName: string, Generator: new (...params: Params) => ContributionGenerator, ...params: Params) {
        const newProjectPath = pathJoin(this.config.outDir, project.component.manifest.name, projectName);
        const genDir = pathJoin(newProjectPath, "src");
        const generatedFilePath = pathJoin(genDir, generatedFileName);
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = generateContributions(project.component, Generator, ...params).toString();
            } catch (e) {
                throw Error(`${project.component.manifest.name}: ${e}`);
            }
        }

        const newProject: Project = {
            name: projectName,
            rootDir: genDir,
            component: project.component,
            dependencies: [],
            include: [generatedFilePath],
            exclude: [],
        };

        return newProject;
    }

    async generateServerPrivateApiFile(project: Project, fileDb: FileDb) {
        return await this.generateContributionFile(project.component, project, fileDb, "api.ts", ServerPrivateApiGenerator);
    }

    async generateServerPublicApiProject(project: Project, fileDb: FileDb) {
        return await this.generateProject(project, fileDb, "server-public-api", "api.ts", ServerPublicApiGenerator);
    }

    async generateComponentInfoFile(project: Project, fileDb: FileDb) {
        const outDir = pathJoin(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = pathJoin(outDir, "src");
        const componentFilePath = pathJoin(genDir, "component-info.ts");
        const componentManifest = await fileDb.createFile(componentFilePath, project.component.manifestFile);

        if (componentManifest) {
            const serverManifest = createServerManifest(project.component.manifest, project.component.workspace);
            componentManifest.content = `${generatedHeader}
import { getComponent } from '$core/ComponentInstance.js';

export const manifest = Object.freeze(${JSON.stringify(serverManifest, null, 4)});

export function thisComponent() {
  return getComponent(manifest);
}
`;
        }
    }

    async generateComponentInfoProject(project: Project, fileDb: FileDb) {
        const projectName = "component-info";
        const newProjectPath = pathJoin(this.config.outDir, project.component.manifest.name, projectName);
        const genDir = pathJoin(newProjectPath, "src");
        const generatedFilePath = pathJoin(genDir, "component-info.ts");

        const newProject: Project = {
            name: projectName,
            rootDir: genDir,
            component: project.component,
            dependencies: [],
            include: [generatedFilePath],
            exclude: [],
        };

        await this.generateComponentInfoFile(newProject, fileDb);
        return newProject;
    }

    async generateComponentProject(serverProject: Project, fileDb: FileDb) {
        const componentProjectName = "component";
        const component = serverProject.component;
        const manifest = component.manifest;

        const outDir = pathJoin(this.config.outDir, manifest.name, componentProjectName);
        const genDir = pathJoin(outDir, "src");
        const genFilePath = pathJoin(genDir, "component.ts");

        const componentFile = await fileDb.createFile(genFilePath, component.manifestFile);
        const componentLabel = generateLabelName(manifest.name, true);

        const mainFile = pathJoin(serverProject.rootDir, "main.ts");

        try {
            if (!(await fs.stat(pathToNative(mainFile))).isFile()) {
                throw new Error(`server component must declare entry file, but '${mainFile}' is not a file`);
            }
        } catch {
            throw new Error(`server component must declare entry file, but '${mainFile}' not found`);
        }

        if (componentFile) {
            const mainFile = pathJoin(serverProject.rootDir, "main.js");
            componentFile.content = `${generatedHeader}
import * as api from '$';
import { IComponentImpl, registerComponent } from '$core/ComponentInstance.js';
import { ComponentContext, Component } from '$core/Component.js';
import { manifest } from '$/component-info';
export { thisComponent } from '$/component-info';

class ${componentLabel}ComponentImpl implements IComponentImpl {
    private impl: Awaited<typeof import("${mainFile}")> | undefined;

    async initialize() {
        this.impl = await import("${mainFile}");
    }

    dispose() {
        this.impl = undefined;
    }

    activate(context: ComponentContext, settings: JsonObject) {
        if (this.impl && "activate" in this.impl && typeof this.impl.activate === "function") {
            return (this.impl.activate as any)(context, settings);
        }
    }

    deactivate(context: ComponentContext) {
        if (this.impl && "deactivate" in this.impl && typeof this.impl.deactivate === "function") {
            return (this.impl.deactivate as any)(context);
        }
    }

    async call(caller: Component, method: string, params?: JsonObject) {
        return await api.call(caller, method, params);
    }

    async notify(caller: Component, notification: string, params?: JsonObject) {
        await api.notify(caller, notification, params);
    }
};

export function register${generateLabelName(component.manifest.name, true)}Component() {
    registerComponent(manifest, new ${componentLabel}ComponentImpl());
}
`;
        }

        const componentProject: Project = {
            name: componentProjectName,
            component: serverProject.component,
            dependencies: [serverProject],
            include: [genFilePath],
            exclude: [],
            rootDir: genDir
        };

        return componentProject;
    }

    async generateProjects(project: Project, fileDb: FileDb): Promise<Project[]> {
        const publicApiPromise = this.generateServerPublicApiProject(project, fileDb);
        const dummyProject = project.rootDir == "";

        const privateApiPromise = dummyProject ? Promise.resolve() : this.generateServerPrivateApiFile(project, fileDb);
        const componentPromise = dummyProject ? Promise.resolve() : this.generateComponentProject(project, fileDb);
        const componentInfoPromise =
            project.component.manifest.name == "core"
                ? this.generateComponentInfoFile(project, fileDb)
                : this.generateComponentInfoProject(project, fileDb);

        await Promise.all(project.component.dependencies.map(async dep => {
            if (dep != project.component) {
                await this.generateContributionFile(dep, project, fileDb, `${dep.manifest.name}.ts`, ServerComponentApiGenerator);
            }
        }));

        await privateApiPromise;
        const publicApiProject = await publicApiPromise;
        const componentProject = await componentPromise;
        const componentInfoProject = await componentInfoPromise;

        const result = [publicApiProject];

        if (componentProject) {
            result.push(componentProject);
        }

        const component = project.component;
        const coreLibProject = component.workspace["core"].projects["lib"];
        const coreServerProject = component.workspace["core"].projects["server"];

        componentProject?.dependencies.push(coreLibProject);

        if (component.manifest.name != "core") {
            componentProject?.dependencies.push(coreServerProject);
        }

        if (componentInfoProject) {
            componentInfoProject.dependencies.push(coreServerProject);
            project.dependencies.push(componentInfoProject);
            result.push(componentInfoProject);
            publicApiProject.dependencies.push(componentInfoProject);
            componentProject?.dependencies.push(componentInfoProject);
        }

        publicApiProject.dependencies.push(coreServerProject, project.component.projects["lib"]);
        componentProject?.dependencies.push(project);

        return result;
    }
};

class TsServerMainGenerator implements ComponentGenerator {
    name = "TsServerComponentGenerator";
    projectId = "renderer";

    constructor(private config: TsGeneratorConfig) { }

    async generateComponents(workspace: Workspace, fileDb: FileDb) {
        const serverComponents = Object.values(workspace).filter(component => "server" in component.projects && component.projects["component"]);

        const serverComponent = await this.generateServerComponent(workspace, fileDb);
        const serverProject = await this.generateServerMainProject(fileDb, serverComponent, serverComponents);

        serverComponent.projects[serverProject.name] = serverProject;
        return [serverComponent];
    }

    async generateServerComponent(workspace: Workspace, fileDb: FileDb): Promise<Component> {
        const componentName = "rpcsx-ui-server";
        const outDir = pathJoin(this.config.outDir, componentName);
        const manifest: ComponentInfo = {
            name: componentName
        };

        const manifestPath = pathJoin(outDir, componentManifestName);
        let manifestFile = await fileDb.createFile(manifestPath, { timestamp: 0 });
        if (manifestFile) {
            manifestFile.content = JSON.stringify(manifest, null, 4);
        } else {
            // FIXME: required timestamp only
            manifestFile = await fileDb.readFile(manifestPath);
        }

        const component: Component = {
            workspace,
            path: outDir,
            manifest,
            projects: {},
            manifestFile,
            dependencies: []
        };

        return component;
    }

    async generateServerMainProject(fileDb: FileDb, serverComponent: Component, serverComponents: Component[]): Promise<Project> {
        const projectName = "server-main";
        const outDir = pathJoin(serverComponent.path, projectName);
        const genDir = pathJoin(outDir, "src");
        const project: Project = {
            component: serverComponent,
            name: projectName,
            rootDir: genDir,
            dependencies: [],
            include: [
                pathJoin(genDir, "*.json"),
                pathJoin(genDir, "*.ts")
            ],
            exclude: [],
        };

        serverComponents.forEach(component => {
            project.dependencies.push(component.projects['component']);

            if (component.manifest.name == "core") {
                project.dependencies.push(component.projects['server']);
            }
        });

        const mainFile = await fileDb.createFile(pathJoin(genDir, "main.ts"), mergeTimestamps(serverComponents.map(x => x.manifestFile)));
        if (mainFile) {
            mainFile.content = `${generatedHeader}
import { startup } from '$core/ComponentInstance';
${serverComponents.map(x => `import { register${generateLabelName(x.manifest.name, true)}Component } from '$${x.manifest.name}/component'`).join(";\n")};

${serverComponents.map(x => `register${generateLabelName(x.manifest.name, true)}Component()`).join(";\n")};

startup();
`;
        }

        return project;
    }
};

class SvelteRendererGenerator implements ComponentGenerator {
    name = "SvelteRendererGenerator";
    projectId = "renderer";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return ["lib", "server-renderer-api", "renderer"].includes(projectId);
    }

    async generateComponents(workspace: Workspace, fileDb: FileDb) {
        const localesPaths: string[] = [];
        const routesProjects: Project[] = [];
        const rendererWithViewProjects: Project[] = [];

        await Promise.all(Object.values(workspace).map(x => x.projects["renderer"]).filter(x => x != undefined).map(async project => {
            let hasRoutes = false;
            let hasViews = false;
            for (const item of await fs.readdir(pathToNative(pathJoin(project.component.path, project.name)), { recursive: false, withFileTypes: true })) {
                if (!item.isDirectory()) {
                    continue;
                }

                switch (item.name) {
                    case "locales":
                        localesPaths.push(pathJoin(item.parentPath, item.name));
                        break;

                    case "routes":
                        hasRoutes = true;
                        break;

                    case "views":
                        hasViews = true;
                        break;
                }
            }

            if (hasRoutes) {
                routesProjects.push(project);
            }
            if (hasViews && ("views" in (project.component.manifest.contributions ?? {}))) {
                rendererWithViewProjects.push(project);
            }
        }));

        const svelteComponent = await this.generateSvelteComponent(workspace, fileDb);
        const localesProject = this.generateLocalesProject(fileDb, svelteComponent, localesPaths);
        const viewsProject = this.generateViewsProject(fileDb, svelteComponent, rendererWithViewProjects);
        await this.generateRoutesProjects(fileDb, svelteComponent, await viewsProject, await localesProject, routesProjects);
        return [svelteComponent];
    }

    async generateSvelteComponent(workspace: Workspace, fileDb: FileDb): Promise<Component> {
        const componentName = "rpcsx-ui-svelte";
        const outDir = pathJoin(this.config.outDir, componentName);
        const manifest: ComponentInfo = {
            name: componentName
        };

        const manifestPath = pathJoin(outDir, componentManifestName);
        let manifestFile = await fileDb.createFile(manifestPath, { timestamp: 0 });
        if (manifestFile) {
            manifestFile.content = JSON.stringify(manifest, null, 4);
        } else {
            // FIXME: required timestamp only
            manifestFile = await fileDb.readFile(manifestPath);
        }

        const component: Component = {
            workspace,
            path: outDir,
            manifest,
            projects: {},
            manifestFile,
            dependencies: []
        };

        return component;
    }

    async generateLocalesProject(fileDb: FileDb, svelteComponent: Component, localesPaths: string[]): Promise<Project> {
        const locales: Record<string, object> = {};
        const sourceTimestamps: Record<string, Timestamp> = {};

        await Promise.all(localesPaths.map(async localesPath => {
            for (const item of await fs.readdir(pathToNative(localesPath), { recursive: false, withFileTypes: true })) {
                if (!item.isFile()) {
                    continue;
                }

                if (!item.name.endsWith(".json")) {
                    continue;
                }

                const sourceFile = await fileDb.readFile(pathToNative(pathJoin(item.parentPath, item.name)));
                if (item.name in sourceTimestamps) {
                    sourceTimestamps[item.name] = mergeTimestamps([sourceTimestamps[item.name], sourceFile]);
                } else {
                    sourceTimestamps[item.name] = sourceFile;
                }

                const locale = JSON.parse(sourceFile.content);

                locales[item.name] ??= {};
                locales[item.name] = {
                    ...locales[item.name],
                    ...locale
                };
            }
        }));


        const projectName = "locales";
        const genDir = pathJoin(svelteComponent.path, projectName);
        const project: Project = {
            component: svelteComponent,
            name: projectName,
            rootDir: genDir,
            dependencies: [],
            include: [
                pathJoin(genDir, "*.json"),
                pathJoin(genDir, "*.ts")
            ],
            exclude: [],
        };

        for (const locale in locales) {
            const mergedFile = await fileDb.createFile(pathJoin(genDir, locale), sourceTimestamps[locale]);

            if (mergedFile) {
                mergedFile.content = JSON.stringify(locales[locale], null, 4);
            }
        }

        const i18n = await fileDb.createFile(pathJoin(genDir, "i18n.ts"), mergeTimestamps(Object.values(sourceTimestamps)));
        if (i18n) {
            i18n.content = `${generatedHeader}
import { register, init, getLocaleFromNavigator } from "svelte-i18n";

${Object.keys(locales).map(x => `register("${pathParse(x).name}", () => import("./${x}"))`).join(";\n")};

await init({
    fallbackLocale: "en",
    initialLocale: getLocaleFromNavigator()
});
`;
        }

        svelteComponent.projects[project.name] = project;
        return project;
    }

    async generateRoutesProjects(fileDb: FileDb, svelteComponent: Component, viewsProject: Project, localesProject: Project, routesProjects: Project[]): Promise<Project[]> {
        const projectName = "routes";

        if (routesProjects.length == 1) {
            const project = routesProjects[0];
            const srcDir = pathJoin(project.rootDir, "routes");

            const routesProject: Project = {
                component: svelteComponent,
                name: projectName,
                rootDir: srcDir,
                dependencies: [viewsProject, localesProject, project],
                include: [
                    pathJoin(srcDir, "**", "*.svelte"),
                    pathJoin(srcDir, "**", "*.ts")
                ],
                exclude: [],
            };

            svelteComponent.projects[routesProject.name] = routesProject;
            return [routesProject];
        }

        const outDir = pathJoin(svelteComponent.path, projectName);
        const genDir = pathJoin(outDir, "src");
        const projects: Project[] = [];

        await Promise.all(routesProjects.map(async sourceProject => {
            const srcDir = pathJoin(sourceProject.rootDir, "routes");

            const project: Project = {
                component: svelteComponent,
                name: sourceProject.component.manifest.name + "-routes",
                rootDir: srcDir,
                dependencies: [viewsProject, localesProject, sourceProject],
                include: [
                    pathJoin(srcDir, "**", "*.svelte"),
                    pathJoin(srcDir, "**", "*.ts")
                ],
                exclude: [],
            };
            projects.push(project);
            svelteComponent.projects[project.name] = project;

            const workList = [""];
            const files: string[] = [];

            while (true) {
                const dir = workList.pop();
                if (!dir) {
                    break;
                }

                for (const item of await fs.readdir(pathToNative(pathJoin(srcDir, dir)), { recursive: false, withFileTypes: true })) {
                    if (item.isDirectory()) {
                        if (!shouldIgnoreDir(item.name)) {
                            workList.push(pathJoin(dir, item.name));
                        }

                        continue;
                    }

                    if (!item.name.startsWith("+")) {
                        continue;
                    }

                    if (item.name.endsWith(".svelte") || item.name.endsWith(".ts")) {
                        files.push(pathJoin(dir, item.name));
                    }
                }
            }

            await Promise.all(files.map(async file => {
                const sourcePath = pathJoin(srcDir, file);
                const sourceTs = await calcTimestamp(sourcePath);
                const genFile = await fileDb.createFile(pathJoin(genDir, file), sourceTs);

                if (genFile) {
                    genFile.content = generatedHeader + (await fileDb.readFile(sourcePath, sourceTs)).content;
                }
            }));
        }));

        const project: Project = {
            component: svelteComponent,
            name: projectName,
            rootDir: genDir,
            dependencies: [viewsProject, localesProject],
            include: [
                pathJoin(genDir, "**", "*.svelte"),
                pathJoin(genDir, "**", "*.ts")
            ],
            exclude: [],
        };

        svelteComponent.projects[project.name] = project;
        projects.push(project);

        return projects;
    }

    async generateViewsProject(fileDb: FileDb, svelteComponent: Component, rendererWithViewProjects: Project[]): Promise<Project> {
        const projectName = "views";
        const views: Record<string, string> = {};
        const outDir = pathJoin(svelteComponent.path, projectName);
        const genDir = pathJoin(outDir, "src");
        const include = [
            pathJoin(genDir, "**", "*.svelte")
        ];

        const projectViews = rendererWithViewProjects.map(project => {
            const contributions = project.component.manifest.contributions;

            if (!contributions) {
                return [];
            }

            if (!("views" in contributions)) {
                return [];
            }

            return Object.keys(contributions.views).map(name => {
                const path = contributions.views[name] as string;
                views[name] = path;
                return { name, path };
            });
        });

        const viewsListFile = await (async () => {
            const filePath = pathJoin(genDir, "views.json");
            const viewList = JSON.stringify(Object.values(views));
            try {
                const file = await fileDb.readFile(filePath);
                if (file.content == viewList) {
                    return file;
                }

                file.timestamp = 0;
                file.content = viewList;
                return file;
            } catch { }

            const file = await fileDb.createFile(filePath);
            file.content = viewList;
            return file;
        })();

        await Promise.all(rendererWithViewProjects.map(async (project, index) => {
            const views = projectViews[index];
            const genDir = pathJoin(this.config.outDir, project.component.manifest.name, "lib", "src");
            const viewTypesPath = pathJoin(genDir, "views.d.ts");

            const viewTypes = await fileDb.createFile(viewTypesPath, viewsListFile);
            if (!viewTypes) {
                return;
            }

            if (views.length === 0) {
                viewTypes.content = `${generatedHeader}`;
            } else {
                viewTypes.content = `${generatedHeader}
import type { ComponentProps } from "svelte";
${views.map(view => `import type ${view.name} from "${view.path}"`).join(";\n")};

declare global {
    ${views.map(view => `type ${view.name}Props = ComponentProps<${view.name}>`).join(";\n")};
}
`;
            }
        }));


        const viewsFile = await fileDb.createFile(pathJoin(genDir, "Views.svelte"), viewsListFile);
        if (viewsFile) {
            viewsFile.content = `<script lang="ts">${generatedHeader}
    import { hydrate, type ComponentProps } from "svelte";
    import Frame from "./Frame.svelte";
${Object.keys(views).map(x => `    import ${x} from '${pathRelative(genDir, views[x])}'`).join(';\n')};

    export let containerRoot: HTMLElement;

    export function createViewFactory(component: any) {
        return (props: any, intro = true) => {
            const result = hydrate(Frame, {
                props: {
                    component,
                    props,
                    shown: true,
                },
                target: containerRoot,
                intro,
            });

            console.log(result);
            return result;
        };
    }

    export const viewFactories: {
        [key: string]: (props: any) => ComponentProps<Frame>;
    } = {
${Object.keys(views).map(x => `        ${pascalToCamelCase(x)}: createViewFactory(${x})`).join(',\n')}
    };
</script>
`;
        }

        const frameFile = await fileDb.createFile(pathJoin(genDir, "Frame.svelte"), viewsListFile);

        if (frameFile) {
            frameFile.content = `<script lang="ts">${generatedHeader}
    import type { Component } from "svelte";

    export let component: Component<any>;
    export let props: object;
    export let shown: boolean;
</script>

<div class="min-h-full h-full frame-{shown ? 'show' : 'hide'}">
    <svelte:component this={component} {...props}></svelte:component>
</div>
`;
        }

        const project: Project = {
            component: svelteComponent,
            name: "views",
            rootDir: genDir,
            dependencies: rendererWithViewProjects,
            include,
            exclude: [],
        };

        svelteComponent.projects[project.name] = project;
        return project;
    }
};

type SvelteConfigGeneratorConfig = {
    outDir: string;
    buildDir: string;
    svelteDir: string;
    distDir: string;
};

class SvelteConfigGenerator implements ConfigGenerator {
    constructor(private config: SvelteConfigGeneratorConfig) { }

    async processWorkspace(workspace: Workspace, fileDb: FileDb) {
        const templates: {
            app?: string;
            err?: string;
        } = {};

        const svelteComponent = workspace["rpcsx-ui-svelte"];

        if (!svelteComponent) {
            throw new Error(`rpcsx-ui-svelte component not found`);
        }

        const routesProject = svelteComponent.projects["routes"];

        if (!routesProject) {
            throw new Error(`routes project in rpcsx-ui-svelte component not found`);
        }

        await Promise.all(Object.values(workspace).map(async component => {
            const rendererProject = component.projects["renderer"];

            if (!rendererProject) {
                return;
            }

            for (const entry of await fs.readdir(pathToNative(pathJoin(component.path, rendererProject.name)), { recursive: true, withFileTypes: true })) {
                if (!entry.isFile()) {
                    continue;
                }

                if (entry.name == "app.html") {
                    if (templates.app) {
                        throw Error(`${component.manifest.name}: ${pathJoin(entry.parentPath, entry.name)}: appTemplate redefinition, previously defined ${templates.app}`);
                    }

                    templates.app = pathJoin(entry.parentPath, entry.name);
                }

                if (entry.name == "error.html") {
                    if (templates.err) {
                        throw Error(`${component.manifest.name}: ${pathJoin(entry.parentPath, entry.name)}: errorTemplate redefinition, previously defined ${templates.err}`);
                    }

                    templates.err = pathJoin(entry.parentPath, entry.name);
                }
            }
        }));

        if (!templates.app) {
            throw new Error(`One of renderer components must define 'app.html' file`);
        }

        const sourceTimestamp = await calcTimestamp([templates.app, templates.err].filter(x => x != undefined));
        const svelteConfig = await fileDb.createFile(pathToNative(pathJoin(this.config.outDir, "svelte.config.js")), sourceTimestamp);

        if (svelteConfig) {
            svelteConfig.content = `${generatedHeader}
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    compilerOptions: {
        accessors: true,
        modernAst: true
    },
    kit: {
        adapter: adapter({
            pages: "${this.config.distDir}"
        }),
        files: {
            appTemplate: "${templates.app}",
            ${templates.err ? `errorTemplate: '${templates.err}` : ``}
            routes: "${routesProject.rootDir}",
        },
        outDir: "${this.config.svelteDir}"
    },
};

export default config;
`;
        }

    }
};

type TsProjectInfo = {
    project: Project;
    include: string[];
    exclude: string[];
    paths: Record<string, string[]>;
};

type TsConfigGeneratorConfig = {
    outDir: string;
    buildDir: string;
    svelteDir: string; // FIXME: remove
    projectInfos: TsProjectInfo[];
};

class TsConfigGenerator implements ConfigGenerator {
    constructor(private config: TsConfigGeneratorConfig) { }

    async processProject(project: Project, fileDb: FileDb) {
        const projectInfo: TsProjectInfo = {
            project,
            include: [],
            exclude: [],
            paths: {}
        };

        const appendProjectPath = (name: string, projectPath: string) => {
            const appendProjectPathImpl = (name: string, projectPath: string) => {
                projectInfo.paths[name] ??= [];
                const paths = projectInfo.paths[name];
                if (!paths.includes(projectPath)) {
                    paths.push(projectPath);
                }
            };

            if (projectPath.endsWith(posix_path.sep)) {
                appendProjectPathImpl(name + posix_path.sep, projectPath);
                appendProjectPathImpl(pathJoin(name, '*'), pathJoin(projectPath, '*'));
            } else {
                appendProjectPathImpl(name, projectPath);
            }
        };

        const appendProjectReferencePath = (sourceProject: Project, projectPath: string) => {
            appendProjectPath(`$${pathJoin(sourceProject.component.manifest.name)}`, projectPath);
        };

        const appendSelfProjectPath = (name: string, projectPath: string) => {
            appendProjectPath(name, projectPath);
            appendProjectPath('$', projectPath);
            appendProjectPath(`$${project.component.manifest.name}`, projectPath);
        };

        const getGenDir = (project: Project) => {
            return pathJoin(this.config.outDir, project.component.manifest.name, project.name, "src");
        };

        try {
            for (const item of await fs.readdir(pathToNative(project.rootDir), { recursive: false, withFileTypes: true })) {
                if (item.isDirectory() && !shouldIgnoreDir(item.name)) {
                    appendSelfProjectPath(item.name, pathJoin(item.parentPath, item.name) + posix_path.sep);
                }
            }
        } catch { /* empty */ }

        const outDir = pathJoin(this.config.outDir, project.component.manifest.name, project.name);

        const include = [...project.include];
        const exclude = [...project.exclude];

        if (project.rootDir != outDir) {
            include.push(
                pathJoin(project.rootDir, "**", "*.ts"),
                pathJoin(project.rootDir, "**", "*.js"),
                pathJoin(project.rootDir, "**", "*.d.ts"),
            );
        }

        const genDir = pathJoin(outDir, "src");
        if (genDir != project.rootDir) {
            include.push(
                pathJoin(genDir, "**", "*.ts"),
                pathJoin(genDir, "**", "*.js"),
                pathJoin(genDir, "**", "*.d.ts"),
            );
        }

        let config: object;
        if (["renderer", "routes", "views", "server-renderer-api"].includes(project.name)) {
            include.push(
                pathJoin(project.rootDir, "**", "*.svelte"),
                pathRelative(outDir, pathJoin(this.config.svelteDir, "*.d.ts")),
            );

            exclude.push(
                pathJoin(project.rootDir, "routes", "**", "*.svelte"),
                pathJoin(project.rootDir, "routes", "**", "*.ts"),
                pathJoin(project.rootDir, "routes", "**", "*.js"),
                pathJoin(project.rootDir, "locales", "**", "*.json"),
            );

            config = {
                extends: pathRelative(outDir, pathJoin(this.config.svelteDir, "tsconfig.json"))
            };
        } else {
            config = {
                compilerOptions: {
                    target: "ESNext",
                    module: "ESNext",
                    moduleResolution: "bundler",
                    lib: ["ESNext"]
                }
            };
        }

        const references: object[] = [];

        project.dependencies.forEach(dep => {
            const depOutDir = pathJoin(this.config.outDir, dep.component.manifest.name, dep.name);
            const depGenDir = pathJoin(depOutDir, "src");

            references.push({
                path: pathRelative(outDir, pathJoin(depOutDir, "tsconfig.json"))
            });

            if (dep.component == project.component) {
                if (dep.name == "server" || dep.name == "server-renderer-api") {
                    appendSelfProjectPath(dep.name, pathJoin(depGenDir, "api.ts"));
                }

                appendSelfProjectPath(dep.name, dep.rootDir + posix_path.sep);
                if (depGenDir != dep.rootDir) {
                    appendSelfProjectPath(dep.name, depGenDir + posix_path.sep);
                }
            } else {
                appendProjectReferencePath(dep, dep.rootDir + posix_path.sep);
                if (depGenDir != dep.rootDir) {
                    appendProjectReferencePath(dep, depGenDir + posix_path.sep);
                }

                if (dep.name == "server-renderer-api") {
                    appendProjectReferencePath(dep, pathJoin(depGenDir, "api.ts"));
                }
            }

            include.push(pathRelative(outDir, pathJoin(dep.rootDir, "**", "*.d.ts")),);

            if (dep.rootDir != depGenDir) {
                include.push(pathRelative(outDir, pathJoin(depGenDir, "**", "*.d.ts")));
            }
        });

        if (project.name == "server") {
            appendProjectPath('$', project.rootDir + posix_path.sep);
            appendProjectPath(`$${project.component.manifest.name}`, project.rootDir + posix_path.sep);

            appendSelfProjectPath(project.name, pathJoin(genDir, "api.ts"));

            if (project.rootDir != genDir) {
                appendSelfProjectPath(project.name, genDir + posix_path.sep);
            }

            project.component.dependencies.forEach(depComponent => {
                const server = depComponent.projects["server"];
                if (server) {
                    appendProjectReferencePath(server, pathJoin(genDir, `${server.component.manifest.name}.ts`));
                    appendProjectPath(`$${pathJoin(depComponent.manifest.name)}/api`, pathJoin(depComponent.projects["server-public-api"].rootDir, "api.ts"));
                }
            });
        } else if (project.name == "server-renderer-api") {
            const render = project.component.projects["renderer"];
            if (render) {
                include.push(pathRelative(outDir, pathJoin(render.rootDir, "**", "*.d.ts")));
                const genDir = getGenDir(render);
                if (render.rootDir != genDir) {
                    include.push(pathRelative(outDir, pathJoin(genDir, "**", "*.d.ts")));
                }
            }

            project.component.dependencies.forEach(depComponent => {
                const render = depComponent.projects["renderer"];
                if (render) {
                    include.push(pathRelative(outDir, pathJoin(render.rootDir, "**", "*.d.ts")));
                    const genDir = getGenDir(render);
                    if (render.rootDir != genDir) {
                        include.push(pathRelative(outDir, pathJoin(genDir, "**", "*.d.ts")));
                    }
                }
            });
        }

        const configFile = await fileDb.createFile(pathJoin(outDir, "tsconfig.json"), project.component.manifestFile);

        if (configFile) {
            const tsconfig = mergeConfig(baseTsConfig, mergeConfig(config, {
                references,
                compilerOptions: {
                    paths: projectInfo.paths,
                    rootDir: pathRelative(outDir, pathJoin(project.component.path, "..", "..")),
                    rootDirs: [
                        pathRelative(outDir, project.rootDir),
                        pathRelative(outDir, genDir),
                    ].filter((value, index, array) => array.indexOf(value) == index),
                    outDir: pathRelative(outDir, pathJoin(this.config.buildDir, project.component.manifest.name, project.name)),
                    tsBuildInfoFile: pathRelative(outDir, pathJoin(this.config.outDir, ".info", project.component.manifest.name, project.name)),
                },
                include: include.map(p => pathRelative(outDir, pathResolve(outDir, p))),
                exclude: exclude.map(p => pathRelative(outDir, pathResolve(outDir, p))),
            }));

            configFile.content = JSON.stringify(tsconfig, null, 4);
        }

        projectInfo.include = include.map(p => pathResolve(outDir, p));
        projectInfo.exclude = exclude.map(p => pathResolve(outDir, p));

        this.config.projectInfos.push(projectInfo);
    }

    async processWorkspace(workspace: Workspace, fileDb: FileDb) {
        const configFile = await fileDb.createFile(
            pathJoin(this.config.outDir, "tsconfig.json"),
            mergeTimestamps(Object.values(workspace).map(component => component.manifestFile))
        );

        if (configFile) {
            const references: object[] = [];
            Object.values(workspace).forEach(component => {
                Object.keys(component.projects).forEach(projectName => {
                    references.push({
                        path: pathJoin(component.manifest.name, projectName, "tsconfig.json")
                    });
                });
            });

            const tsconfig = {
                files: [],
                compilerOptions: {
                    composite: true,
                },
                references,
            };

            configFile.content = JSON.stringify(tsconfig, null, 4);
        }
    }
};

const preloadGenerator: ProjectGenerator = {
    name: "PreloadGenerator",
    projectId: "preload",

    shouldImport(projectId: string) {
        return "lib" == projectId;
    }
};

type ResolverWithWorkspace = {
    resolver: ((source: string, importer: string) => string | undefined),
    workspace: Workspace
};

let rpcsxResolver: undefined | ResolverWithWorkspace;

function getPaths(roots: string[]) {
    const projectRootDir = pathToUnix(roots[0]);
    const outDir = pathJoin(projectRootDir, ".rpcsx-ui-kit");
    const buildDir = pathJoin(outDir, "build");
    const svelteDir = pathJoin(outDir, "svelte");
    const distDir = pathJoin(projectRootDir, "build");

    return {
        projectRootDir,
        outDir,
        buildDir,
        svelteDir,
        distDir,
    };
}

async function getRpcsxResolver(roots: string[]): Promise<ResolverWithWorkspace> {
    if (rpcsxResolver) {
        return rpcsxResolver;
    }

    const paths = getPaths(roots);

    // await fs.rm(rootKitDir, { recursive: true, force: true });
    const tsProjectInfos: TsProjectInfo[] = [];

    const rpcsxKit = new RpcsxKit(paths, [
        new TsServerGenerator(paths),
        new TsLibGenerator(paths),
        new SvelteElectronApiGenerator(paths),
        new SvelteRendererGenerator(paths),
        preloadGenerator
    ], [
        new TsConfigGenerator({ ...paths, projectInfos: tsProjectInfos }),
        new SvelteConfigGenerator({ ...paths, distDir: pathJoin(paths.distDir, "ui") })
    ], [
        new SvelteRendererGenerator(paths),
        new TsServerMainGenerator(paths),
    ]);

    const workspace = await rpcsxKit.generate(roots);

    const fileMap: Record<string, Record<string, string[]> | undefined> = {};

    await Promise.all(tsProjectInfos.map(async info => {
        const excludeFiles = await glob(info.exclude, { absolute: true, nodir: true });
        const files = (await glob(info.include, { absolute: true, nodir: true })).filter(path => !excludeFiles.includes(path));
        Object.keys(info.paths).filter(path => path.endsWith("*")).forEach(path => delete info.paths[path]);

        files.forEach(file => {
            fileMap[pathToUnix(file)] = info.paths;
        });
    }));

    const resolver = (source: string, importer: string) => {
        importer = pathToUnix(importer);

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
                const prefix = testPaths.find(testPath => pathJoin(testPath, relativeSource) in fileMap);

                if (prefix == undefined) {
                    return undefined;
                }

                // console.log(`resolve: using prefix ${prefix} to resolve ${relativeSource} (${source}), file ${path.join(prefix, relativeSource)}`);
                return pathJoin(prefix, relativeSource);
            };

            if (relativeSource.endsWith(".ts") || relativeSource.endsWith(".js") || relativeSource.endsWith(".svelte")) {
                const result = resolve(relativeSource);

                if (!result && relativeSource.endsWith(".js")) {
                    return resolve(relativeSource.slice(0, -3) + ".ts");
                }

                return result;
            }

            const ext = ["", ".ts", ".js", ".svelte"];
            for (let i = 0; i < ext.length; ++i) {
                const resolved = resolve(relativeSource + ext[i]);
                if (resolved) {
                    return resolved;
                }
            }
        }

        return undefined;
    };

    rpcsxResolver = { resolver, workspace };
    return rpcsxResolver;
}

async function rpcsxESbuildPlugin(resolverWorkspace: ResolverWithWorkspace): Promise<esbuild.Plugin[]> {
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
                    const resolved = resolverWorkspace.resolver(args.path, args.importer);
                    // console.log(`resolve(${args.importer}:${args.path}) -> ${resolved}`);
                    return {
                        pluginName: "rpcsx",
                        path: resolved,
                    };
                });
            },
        }
    ];
}

export async function rpcsx() {
    const root = pathResolve("rpcsx-ui"); // TODO
    const paths = getPaths([root]);
    const { resolver, workspace } = await getRpcsxResolver([root]);

    const result: Plugin[] = [{
        name: "rpcsx-ui",
        apply: "build",
        enforce: 'pre',
        resolveId: {
            handler(source, importer) {
                if (!importer) {
                    return source;
                }

                return resolver(source, importer);
            },
        },
        buildStart: async () => {
            const enums = Object.values(workspace)
                .filter(component => "lib" in component.projects && "server" in component.projects && component.projects.server.rootDir != "")
                .map(component => pathJoin(paths.outDir, component.manifest.name, "lib", "src", "enums.ts"));

            const serverPromise = esbuild.build({
                outdir: pathJoin(paths.distDir),
                entryPoints: [
                    pathJoin(workspace["rpcsx-ui-server"].projects["server-main"].rootDir, "main.ts")
                ],
                plugins: [
                    ...await rpcsxESbuildPlugin({ resolver, workspace }),
                ],
                inject: enums,
                packages: 'external',
                bundle: true,
                platform: 'node',
                format: 'esm',
                sourcemap: 'both',
            });

            const preloadPromise = esbuild.build({
                outdir: pathJoin(paths.distDir),
                entryPoints: [
                    pathJoin(workspace["core"].projects["renderer"].rootDir, "preload", "preload.ts")
                ],
                plugins: [
                    ...await rpcsxESbuildPlugin({ resolver, workspace }),
                ],
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

    },
    ...await sveltekit(),
    ];

    return result;
}

