import * as fs from 'fs/promises';
import { FileDb, FileWithTimestamp, mergeTimestamps, Timestamp } from './FileDatabase.js';
import * as path from './path.js';

export type Dependency = {
    name: string;
    version?: string;
};

export type ComponentInfo = Dependency & {
    capabilities?: Record<string, any>;
    contributions?: Record<string, any>,
    dependencies?: Dependency[];
};

export type Project = {
    name: string;
    rootDir: string;
    component: Component;
    dependencies: Project[];
    include: string[];
    exclude: string[];
};

export type Component = {
    workspace: Workspace;
    path: string;
    manifestFile: FileWithTimestamp;
    manifest: ComponentInfo;
    projects: Record<string, Project>;
    dependencies: Component[];
};

export type Workspace = Record<string, Component>;

export type ProjectGenerator = {
    name: string;
    projectId: string;
    shouldImport?(projectId: string): boolean;
    generateProjects?(project: Project, fileDb: FileDb): Promise<(Project | undefined)[]>;
};

export type ComponentGenerator = {
    name: string;
    projectId: string;
    generateComponents(workspace: Workspace, fileDb: FileDb): Promise<(Component | undefined)[]>;
};

export type ConfigGenerator = {
    processProject?(project: Project, fileDb: FileDb): Promise<void> | void;
    processComponent?(component: Component, fileDb: FileDb): Promise<void> | void;
    processWorkspace?(workspace: Workspace, fileDb: FileDb): Promise<void> | void;
}

export type ContributionGenerator = {
    generateType?(component: string, type: object, name: string): void | Promise<void>;
    generateMethod?(component: string, method: object, name: string): void | Promise<void>;
    generateNotification?(component: string, notification: object, name: string): void | Promise<void>;
    generateEvent?(component: string, event: object, name: string): void | Promise<void>;
    generateView?(component: string, path: string, name: string): void | Promise<void>;
    generateSetting?(component: string, schema: object, name: string): void | Promise<void>;
    generateInterface?(component: string, iface: object, name: string): void | Promise<void>;
    toString(): string;
};

const componentManifestName = "component.json";
const generatedHeader = `
///////////////////////////////////////////
//    FILE WAS GENERATED, DO NOT EDIT!   //
///////////////////////////////////////////
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

export function generateLabelName(entityName: string, isPascalCase = false) {
    const name = entityName.replaceAll(" ", "-").replaceAll("_", "-").replaceAll(".", "-").replaceAll("/", "-").split("-");
    return [...(isPascalCase ? name[0][0].toUpperCase() + name[0].slice(1).toLowerCase() : name[0].toLowerCase()), ...name.slice(1).map(word => {
        if (word.length == 0) {
            return word;
        }
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })].reduce((a, b) => a + b);
}

export function generateComponentLabelName(componentName: string, entityName: string, isPascalCase = false) {
    return generateLabelName(componentName == 'core' ? entityName : `${componentName}/${entityName}`, isPascalCase);
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

function shouldIgnoreDir(name: string) {
    if (name.startsWith('.')) {
        return true;
    }

    return [
        "node_modules", "build", "out"
    ].includes(name);
}

async function parseManifest(fileDb: FileDb, manifestPath: string, projectIds: string[]): Promise<undefined | Component> {
    const componentRootDir = path.parse(manifestPath).dir;

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

        for (const projects of await fs.readdir(path.toNative(componentRootDir), { recursive: false, withFileTypes: true })) {
            if (!projects.isDirectory()) {
                continue;
            }

            if (!projectIds.includes(projects.name)) {
                throw Error(`${manifest.name}: unknown project ${projects.name}`);
            }

            component.projects[projects.name] = {
                name: projects.name,
                rootDir: path.join(projects.parentPath, projects.name),
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
                rootDir: path.join(componentRootDir, libProject),
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
            const srcDir = path.join(project.rootDir, "views");
            const views: Record<string, string> = {};

            try {
                for (const view of await fs.readdir(path.toNative(srcDir), { recursive: false, withFileTypes: true })) {
                    if (!view.isFile()) {
                        continue;
                    }

                    const parsedName = path.parse(view.name);

                    if (parsedName.ext === ".tsx" && parsedName.name.length > 0) {
                        const viewName = parsedName.name;
                        const viewPath = path.join(view.parentPath, view.name);
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

export class RpcsxKit {
    private fileDb = new FileDb();
    private projectGenerators: Record<string, ProjectGenerator[]> = {};

    constructor(projectGenerators: ProjectGenerator[], private componentGenerators: ComponentGenerator[], private configGenerators: ConfigGenerator[]) {
        projectGenerators.forEach(generator => {
            this.projectGenerators[generator.projectId] ??= [];
            this.projectGenerators[generator.projectId].push(generator);
        });
    }

    dump() {
        this.fileDb.dump();
    }

    commit() {
        return this.fileDb.commit();
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

            for (const item of await fs.readdir(path.toNative(dir), { recursive: false, withFileTypes: true })) {
                if (item.isDirectory()) {
                    if (shouldIgnoreDir(item.name)) {
                        continue;
                    }

                    workList.push(path.join(item.parentPath, item.name));
                    continue;
                }

                if (item.name !== componentManifestName) {
                    continue;
                }

                const component = await parseManifest(this.fileDb, path.join(item.parentPath, componentManifestName), projectIds);

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
import { ComponentInstance } from '$core/ComponentInstance';

export async function call(caller: ComponentInstance, method: string, params?: JsonObject): Promise<Json | void> {
    return thisComponent().call(caller, method, params);
}

export async function notify(caller: ComponentInstance, notification: string, params?: JsonObject) {
    return thisComponent().notify(caller, notification, params);
}

export function onEvent(caller: ComponentInstance, event: string, listener: (params?: JsonObject) => Promise<void> | void) {
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
    return ${generateLabelName(component, false)}.notify(thisComponent(), "${name}", params);
}
`;
    }

    generateEvent(component: string, event: object, name: string) {
        this.externalComponent ??= component;
        const label = generateComponentLabelName(component, name, true);
        if (Object.keys(event).length == 0) {
            this.body += `export function on${label}(handler: () => Promise<void> | void) {
    return ${generateLabelName(component, false)}.onEvent(thisComponent(), "${name}", handler as any);
}
`;
            return;
        }
        this.body += `export function on${label}(handler: (event: ${label}Event) => Promise<void> | void) {
    return ${generateLabelName(component, false)}.onEvent(thisComponent(), "${name}", handler as any);
}
`;
    }

    generateView(_component: string, _path: string, name: string) {
        this.viewBody += `
export function push${name}View(target: Window, params: ${name}Props) {
    return target.pushView("${name}", params);
}

export function set${name}View(target: Window, params: ${name}Props) {
    return target.setView("${name}", params);
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
${this.viewBody && "import { Window } from '$core/Window';"}

${this.body}
${this.viewBody}
`;
    }
};


