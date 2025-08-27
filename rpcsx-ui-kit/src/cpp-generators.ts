import { FileDb, mergeTimestamps } from "./FileDatabase.js";
import {
    Component,
    ConfigGenerator,
    ContributionGenerator,
    generateComponentLabelName,
    generateContributions,
    generateLabelName,
    Workspace
} from "./generators.js";

type CmakeGeneratorConfig = {
    outDir: string;
    libPrefix: string[];
    depLibs: string[];
};

function hasContributions(component: Component) {
    return component.manifest.contributions != undefined;
}

export class ExtensionApiGenerator implements ConfigGenerator {
    constructor(private config: CmakeGeneratorConfig) {
    }

    private getPrefix(sep: string) {
        return this.config.libPrefix.join(sep);
    }

    async processComponent(component: Component, fileDb: FileDb) {
        if (!hasContributions(component)) {
            return;
        }

        const componentPath = `${this.config.outDir}/${component.manifest.name}`;
        const includePath = `${componentPath}/include/${this.getPrefix("/")}`;
        const typesFile = await fileDb.createFile(`${includePath}/${component.manifest.name}/types.hpp`, component.manifestFile);
        const namespace = this.getPrefix("::");
        const fullName = this.getPrefix("-");

        if (typesFile) {
            try {
                typesFile.content = (await generateContributions(component, CppTypesGenerator, namespace, this.getPrefix("/"))).toString();
            } catch (e) {
                throw Error(`${component.manifest.name}: ${e}, ${e && typeof e == "object" && ("stack" in e) && Array.isArray(e.stack) && e.stack.join("\n")}`);
            }
        }

        const apiFile = await fileDb.createFile(`${includePath}/${component.manifest.name}/api.hpp`, component.manifestFile);

        if (apiFile) {
            try {
                apiFile.content = (await generateContributions(component, CppApiGenerator, namespace, component.manifest.name)).toString();
            } catch (e) {
                throw Error(`${component.manifest.name}: ${e}`);
            }
        }


        const mainFile = await fileDb.createFile(`${includePath}/${component.manifest.name}.hpp`, component.manifestFile);

        if (mainFile) {
            mainFile.content = `#pragma once

#include "${component.manifest.name}/types.hpp"
#include "${component.manifest.name}/api.hpp"
`;
        }

        const cmakeLists = await fileDb.createFile(`${componentPath}/CMakeLists.txt`, component.manifestFile);

        if (cmakeLists) {
            cmakeLists.content = `
add_library(${fullName}-${component.manifest.name} INTERFACE)
add_library(${namespace}::${component.manifest.name} ALIAS ${fullName}-${component.manifest.name})
target_include_directories(${fullName}-${component.manifest.name} INTERFACE include)
target_link_libraries(${fullName}-${component.manifest.name} INTERFACE
${component.dependencies.filter(x => hasContributions(x)).map(x => `    ${namespace}::${x.manifest.name}\n`).join("")}
${this.config.depLibs.join("\n")}
)
`;
        }
    }

