import * as fs from 'fs/promises';
import { Stats } from 'fs';

type GenericSchema = {
    id?: string;
    label?: string;
    description?: string;
};

export type SchemaArray = GenericSchema & {
    type: 'array';
    minItems?: number;
    maxItems?: number;
    defaultValue?: [];
    items: Schema;
    required?: boolean;
};

export type SchemaObject = GenericSchema & {
    type: 'object';
    properties: {
        [key: string]: Schema;
    },
    icon?: string;
};

export type SchemaNumber = GenericSchema & {
    type: 'number';
    minValue?: number;
    maxValue?: number;
    defaultValue?: number;
    required?: boolean;
};

export type SchemaBoolean = GenericSchema & {
    type: 'boolean';
    defaultValue?: boolean;
};

export type SchemaString = GenericSchema & {
    type: 'string';
    defaultValue?: string;
    minLength?: number;
    maxLength?: number;
};

export type SchemaVariant = GenericSchema & {
    type: 'variant';
    choices: string[];
};

export type SchemaPath = GenericSchema & {
    type: 'path';
    mustExist?: boolean;
    entity?: "directory" | "file";
};

export type Schema = SchemaObject | SchemaArray | SchemaNumber | SchemaBoolean | SchemaVariant | SchemaString | SchemaPath;

export enum SchemaErrorCode {
    InvalidValue,
    InvalidType,
    Required,
    NotExists,
    ExpectedFile,
    ExpectedDirectory,
};

export type SchemaError = {
    object: any;
    schema: Schema;
    path: string;
    code: SchemaErrorCode;
};

async function validateImpl(object: any, schema: Schema, path: string, onError: (error: SchemaError) => boolean | void, recursive = true) {
    const emitError = (code: SchemaErrorCode, childPath = path) => {
        const error = { object, path: childPath, schema, code };
        const result = onError(error);
        if (typeof result === 'boolean' && !result) {
            throw error;
        }

        return false;
    };

    if (schema.type === "array") {
        if (!Array.isArray(object)) {
            return emitError(SchemaErrorCode.InvalidType);
        }

        if (recursive) {
            let isValid = true;

            for (let i = 0; i < object.length; ++i) {
                if (!await validateImpl(object[i], schema.items, `${path}/[${i}]`, onError)) {
                    isValid = false;
                }
            }

            if (!isValid) {
                return false;
            }
        }

        if (schema.required && object.length < 1) {
            return emitError(SchemaErrorCode.Required);
        }

        if (schema.minItems !== undefined && object.length < schema.minItems) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        if (schema.maxItems !== undefined && object.length > schema.maxItems) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        return true;
    }


    if (schema.type === "boolean") {
        if (typeof object !== "boolean") {
            return emitError(SchemaErrorCode.InvalidType);
        }

        return true;
    }

    if (schema.type === "number") {
        if (typeof object !== "number") {
            return emitError(SchemaErrorCode.InvalidType);
        }

        if (schema.minValue !== undefined && object < schema.minValue) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        if (schema.maxValue !== undefined && object > schema.maxValue) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        return true;
    }

    if (schema.type === "string") {
        if (typeof object !== "string") {
            return emitError(SchemaErrorCode.InvalidType);
        }

        if (schema.minLength !== undefined && object.length < schema.minLength) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        if (schema.maxLength !== undefined && object.length > schema.maxLength) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        return true;
    }

    if (schema.type === "variant") {
        if (typeof object !== "string") {
            return emitError(SchemaErrorCode.InvalidType);
        }

        if (schema.choices.indexOf(object) < 0) {
            return emitError(SchemaErrorCode.InvalidValue);
        }

        return true;
    }

    if (schema.type === "path") {
        if (typeof object !== "string") {
            return emitError(SchemaErrorCode.InvalidType);
        }

        if (schema.mustExist || schema.entity) {
            let stat: Stats | undefined;
            try {
                stat = await fs.stat(object);
            } catch { }

            if (stat) {
                if (schema.entity === "directory") {
                    if (!stat.isDirectory()) {
                        return emitError(SchemaErrorCode.ExpectedDirectory);
                    }
                } else {
                    if (!stat.isFile()) {
                        return emitError(SchemaErrorCode.ExpectedFile);
                    }
                }
            } else if (schema.mustExist) {
                return emitError(SchemaErrorCode.NotExists);
            }
        }

        return true;
    }

    if (typeof object !== "object") {
        return emitError(SchemaErrorCode.InvalidType);
    }

    let isValid = true;

    if (recursive) {
        for (const propertyName in schema.properties) {
            const propertySchema = schema.properties[propertyName];

            if ("required" in propertySchema) {
                if (propertySchema.required && !(propertyName in object)) {
                    return emitError(SchemaErrorCode.Required, `${path}/${propertyName}`);
                }
            }

            if (propertyName in object) {
                if (!await validateImpl(object[propertyName], propertySchema, `${path}/${propertyName}`, onError)) {
                    isValid = false;
                }
            }
        }
    }

    return isValid;
}

export async function validateObject(object: any, schema: Schema, onError: (error: SchemaError) => boolean | void = () => { }) {
    return await validateImpl(object, schema, "", onError);
}

export function generateObject(schema: Schema) {
    if ("defaultValue" in schema && schema.defaultValue !== undefined) {
        return schema.defaultValue;
    }

    if (schema.type === "boolean") {
        return false;
    }

    if (schema.type === "number") {
        if (schema.minValue !== undefined && schema.minValue > 0) {
            return schema.minValue;
        }

        if (schema.maxValue !== undefined && schema.maxValue < 0) {
            return schema.maxValue;
        }

        return 0;
    }

    if (schema.type === 'path' || schema.type === 'string' || schema.type === 'variant') {
        return "";
    }

    if (schema.type === 'array') {
        return [];
    }

    const result: Record<string, any> = {};

    for (const propertyName in schema.properties) {
        result[propertyName] = generateObject(schema.properties[propertyName]);
    }

    return result;
}

export function fixObject(object: any, schema: Schema) {
    if (!validateImpl(object, schema, "", () => { }, false)) {
        return generateObject(schema);
    }

    if (schema.type == "object") {
        for (const key in object) {
            if (!(key in schema.properties)) {
                delete object[key];
            }
        }

        for (const key in schema.properties) {
            if (!(key in object)) {
                object[key] = generateObject(schema.properties[key]);
            } else {
                object[key] = fixObject(object[key], schema.properties[key]);
            }
        }
    }

    if (schema.type == "array") {
        for (let i = 0; i < object.length; ++i) {
            object[i] = fixObject(object[i], schema.items);
        }
    }

    return object;
}
