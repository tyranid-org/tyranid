"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
var Department = new tyranid_1.default.Collection({
    id: 't05',
    name: 'department',
    fields: {
        _id: { is: 'integer' },
        name: { is: 'string' },
        tags: { is: 'array', of: 'string' },
        creator: { link: 'user' },
        head: { link: 'user' },
        permissions: { is: 'object', fields: {
                members: { is: 'array', of: { link: 'user' } }
            } },
        checkouts: { is: 'object', keys: 'uid', of: 'double' },
        cubicles: { is: 'object', keys: 'string', of: { is: 'object', fields: { name: 'string', size: { is: 'double', in: 'ft^2' } } } }
    }
});
exports.default = Department;
//# sourceMappingURL=department.js.map