    async processWorkspace(workspace: Workspace, fileDb: FileDb) {
        const components = Object.values(workspace).filter(p => hasContributions(p));

        const timestamp = mergeTimestamps(components.map(x => x.manifestFile));
        const cmakeLists = await fileDb.createFile(
            `${this.config.outDir}/CMakeLists.txt`,
            timestamp
        );


        if (cmakeLists) {
            cmakeLists.content = `
${components.map(x => `add_subdirectory(${x.manifest.name})\n`).join("")}

add_library(${this.getPrefix("-")} INTERFACE)
add_library(${this.getPrefix("::")} ALIAS ${this.getPrefix("-")})
target_include_directories(${this.getPrefix("-")} INTERFACE include)
target_link_libraries(${this.getPrefix("-")} INTERFACE
${components.map(x => `    ${this.getPrefix("::")}::${x.manifest.name}\n`).join("")}
)
`;
        }

        const interfaceFile = await fileDb.createFile(
            `${this.config.outDir}/include/${this.getPrefix("-")}.hpp`,
            timestamp
        );

        if (interfaceFile) {
            interfaceFile.content = `#pragma once

${components.map(x => `#include <${this.getPrefix("/")}/${x.manifest.name}.hpp>`).join("\n")}
`
        }
    }
};

class CppTypesGenerator implements ContributionGenerator {
    generatedTypes: Record<string, string> = {};
    includes = new Set<string>();
    constructor(private namespace: string, private libPath: string) {
    }

    toString() {
        let result = '#pragma once\n\n';
        result += [...this.includes].map(x => `#include <${x}>`).join("\n");
        result += `\n\nnamespace ${this.namespace} {\n`;
        result += Object.values(this.generatedTypes).join("\n");
        return result + `\n} // namespace ${this.namespace}\n`;
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

                paramsType += `struct ${labelName} {\n${this.generateObjectBody(component, type.params)}};\n\n`;
                paramsType += this.generateObjectSerializer(labelName, type.params);
                paramsType += this.generateObjectDeserializer(labelName, type.params);
            } else if (type.type === "enum") {
                if (!("enumerators" in type)) {
                    throw `${type}: enumerators must be present`;
                }

                if ((typeof type.enumerators != 'object') || !type.enumerators) {
                    throw `${type.enumerators}: must be object`;
                }

                paramsType += `enum class ${labelName} {\n${this.generateEnumBody(type.enumerators)}};\n`;
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

            const fieldLabel = generateLabelName(fieldName, false);
            let fieldType = this.getTypeName(component, param.type, param);

            if (isOptional) {
                this.addInclude("optional");
                fieldType = `std::optional<${fieldType}>`;
            }

            body += `  ${fieldType} ${fieldLabel};\n`;
        });

