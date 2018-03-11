"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const type_1 = require("../core/type");
const validationError_1 = require("../core/validationError");
const ObjectType = new type_1.default({
    name: 'object',
    compile(compiler, field) {
        const def = field.def;
        if (def.fields) {
            compiler.fields(field.path, field, def.fields);
        }
        if (def.keys && !def.of) {
            throw compiler.err(field.path, '"of" must be specified if "keys" is present');
        }
        else if (!def.keys && def.of) {
            throw compiler.err(field.path, '"keys" must be specified if "of" is present');
        }
        compiler.type(field, 'keys');
        compiler.type(field, 'of');
    },
    fromClient(field, value) {
        if (!value) {
            return value;
        }
        const fields = field.fields;
        if (!_.size(fields)) {
            // this is defined as just an empty object, meaning it's 100% dynamic, grab everything
            return value;
        }
        else {
            const obj = {};
            _.each(value, function (v, k) {
                const field = fields[k];
                if (field) {
                    if (!field.type) {
                        throw new Error('collection missing type ("is"), missing from schema?');
                    }
                    obj[k] = field.type.fromClient(field, v);
                }
            });
            return obj;
        }
    },
    validate(field, obj) {
        const errors = [];
        if (obj) {
            _.each(field.fields, function (field, fieldName) {
                const fieldDef = field.def;
                if (!fieldDef.get) {
                    const type = field.type;
                    const error = type.validate(field, obj[fieldName]);
                    if (error instanceof validationError_1.default) {
                        errors.push(error);
                    }
                    else if (Array.isArray(error)) {
                        Array.prototype.push.apply(errors, error);
                    }
                }
            });
        }
        return errors;
    }
});
exports.default = ObjectType;
//# sourceMappingURL=object.js.map