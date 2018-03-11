"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const type_1 = require("../core/type");
const validationError_1 = require("../core/validationError");
const TimeType = new type_1.default({
    name: 'time',
    fromString(s) {
        return s ? new Date(s) : s;
    },
    fromClient(field, value) {
        if (typeof value === 'string') {
            return new Date(value);
        }
        return value;
    },
    format(field, value) {
        return value ? moment(value).format('HH:mm:SS') : '';
    },
    query(namePath, where, query) {
        if (where) {
            query[namePath.name] = {
                $gte: new Date(where.startDate),
                $lte: new Date(where.endDate)
            };
        }
    },
    matches() {
        // TODO
        return true;
    },
    validate(field, value) {
        if (value !== undefined && !(value instanceof Date)) {
            return new validationError_1.default(field, 'is not a date');
        }
    }
});
exports.default = TimeType;
//# sourceMappingURL=time.js.map