class ServerPrivateApiGenerator implements ContributionGenerator {
    private body = '';
    private callBody = '';
    private notifyBody = '';
    private viewBody = '';
    private interfaceBody = '';
    private settingBody = `
    async get() { return core.settingsGet({ path: "" }); },
    async set(value: Json) { return core.settingsSet({ path: "", value }); },
`;

    generateEvent(component: string, event: object, name: string) {
        const label = generateComponentLabelName(component, name, true);
        if (Object.keys(event).length == 0) {
            this.body += `
export function send${label}Event(receiver: Component) {
    return receiver.sendEvent("${name}");
}
export function emit${label}Event() {
    return thisComponent().emitEvent("${name}");
}
\n`;
            return;
        }

        this.body += `
export function send${label}Event(receiver: Component, params: ${label}Event) {
    return receiver.sendEvent("${name}", params);
}
export function emit${label}Event(params: ${label}Event) {
    return thisComponent().emitEvent("${name}", params);
}\n`;
    }

    generateMethod(component: string, method: object, name: string) {
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
        this.viewBody += `
export function push${name}View(target: Window, params: ${name}Props) {
    return target.pushView("${name}", params);
}

export function set${name}View(target: Window, params: ${name}Props) {
    return target.setView("${name}", params);
}
`;
    }

    generateSetting(component: string, _setting: object, name: string) {
        this.settingBody += `
    async set${generateLabelName(name, true)}(value: Json) {
        return await core.settingsSet({ path: "${name}", value });
    },
    async get${generateLabelName(name, true)}() {
        return await core.settingsGet({ path: "${name}" });
    },
`;
    }

