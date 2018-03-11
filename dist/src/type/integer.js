"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
const type_1 = require("../core/type");
const validationError_1 = require("../core/validationError");
const IntegerType = new type_1.default({
    name: 'integer',
    compile(compiler, field) {
        if (compiler.stage === 'link') {
            const unit = field.def.in;
            if (unit) {
                field.in = tyr_1.default.Units.parse(unit);
            }
        }
    },
    fromString(s) {
        return parseInt(s, 10);
    },
    fromClient(field, value) {
        if (typeof value === 'string') {
            if (!value.length) {
                return undefined;
            }
            const v = parseInt(value, 10);
            if (v.toString() !== value) {
                throw new Error(`Invalid integer on field ${field.name}: ${value}`);
            }
            return v;
        }
        else {
            return value;
        }
    },
    format(field, value) {
        return value;
    },
    matches(namePath, where, doc) {
        if (where !== undefined) {
            const value = namePath.get(doc);
            for (const op in where) {
                const v = where[op];
                switch (op) {
                    case '$lt': return value < v;
                    case '$gt': return value > v;
                    case '$eq': return value === v;
                }
            }
        }
        else {
            return true;
        }
    },
    query(namePath, where, query) {
        if (where) {
            query[namePath.name] = where;
        }
    },
    validate(field, value) {
        if (value !== undefined && (typeof value !== 'number' || value % 1 !== 0)) {
            return new validationError_1.default(field, 'is not an integer');
        }
    }
});
exports.default = IntegerType;
//# sourceMappingURL=integer.js.map