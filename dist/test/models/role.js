"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
const _ = require("lodash");
class Role extends new tyranid_1.default.Collection({
    id: 'r00',
    name: 'role',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string', labelField: true },
    }
}) {
    static async search(text) {
        return this.find({ query: { name: new RegExp(_.escapeRegExp(text)) } });
    }
}
exports.default = Role;
//# sourceMappingURL=role.js.map