    generateInterface(component: string, iface: object, name: string) {
        const uLabel = generateLabelName(name, true);
        this.interfaceBody += `
export class ${uLabel}Interface {
    constructor(private id: number) {}

${"methods" in iface ? iface.methods && Object.keys(iface.methods).map(method => {
    const methodTypeLabel = generateComponentLabelName(component, method, true);
    if ("params" in (iface.methods as any)[method]) {
        return `    async ${generateLabelName(method, false)}(request: ${methodTypeLabel}Request): Promise<${methodTypeLabel}Response> {
        return (await core.objectCall({ object: this.id, method: "${method}", params: request})).result as ${methodTypeLabel}Response;
    }
`
    } else {
        return `    async ${generateLabelName(method, false)}(): Promise<${methodTypeLabel}Response> {
        return (await core.objectCall({ object: this.id, method: "${method}", params: {}})).result as ${methodTypeLabel}Response;
    }
`
    }
}).join("\n") : ""}
${"notifications" in iface ? iface.notifications && Object.keys(iface.notifications).map(notification => {
    const methodTypeLabel = generateComponentLabelName(component, notification, true);
    if ("params" in (iface.notifications as any)[notification]) {
        return `    async ${generateLabelName(notification, false)}(request: ${methodTypeLabel}Request) {
        return core.objectNotify({ object: this.id, notification: "${notification}", params: request});
    }
`
    } else {
        return `    async ${generateLabelName(notification, false)}() {
        return core.objectNotify({ object: this.id, notification: "${notification}", params: {}});
    }
`
    }
}).join("\n") : ""}
    destroy() {
        return core.objectDestroy({ object: this.id });
    }

    async getName() {
        return (await core.objectGetName({ object: this.id })).name;
    }

    getId() {
        return this.id;
    }
};

export async function get${uLabel}Objects() {
  return (await core.objectGetList({ interface: "${component}/${name}" })).objects.map(id => new ${uLabel}Interface(id));
}
export async function find${uLabel}Object(name: string) {
  return new ${uLabel}Interface((await core.objectFind({ interfaceName: "${component}/${name}", objectName: name })).object);
}
export async function create${uLabel}Object(name: string) {
  return new ${uLabel}Interface((await core.objectCreate({ interface: "${component}/${name}", name })).object);
}
export function on${uLabel}Created(handler: (object: ${uLabel}Interface) => Promise<void> | void) {
    return core.onObjectCreated((params) => {
        if (params.interface == "${component}/${name}") {
            handler(new ${uLabel}Interface(params.object));
        }
    });
}
export function onAny${uLabel}Created(handler: () => Promise<void> | void) {
    return core.onObjectCreated((params) => {
        if (params.interface == "${component}/${name}") {
            handler();
        }
    });
}
`;
    }


    toString(): string {
        if (this.body.length === 0) {
            return `${generatedHeader}
import { createError } from "$core/Error";
import { Component } from "$core/Component";
import * as core from "$core";
${this.viewBody && "import { Window } from '$core/Window';"}

export async function call(_caller: Component, _method: string, _params: JsonObject | undefined): Promise<JsonObject | void> {
    throw createError(ErrorCode.MethodNotFound);
}

export async function notify(_caller: Component, _method: string, _params: JsonObject | undefined) {
    throw createError(ErrorCode.MethodNotFound);
}

export const settings = {${this.settingBody}};
${this.viewBody}
`;
        }

        return `${generatedHeader}
${this.callBody.length > 0 || this.notifyBody.length > 0 ? 'import * as impl from "$/main";' : ""}
import { createError } from "$core/Error";
import { Component } from "$core/Component";
import { thisComponent } from "$/component-info";
import * as core from "$core";
${this.viewBody && "import { Window } from '$core/Window';"}
export { thisComponent } from "$/component-info";

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

${this.interfaceBody}

export const settings = {${this.settingBody}};

${this.viewBody}
`;
    }
}

class RendererComponentApiGenerator implements ContributionGenerator {
    private body = '';
    private component = '';

    generateMethod(component: string, method: object, name: string) {
        if ("virtual" in method && method.virtual === true) {
            return;
        }

        this.component = component;

        const label = generateComponentLabelName(component, name, false);
        const uLabel = generateComponentLabelName(component, name, true);
        this.body += `
export async function ${label}(params: ${uLabel}Request): Promise<${uLabel}Response> {
    return bridge.call("${component}/${name}", params);
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
    return bridge.invoke("${component}/${name}", params);
}
`;
    }

    generateEvent(component: string, event: object, name: string) {
        this.component = component;
        const label = generateComponentLabelName(component, name, true);
        this.body += "\n";

        if (Object.keys(event).length == 0) {
            this.body += `export function on${label}(handler: () => Promise<void> | void) {`;
        } else {
            this.body += `export function on${label}(handler: (event: ${label}Event) => Promise<void> | void) {`;
        }

        this.body += `
    return bridge.onEvent("${component}/${name}", handler);
}
`;
    }

    generateView(component: string, _path: string, name: string) {
        this.component = component;
        this.body += `
export function push${name}View(params: ${name}Props) {
    return bridge.viewPush("${name}", params);
}

export function set${name}View(params: ${name}Props) {
    return bridge.viewSet("${name}", params);
}
`;
    }

    toString(): string {
        if (this.body.length === 0) {
            return `${generatedHeader}export { };\n`;
        }

        return `${generatedHeader}
import * as bridge from '$core/bridge';

${this.body}
${this.component == "core" ? `
export function popView() {
    return bridge.viewPop();
}
` : ''}

`;
    }
};

