"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
// this collection is intended to not be instantiated in the database and is used to test
// that tyranid functions if the given collection does not exist (yet)
class Phantom extends new tyranid_1.default.Collection({
    id: 'p01',
    dbName: 'PHANTOM',
    name: 'phantom',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string', labelField: true },
    }
}) {
}
exports.default = Phantom;
//# sourceMappingURL=phantom.model.js.map