        return body;
    }

    generateMethod(component: string, method: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const requestTypeName = `${labelName}Request`;
        const responseTypeName = `${labelName}Response`;

        if (!(requestTypeName in this.generatedTypes)) {
            let paramsType = '';
            paramsType += `struct ${requestTypeName} {\n`;
            if ("params" in method && method.params && typeof method.params == "object") {
                paramsType += this.generateObjectBody(component, method.params);
            }
            paramsType += "};\n";
            paramsType += this.generateObjectSerializer(requestTypeName, "params" in method ? method.params ?? {} : {});
            paramsType += this.generateObjectDeserializer(requestTypeName, "params" in method ? method.params ?? {} : {});
            this.generatedTypes[requestTypeName] = paramsType;
        } else {
            throw new Error(`${name}: type ${requestTypeName} already declared`);
        }

        if (!(responseTypeName in this.generatedTypes)) {
            let responseType = `struct ${responseTypeName} {\n`;
            if ("returns" in method && method.returns && typeof method.returns == "object") {
                responseType += this.generateObjectBody(component, method.returns);
            }
            responseType += "};\n";
            responseType += this.generateObjectSerializer(responseTypeName, "returns" in method ? method.returns ?? {} : {});
            responseType += this.generateObjectDeserializer(responseTypeName, "returns" in method ? method.returns ?? {} : {});

            this.generatedTypes[responseTypeName] = responseType;
        } else {
            throw new Error(`${name}: type ${responseTypeName} already declared`);
        }

        this.generatedTypes[labelName] = `struct ${labelName} {
    using Request = ${requestTypeName};
    using Response = ${responseTypeName};
};
`
    }

    generateNotification(component: string, notification: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const requestTypeName = `${labelName}Request`;

        if (!(requestTypeName in this.generatedTypes)) {
            let paramsType = `struct ${requestTypeName} {\n`;
            if ("params" in notification && notification.params && typeof notification.params == "object") {
                paramsType += this.generateObjectBody(component, notification.params);
            }
            paramsType += "};\n";
            paramsType += this.generateObjectSerializer(requestTypeName, "params" in notification ? notification.params ?? {} : {});
            paramsType += this.generateObjectDeserializer(requestTypeName, "params" in notification ? notification.params ?? {} : {});
            this.generatedTypes[requestTypeName] = paramsType;
        } else {
            throw new Error(`${name}: type ${requestTypeName} already declared`);
        }

        this.generatedTypes[labelName] = `struct ${labelName} {
    using Request = ${requestTypeName};
};
`
    }

    generateInterface(component: string, iface: object, name: string) {
        const labelName = generateComponentLabelName(component, name + "-interface", true);
        this.generatedTypes[labelName] = `struct ${labelName} {
    static constexpr auto kInterfaceId = "${component}/${name}";
    using InterfaceType = ${labelName};

    virtual ~${labelName}() = default;

${"methods" in iface ? iface.methods && Object.keys(iface.methods).map(method => {
            const methodTypeLabel = generateComponentLabelName(component, method, true);
            if ("params" in (iface.methods as any)[method]) {
                return `    virtual ${methodTypeLabel}Response ${generateLabelName(method, false)}(const ${methodTypeLabel}Request &request) = 0;`
            } else {
                return `    virtual ${methodTypeLabel}Response ${generateLabelName(method, false)}() = 0;`
            }
        }).join("\n") : ""}
${"notifications" in iface ? iface.notifications && Object.keys(iface.notifications).map(notification => {
            const methodTypeLabel = generateComponentLabelName(component, notification, true);
            if ("params" in (iface.notifications as any)[notification]) {
                return `    virtual void ${generateLabelName(notification, false)}(const ${methodTypeLabel}Request &request) = 0;`
            } else {
                return `    virtual void ${generateLabelName(notification, false)}() = 0;`
            }
        }).join("\n") : ""}
        
    struct Builder {
        template<typename ObjectBuilder>
        static void build(ObjectBuilder &builder) {
${"methods" in iface ? iface.methods && Object.keys(iface.methods).map(method => {
            if ("params" in (iface.methods as any)[method]) {
                return `
            builder.addMethodHandler("${method}",  [](void *object, const nlohmann::json &request) {
                return nlohmann::json(static_cast<${labelName} *>(object)->${generateLabelName(method, false)}(request));
            });`

            } else {
                return `
            builder.addMethodHandler("${method}",  [](void *object, const nlohmann::json &) {
                return nlohmann::json(static_cast<${labelName} *>(object)->${generateLabelName(method, false)}());
            });`
            }
        }).join("\n") : ""}
${"notifications" in iface ? iface.notifications && Object.keys(iface.notifications).map(notification => {
            if ("params" in (iface.notifications as any)[notification]) {
                return `
            builder.addNotificationHandler("${notification}",  [](void *object, const nlohmann::json &request) {
                static_cast<${labelName} *>(object)->${generateLabelName(notification, false)}(request);
            });`

            } else {
                return `
            builder.addNotificationHandler("${notification}",  [](void *object, const nlohmann::json &) {
                static_cast<${labelName} *>(object)->${generateLabelName(notification, false)}();
            });`
            }
        }).join("\n") : ""}

        }
    };
};
`
    }

    generateEvent(component: string, event: object, name: string) {
        const labelName = generateComponentLabelName(component, name, true);
        const typeName = `${labelName}Event`;

        if (!(typeName in this.generatedTypes)) {
            if (typeof event == 'object') {
                let paramsType = `struct ${typeName} {\n`;
                paramsType += this.generateObjectBody(component, event);
                paramsType += "\n};\n"
                paramsType += this.generateObjectSerializer(typeName, event);
                paramsType += this.generateObjectDeserializer(typeName, event);
                this.generatedTypes[typeName] = paramsType;
            } else if (typeof event == 'string') {
                this.generatedTypes[typeName] = `using ${typeName} = ${this.getTypeName(component, event)};\n`;
            } else {
                throw new Error(`${name}: must be object or string`);
            }
        } else {
            throw new Error(`${name}: type ${typeName} already declared`);
        }
    }

    addInclude(include: string) {
        this.includes.add(include);
    }

    getTypeName(component: string, type: string, object?: object): string {
        switch (type) {
            case "string":
                this.addInclude("string")
                return "std::string";
            case "number":
                return "int";
            case "void":
                return "void";
            case "boolean":
                return "bool";
            case "json":
                this.addInclude("nlohmann/json.hpp");
                return "nlohmann::json";
            case "json-object":
                return "nlohmann::json::object_t";
            case "json-array":
                return "nlohmann::json::array_t";

            case "array":
                if (!object || !("item-type" in object) || typeof object["item-type"] != "string") {
                    throw new Error(`item-type must be defined for array`);
                }

                this.addInclude("vector");
                return `std::vector<${this.getTypeName(component, object["item-type"])}>`;

            default:
                if (type.startsWith("$")) {
                    const [refComponent, ...nameParts] = type.split("/");
                    const typeName = nameParts.join("/");
                    const refComponentName = refComponent.slice(1);
                    if (refComponentName != component) {
                        this.addInclude(`${this.libPath}/${refComponentName}.hpp`);
                    }

                    return generateComponentLabelName(refComponentName, typeName, true);
                }

                return generateComponentLabelName(component, type, true);
        }
    }

    generateObjectSerializer(typename: string, body: object): string {
        this.addInclude("nlohmann/json.hpp");

        return `inline void to_json(nlohmann::json &json, const ${typename} &value) {
    json = nlohmann::json::object_t{
${Object.keys(body).map(field => `        { "${generateLabelName(field, false)}", value.${generateLabelName(field, false)} }`).join(",\n")}
    };
}\n\n`;
    }

    generateObjectDeserializer(typename: string, body: object): string {
        this.addInclude("nlohmann/json.hpp");

        return `inline void from_json(const nlohmann::json &json, ${typename} &value) {
${Object.keys(body).map(field => {
            const label = generateLabelName(field, false);
            const fieldObject = (body as any)[field];
            const isOptional = ("optional" in fieldObject) && fieldObject.optional === true;
            if (!isOptional) {
                return `    json.at("${label}").get_to(value.${label});`;
            }
            return `    if (json.contains("${label}")) {
        value.${label} = json["${label}"].get<std::remove_reference_t<decltype(*value.${label})>>();
    } else {
        value.${label} = std::nullopt;
    }`;
        }).join("\n")}
}\n`;
    }
};