export async function generateContributions<Params extends any[], RT extends ContributionGenerator>(component: Component, Generator: new (...params: Params) => RT, ...params: Params) {
    const generator = new Generator(...params);
    const contributions = component.manifest.contributions ?? {};

    if (typeof contributions !== 'object' || Array.isArray(contributions) || !contributions) {
        throw new Error('contributions must be object');
    }

    contributions.events = contributions.events ?? {};

    await Promise.all(Object.keys(contributions).map(async contributionType => {
        const contribution = (contributions as Record<string, Record<string, any>>)[contributionType];
        switch (contributionType) {
            case "methods":
                await Promise.all(Object.keys(contribution).map(async name => {
                    if (generator.generateMethod) {
                        try {
                            await generator.generateMethod(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
                break;

            case "notifications":
                await Promise.all(Object.keys(contribution).map(async name => {
                    if (generator.generateNotification) {
                        try {
                            await generator.generateNotification(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
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

                await Promise.all(Object.keys(events).map(async name => {
                    if (generator.generateEvent) {
                        try {
                            await generator.generateEvent(component.manifest.name, events[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
                break;
            }

            case "types":
                await Promise.all(Object.keys(contribution).map(async name => {
                    if (generator.generateType) {
                        try {
                            await generator.generateType(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
                break;

            case "views":
                await Promise.all(Object.keys(contribution).map(async name => {
                    if (generator.generateView) {
                        try {
                            await generator.generateView(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
                break;

            case "settings":
                await Promise.all(Object.keys(contribution).map(async name => {
                    if (generator.generateSetting) {
                        try {
                            await generator.generateSetting(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
                break;

            case "interfaces":
                await Promise.all(Object.keys(contribution).map(async name => {
                    const ifaceContribution = contribution[name];
                    await Promise.all(Object.keys(ifaceContribution).map(async ifaceContributionName => {
                        const iface = ifaceContribution[ifaceContributionName];
                        switch (ifaceContributionName) {
                            case "methods": {
                                if (!iface || typeof iface != 'object') {
                                    throw new Error(`${name}: interface methods must be object. ${iface}`);
                                }

                                const gen = generator.generateMethod?.bind(generator);
                                if (gen) {
                                    await Promise.all(Object.keys(iface).map(async method => {
                                        const object = iface[method];
                                        if (typeof object != 'object') {
                                            throw new Error(`${name}: interface method ${method} must be object`);
                                        }

                                        object.virtual = true;

                                        await gen(component.manifest.name, object, method);
                                    }));
                                }

                                break;
                            }

                            case "notifications": {
                                if (!iface || typeof iface != 'object') {
                                    throw new Error(`${name}: interface notifications must be object. ${iface}`);
                                }

                                const gen = generator.generateNotification?.bind(generator);

                                if (gen) {
                                    await Promise.all(Object.keys(iface).map(async notification => {
                                        const object = iface[notification];
                                        if (typeof object != 'object') {
                                            throw new Error(`${name}: interface method ${notification} must be object`);
                                        }

                                        object.virtual = true;

                                        await gen(component.manifest.name, object, notification);
                                    }));
                                }

                                break;
                            }

                            default:
                                throw new Error(`unknown interface contribution ${ifaceContributionName}`);
                        }
                    }));

                    if (generator.generateInterface) {
                        try {
                            await generator.generateInterface(component.manifest.name, contribution[name], name);
                        } catch (e) {
                            throw `${name}: ${e}`;
                        }
                    }
                }));
                break;

            default:
                throw `unexpected contribution ${contributionType}`;
        }
    }));

    return generator;
}

type TsGeneratorConfig = {
    outDir: string;
    buildDir: string;
};

export class TsLibGenerator implements ProjectGenerator {
    name = "TsLibGenerator";
    projectId = "lib";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return projectId == "lib";
    }

    async generateTypesFile(project: Project, fileDb: FileDb) {
        const projectPath = path.join(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = path.join(projectPath, "src");
        const generatedFilePath = path.join(genDir, "types.d.ts");
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = (await generateContributions(project.component, TypesGenerator)).toString();
            } catch (e) {
                throw Error(`${project.component.manifest.name}: ${e}`);
            }
        }
    }

    async generateEnumsFile(project: Project, fileDb: FileDb) {
        const projectPath = path.join(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = path.join(projectPath, "src");
        const generatedFilePath = path.join(genDir, "enums.ts");
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = (await generateContributions(project.component, EnumsGenerator)).toString();
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

export class RendererApiGenerator implements ProjectGenerator {
    name = "RendererApiGenerator";
    projectId = "server";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return projectId == "lib";
    }

    async generateProjects(project: Project, fileDb: FileDb) {
        const projectName = "server-renderer-api";
        const generatedFileName = "api.ts";
        const newProjectPath = path.join(this.config.outDir, project.component.manifest.name, projectName);
        const genDir = path.join(newProjectPath, "src");
        const generatedFilePath = path.join(genDir, generatedFileName);
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);


        if (generatedFile) {
            try {
                generatedFile.content = (await generateContributions(project.component, RendererComponentApiGenerator)).toString();
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

export class TsServerGenerator implements ProjectGenerator {
    name = "TsServerGenerator";
    projectId = "server";

    constructor(private config: TsGeneratorConfig) { }

    shouldImport(projectId: string) {
        return ["lib"].includes(projectId);
    }

    async generateContributionFile<Params extends any[]>(sourceComponent: Component, project: Project, fileDb: FileDb, generatedFileName: string, Generator: new (...params: Params) => ContributionGenerator, ...params: Params) {
        const projectPath = path.join(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = path.join(projectPath, "src");
        const generatedFilePath = path.join(genDir, generatedFileName);
        const generatedFile = await fileDb.createFile(generatedFilePath, sourceComponent.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = (await generateContributions(sourceComponent, Generator, ...params)).toString();
            } catch (e) {
                throw Error(`${sourceComponent.manifest.name}: ${e}`);
            }
        }
    }

    async generateProject<Params extends any[]>(project: Project, fileDb: FileDb, projectName: string, generatedFileName: string, Generator: new (...params: Params) => ContributionGenerator, ...params: Params) {
        const newProjectPath = path.join(this.config.outDir, project.component.manifest.name, projectName);
        const genDir = path.join(newProjectPath, "src");
        const generatedFilePath = path.join(genDir, generatedFileName);
        const generatedFile = await fileDb.createFile(generatedFilePath, project.component.manifestFile);

        if (generatedFile) {
            try {
                generatedFile.content = (await generateContributions(project.component, Generator, ...params)).toString();
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
        const outDir = path.join(this.config.outDir, project.component.manifest.name, project.name);
        const genDir = path.join(outDir, "src");
        const componentFilePath = path.join(genDir, "component-info.ts");
        const componentManifest = await fileDb.createFile(componentFilePath, project.component.manifestFile);

        if (componentManifest) {
            const serverManifest = createServerManifest(project.component.manifest, project.component.workspace);
            componentManifest.content = `${generatedHeader}
import { getComponent } from '$core/ComponentInstance';

export const manifest = Object.freeze(${JSON.stringify(serverManifest, null, 4)});

export function thisComponent() {
  return getComponent(manifest);
}
`;
        }
    }

    async generateComponentInfoProject(project: Project, fileDb: FileDb) {
        const projectName = "component-info";
        const newProjectPath = path.join(this.config.outDir, project.component.manifest.name, projectName);
        const genDir = path.join(newProjectPath, "src");
        const generatedFilePath = path.join(genDir, "component-info.ts");

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

        const outDir = path.join(this.config.outDir, manifest.name, componentProjectName);
        const genDir = path.join(outDir, "src");
        const genFilePath = path.join(genDir, "component.ts");

        const componentFile = await fileDb.createFile(genFilePath, component.manifestFile);
        const componentLabel = generateLabelName(manifest.name, true);

        const mainFile = path.join(serverProject.rootDir, "main.ts");

        try {
            if (!(await fs.stat(path.toNative(mainFile))).isFile()) {
                throw new Error(`server component must declare entry file, but '${mainFile}' is not a file`);
            }
        } catch {
            throw new Error(`server component must declare entry file, but '${mainFile}' not found`);
        }

        if (componentFile) {
            const mainFile = path.join(serverProject.rootDir, "main");
            componentFile.content = `${generatedHeader}
import * as api from '$';
import { IComponentImpl, registerComponent } from '$core/ComponentInstance';
import { ComponentContext, Component } from '$core/Component';
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

export class TsServerMainGenerator implements ComponentGenerator {
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
        const outDir = path.join(this.config.outDir, componentName);
        const manifest: ComponentInfo = {
            name: componentName
        };

        const manifestPath = path.join(outDir, componentManifestName);
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
        const outDir = path.join(serverComponent.path, projectName);
        const genDir = path.join(outDir, "src");
        const project: Project = {
            component: serverComponent,
            name: projectName,
            rootDir: genDir,
            dependencies: [],
            include: [
                path.join(genDir, "*.json"),
                path.join(genDir, "*.ts")
            ],
            exclude: [],
        };

        serverComponents.forEach(component => {
            project.dependencies.push(component.projects['component']);

            if (component.manifest.name == "core") {
                project.dependencies.push(component.projects['server']);
            }
        });

        const startupFile = await fileDb.createFile(path.join(genDir, "startup.ts"), mergeTimestamps(serverComponents.map(x => x.manifestFile)));
        if (startupFile) {
            startupFile.content = `${generatedHeader}
import { activateComponentByName } from '$core/ComponentInstance';
${serverComponents.map(x => `import { register${generateLabelName(x.manifest.name, true)}Component } from '$${x.manifest.name}/component'`).join(";\n")};

${serverComponents.map(x => `   register${generateLabelName(x.manifest.name, true)}Component()`).join(";\n")};

export function startup() {
    return activateComponentByName("core");
}
`;
        }

        const mainFile = await fileDb.createFile(path.join(genDir, "main.ts"), mergeTimestamps(serverComponents.map(x => x.manifestFile)));
        if (mainFile) {
            mainFile.content = `${generatedHeader}
import { startup } from './startup';

startup();
`;
        }

        return project;
    }
};

export class ReactRendererGenerator implements ComponentGenerator {
    name = "ReactRendererGenerator";
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
            for (const item of await fs.readdir(path.toNative(path.join(project.component.path, project.name)), { recursive: false, withFileTypes: true })) {
                if (!item.isDirectory()) {
                    continue;
                }

                switch (item.name) {
                    case "locales":
                        localesPaths.push(path.join(item.parentPath, item.name));
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

        const expoComponent = await this.generateExpoComponent(workspace, fileDb);
        await this.generateLocalesProject(fileDb, expoComponent, localesPaths);
        await this.generateNavigationProject(workspace, fileDb, expoComponent, rendererWithViewProjects);
        return [expoComponent];
    }

    async generateExpoComponent(workspace: Workspace, fileDb: FileDb): Promise<Component> {
        const componentName = "rpcsx-ui-expo";
        const outDir = path.join(this.config.outDir, componentName);
        const manifest: ComponentInfo = {
            name: componentName
        };

        const manifestPath = path.join(outDir, componentManifestName);
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
            dependencies: [workspace["core"]]
        };

        return component;
    }

    async generateLocalesProject(fileDb: FileDb, expoComponent: Component, localesPaths: string[]): Promise<Project> {
        const locales: Record<string, object> = {};
        const sourceTimestamps: Record<string, Timestamp> = {};

        await Promise.all(localesPaths.map(async localesPath => {
            for (const item of await fs.readdir(path.toNative(localesPath), { recursive: false, withFileTypes: true })) {
                if (!item.isFile()) {
                    continue;
                }

                if (!item.name.endsWith(".json")) {
                    continue;
                }

                const sourceFile = await fileDb.readFile(path.toNative(path.join(item.parentPath, item.name)));
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
        const genDir = path.join(expoComponent.path, projectName);
        const project: Project = {
            component: expoComponent,
            name: projectName,
            rootDir: genDir,
            dependencies: [],
            include: [
                path.join(genDir, "*.json"),
                path.join(genDir, "*.ts")
            ],
            exclude: [],
        };

        for (const locale in locales) {
            const mergedFile = await fileDb.createFile(path.join(genDir, locale), sourceTimestamps[locale]);

            if (mergedFile) {
                mergedFile.content = JSON.stringify(locales[locale], null, 4);
            }
        }

        const i18n = await fileDb.createFile(path.join(genDir, "i18n.ts"), mergeTimestamps(Object.values(sourceTimestamps)));
        if (i18n) {
            i18n.content = `${generatedHeader}
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
${Object.keys(locales).map(x => `${path.parse(x).name}: { translation: import("./${x}") }`).join(",\n")};
};

i18n.use(initReactI18next)
    .use(LanguageDetector)
    .init({
        resources,
        detection: {
            order: ['querystring', 'navigator'],
            lookupQuerystring: 'lng'
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
`;
        }

        expoComponent.projects[project.name] = project;
        return project;
    }

    async generateNavigationProject(workspace: Workspace, fileDb: FileDb, expoComponent: Component, rendererWithViewProjects: Project[]): Promise<Project> {
        const projectName = "navigation";
        const views: Record<string, string> = {};
        const outDir = path.join(expoComponent.path, projectName);
        const genDir = path.join(outDir, "src");
        const include = [
            path.join(genDir, "**", "*.tsx")
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
            const filePath = path.join(genDir, "views.json");
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
            const genDir = path.join(this.config.outDir, project.component.manifest.name, "lib", "src");
            const viewTypesPath = path.join(genDir, "views.d.ts");

            const viewTypes = await fileDb.createFile(viewTypesPath, viewsListFile);
            if (!viewTypes) {
                return;
            }

            if (views.length === 0) {
                viewTypes.content = `${generatedHeader}`;
            } else {
                viewTypes.content = `${generatedHeader}
import { ComponentProps } from 'react';
${views.map(view => `import type { ${view.name} } from "${path.relative(genDir, view.path)}"`).join(";\n")};

declare global {
    ${views.map(view => `type ${view.name}Props = ComponentProps<typeof ${view.name}>`).join(";\n")};
}
`;
            }
        }));

        const pathWithoutExt = (importFile: string) => {
            const parsed = path.parse(path.relative(genDir, importFile));
            return path.join(parsed.dir, parsed.name);
        };

        const startupFile = await fileDb.createFile(path.join(genDir, "startup.ts"), viewsListFile);

        if (startupFile) {
            startupFile.content = `${generatedHeader}
// for android/ios we have merged renderer and ui context, call server entry point here
import { startup as impl } from '../../../rpcsx-ui-server/server-main/src/startup';

export function startup(): Promise<void> {
    return impl();
}
`;
        }

        const startupWebFile = await fileDb.createFile(path.join(genDir, "startup.web.ts"), viewsListFile);

        if (startupWebFile) {
            startupWebFile.content = `${generatedHeader}
// for web startup handled by electron
export async function startup() {
}
`;
        }

        const indexFile = await fileDb.createFile(path.join(genDir, "index.tsx"), viewsListFile);

        if (indexFile) {
            indexFile.content = `${generatedHeader}
import { main } from '$core/main';
import { startup } from './startup';

${Object.keys(views).map(x => `import { ${x} } from '${pathWithoutExt(views[x])}'`).join(';\n')};

const serverInitializationPromise = startup();

const builtinViews: Record<string, (...props: any[]) => React.JSX.Element> = {
${Object.keys(views).map(x => `    "${x}": ${x}`).join(',\n')}
};

main(builtinViews, serverInitializationPromise);
`;
        }

        const project: Project = {
            component: expoComponent,
            name: projectName,
            rootDir: genDir,
            dependencies: [...rendererWithViewProjects, workspace["core"].projects["renderer"], workspace["core"].projects["lib"]],
            include,
            exclude: [],
        };

        expoComponent.projects[project.name] = project;
        return project;
    }
};

export type TsProjectInfo = {
    project: Project;
    include: string[];
    exclude: string[];
    paths: Record<string, string[]>;
};

type TsConfigGeneratorConfig = {
    outDir: string;
    buildDir: string;
    projectRootDir: string;
    projectInfos: TsProjectInfo[];
};

export class TsConfigGenerator implements ConfigGenerator {
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

            if (projectPath.endsWith(path.sep)) {
                appendProjectPathImpl(name + path.sep, projectPath);
                appendProjectPathImpl(path.join(name, '*'), path.join(projectPath, '*'));
            } else {
                appendProjectPathImpl(name, projectPath);
            }
        };

        const appendProjectReferencePath = (sourceProject: Project, projectPath: string) => {
            appendProjectPath(`$${path.join(sourceProject.component.manifest.name)}`, projectPath);
        };

        const appendSelfProjectPath = (name: string, projectPath: string) => {
            appendProjectPath(name, projectPath);
            appendProjectPath('$', projectPath);
            appendProjectPath(`$${project.component.manifest.name}`, projectPath);
        };

        const getGenDir = (project: Project) => {
            return path.join(this.config.outDir, project.component.manifest.name, project.name, "src");
        };

        try {
            for (const item of await fs.readdir(path.toNative(project.rootDir), { recursive: false, withFileTypes: true })) {
                if (item.isDirectory() && !shouldIgnoreDir(item.name)) {
                    appendSelfProjectPath(item.name, path.join(item.parentPath, item.name) + path.sep);
                }
            }
        } catch { /* empty */ }

        const outDir = path.join(this.config.outDir, project.component.manifest.name, project.name);

        const include = [...project.include];
        const exclude = [...project.exclude];

        if (project.rootDir != outDir) {
            include.push(
                path.join(project.rootDir, "**", "*.ts"),
                path.join(project.rootDir, "**", "*.js"),
                path.join(project.rootDir, "**", "*.d.ts"),
            );
        }

        const genDir = path.join(outDir, "src");
        if (genDir != project.rootDir) {
            include.push(
                path.join(genDir, "**", "*.ts"),
                path.join(genDir, "**", "*.js"),
                path.join(genDir, "**", "*.d.ts"),
            );
        }

        let config: object;
        if (["renderer", "navigation", "server-renderer-api"].includes(project.name)) {
            include.push(
                path.relative(outDir, path.join(project.rootDir, "**", "*.tsx")),
                path.relative(outDir, path.join(this.config.projectRootDir, ".expo", "types", "**", "*.ts")),
                path.relative(outDir, path.join(this.config.projectRootDir, "expo-env.d.ts")),
            );

            exclude.push(
                path.join(project.rootDir, "**", "*.svelte"), // FIXME: remove
                path.join(project.rootDir, "routes", "**", "*.ts"),
                path.join(project.rootDir, "routes", "**", "*.js"),
                path.join(project.rootDir, "locales", "**", "*.json"),
            );

            config = {
                extends: "expo/tsconfig.base"
            };
        } else {
            config = {
                compilerOptions: {
                    jsx: "react-native",
                    target: "ESNext",
                    module: "ESNext",
                    moduleResolution: "bundler",
                    lib: ["ESNext"]
                }
            };
        }

        const references: object[] = [];

        project.dependencies.forEach(dep => {
            const depOutDir = path.join(this.config.outDir, dep.component.manifest.name, dep.name);
            const depGenDir = path.join(depOutDir, "src");

            references.push({
                path: path.relative(outDir, path.join(depOutDir, "tsconfig.json"))
            });

            if (dep.component == project.component) {
                if (dep.name == "server" || dep.name == "server-renderer-api") {
                    appendSelfProjectPath(dep.name, path.join(depGenDir, "api.ts"));
                }

                appendSelfProjectPath(dep.name, dep.rootDir + path.sep);
                if (depGenDir != dep.rootDir) {
                    appendSelfProjectPath(dep.name, depGenDir + path.sep);
                }
            } else {
                appendProjectReferencePath(dep, dep.rootDir + path.sep);
                if (depGenDir != dep.rootDir) {
                    appendProjectReferencePath(dep, depGenDir + path.sep);
                }

                if (dep.name == "server-renderer-api") {
                    appendProjectReferencePath(dep, path.join(depGenDir, "api.ts"));
                }
            }

            include.push(path.relative(outDir, path.join(dep.rootDir, "**", "*.d.ts")),);

            if (dep.rootDir != depGenDir) {
                include.push(path.relative(outDir, path.join(depGenDir, "**", "*.d.ts")));
            }
        });

        if (project.name == "server") {
            appendProjectPath('$', project.rootDir + path.sep);
            appendProjectPath(`$${project.component.manifest.name}`, project.rootDir + path.sep);

            appendSelfProjectPath(project.name, path.join(genDir, "api.ts"));

            if (project.rootDir != genDir) {
                appendSelfProjectPath(project.name, genDir + path.sep);
            }

            project.component.dependencies.forEach(depComponent => {
                const server = depComponent.projects["server"];
                if (server) {
                    appendProjectReferencePath(server, path.join(genDir, `${server.component.manifest.name}.ts`));
                    appendProjectPath(`$${path.join(depComponent.manifest.name)}/api`, path.join(depComponent.projects["server-public-api"].rootDir, "api.ts"));
                }
            });
        } else if (project.name == "server-renderer-api") {
            const render = project.component.projects["renderer"];
            if (render) {
                include.push(path.relative(outDir, path.join(render.rootDir, "**", "*.d.ts")));
                const genDir = getGenDir(render);
                if (render.rootDir != genDir) {
                    include.push(path.relative(outDir, path.join(genDir, "**", "*.d.ts")));
                }
            }

            project.component.dependencies.forEach(depComponent => {
                const render = depComponent.projects["renderer"];
                if (render) {
                    include.push(path.relative(outDir, path.join(render.rootDir, "**", "*.d.ts")));
                    const genDir = getGenDir(render);
                    if (render.rootDir != genDir) {
                        include.push(path.relative(outDir, path.join(genDir, "**", "*.d.ts")));
                    }
                }
            });
        }

        const configFile = await fileDb.createFile(path.join(outDir, "tsconfig.json"), project.component.manifestFile);

        if (configFile) {
            const tsconfig = mergeConfig(baseTsConfig, mergeConfig(config, {
                references,
                compilerOptions: {
                    paths: projectInfo.paths,
                    rootDir: path.relative(outDir, path.join(project.component.path, "..", "..", "..")),
                    rootDirs: [
                        path.relative(outDir, project.rootDir),
                        path.relative(outDir, genDir),
                    ].filter((value, index, array) => array.indexOf(value) == index),
                    outDir: path.relative(outDir, path.join(this.config.buildDir, project.component.manifest.name, project.name)),
                    tsBuildInfoFile: path.relative(outDir, path.join(this.config.outDir, ".info", project.component.manifest.name, project.name)),
                },
                include: include.map(p => path.relative(outDir, path.resolve(outDir, p))),
                exclude: exclude.map(p => path.relative(outDir, path.resolve(outDir, p))),
            }));

            configFile.content = JSON.stringify(tsconfig, null, 4);
        }

        projectInfo.include = include.map(p => path.resolve(outDir, p));
        projectInfo.exclude = exclude.map(p => path.resolve(outDir, p));

        this.config.projectInfos.push(projectInfo);
    }

    async processWorkspace(workspace: Workspace, fileDb: FileDb) {
        const configFile = await fileDb.createFile(
            path.join(this.config.outDir, "tsconfig.json"),
            mergeTimestamps(Object.values(workspace).map(component => component.manifestFile))
        );

        if (configFile) {
            const references: object[] = [];
            Object.values(workspace).forEach(component => {
                Object.keys(component.projects).forEach(projectName => {
                    references.push({
                        path: path.join(component.manifest.name, projectName, "tsconfig.json")
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

export const preloadGenerator: ProjectGenerator = {
    name: "PreloadGenerator",
    projectId: "preload",

    shouldImport(projectId: string) {
        return "lib" == projectId;
    }
};
