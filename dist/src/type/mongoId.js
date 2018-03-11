"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const type_1 = require("../core/type");
const tyr_1 = require("../tyr");
exports.MongoIdType = new type_1.default({
    name: 'mongoid',
    generatePrimaryKeyVal() {
        return new mongodb_1.ObjectId();
    },
    fromString(str) {
        return mongodb_1.ObjectId(str);
    },
    fromClient(field, value) {
        if (value instanceof mongodb_1.ObjectId) {
            return value;
        }
        if (value) {
            const str = value.toString();
            // we don't want to accept 12-byte strings from the client
            if (!tyr_1.default.isValidObjectIdStr(str)) {
                throw new Error(`Invalid ObjectId for field ${field.name}`);
            }
            return mongodb_1.ObjectId(str);
        }
        return value;
    },
    toClient(field, value) {
        return value ? value.toString() : value;
    }
});
//# sourceMappingURL=mongoId.js.map