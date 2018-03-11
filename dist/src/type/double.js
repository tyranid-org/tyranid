"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("../tyr");
const type_1 = require("../core/type");
const DoubleType = new type_1.default({
    name: 'double',
    compile(compiler, field) {
        if (compiler.stage === 'link') {
            const unit = field.def.in;
            if (unit) {
                field.in = tyr_1.default.Unit.parse(unit);
            }
        }
    },
    fromString(s) {
        return parseFloat(s);
    },
    fromClient(field, value) {
        if (typeof value === 'string') {
            if (!value.length) {
                return undefined;
            }
            const v = parseFloat(value);
            if (v.toString() !== value) {
                throw new Error(`Invalid double on field ${field.name}: ${value}`);
            }
            return v;
        }
        else {
            return value;
        }
    },
    format(field, value) {
        if (_.isNumber(value) && value !== Math.round(value)) {
            value = value.toFixed(2);
        }
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
    }
});
exports.default = DoubleType;
//# sourceMappingURL=double.js.map