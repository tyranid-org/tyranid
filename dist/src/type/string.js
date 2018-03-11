"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const type_1 = require("../core/type");
const StringType = new type_1.default({
    name: 'string',
    query(namePath, where, query) {
        if (where) {
            query[namePath.name] = _.isArray(where) ? { $in: where } : where;
        }
    },
    matches(namePath, where, doc) {
        if (where) {
            let value = namePath.get(doc);
            if (value) {
                if (!_.isString(value)) {
                    value = '' + value;
                }
                if (_.isArray(where)) {
                    return where.indexOf(value) >= 0;
                }
                else if (where instanceof RegExp) {
                    return value.match(where);
                }
                else {
                    return value === where;
                }
            }
        }
        return true;
    }
});
exports.default = StringType;
//# sourceMappingURL=string.js.map