class CppApiGenerator implements ContributionGenerator {
    private content = '';
    constructor(private namespace: string, private componentName: string) {
    }

    toString() {
        const label = generateLabelName(this.componentName, true);

        return `#pragma once

#include "./types.hpp"
#include <functional>
#include <utility>
#include <type_traits>

namespace ${this.namespace} {
template <typename InstanceT> class ${label}Instance {
private:
    auto &extension() { return *static_cast<InstanceT *>(this); }
    auto &protocol() { return static_cast<InstanceT *>(this)->getProtocol(); }

public:${this.content}
};

struct ${label} {
    template <typename InstanceT>
    using instance = ${label}Instance<InstanceT>;
    static constexpr auto name = "${this.componentName}";
};
} // namespace ${this.namespace}
`;
    }

    generateMethod(component: string, method: object, name: string) {
        const uLabel = generateComponentLabelName(component, name, true);
        const label = generateComponentLabelName(component, name, false);
        const returnType = "returns" in method ? `${uLabel}Response` : '';
        const params = "params" in method ? `const ${uLabel}Request &params, ` : '';

        this.content += `
    auto ${label}(${params}std::function<void(${returnType})> result) {
        return protocol().call("${component}/${name}", ${params ? "params" : "{}"}, std::move(result));
    }`
    }

    generateNotification(component: string, notification: object, name: string) {
        const uLabel = generateComponentLabelName(component, name, true);
        const label = generateComponentLabelName(component, name, false);
        const params = "params" in notification ? `const ${uLabel}Request &params` : '';

        this.content += `
    void ${label}(${params}) {
        protocol().notify("${component}/${name}", ${params ? "params" : "{}"});
    }`
    }

    generateEvent(component: string, event: object, name: string) {
        const uLabel = generateComponentLabelName(component, name, true);
        let typeName = '';

        if (typeof event == 'object') {
            typeName = Object.keys(event).length > 0 ? `${uLabel}Event` : '';
        } else if (typeof event == 'string') {
            typeName = `${uLabel}Event`;
        } else {
            throw new Error(`${name}: must be object or string`);
        }

        this.content += `
    auto on${uLabel}(std::function<void(${typeName})> callback) {
        return protocol().onEvent("${component}/${name}", std::move(callback));
    }`
    }

    generateInterface(component: string, _iface: object, name: string) {
        const uLabel = generateComponentLabelName(component, name, true);
        const interfaceLabel = generateComponentLabelName(component, name + "-interface", true);

        this.content += `
    template<typename InterfaceT, typename... Args> requires (std::is_base_of_v<${interfaceLabel}, InterfaceT>)
    auto create${uLabel}Object(std::string_view objectName, Args &&... args) requires requires { InterfaceT(std::forward<Args>(args)...); } {
        return extension().template createObject<InterfaceT>(objectName, std::forward<Args>(args)...);
    }
`
    }
};
