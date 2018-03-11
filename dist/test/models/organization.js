"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
var Organization = new tyranid_1.default.Collection({
    id: 't04',
    name: 'organization',
    historical: true,
    express: {
        rest: true
    },
    fields: {
        _id: { is: 'integer' },
        name: { is: 'string', labelField: true, historical: true },
        owner: { link: 'user', relate: 'ownedBy', historical: true }
    }
});
exports.default = Organization;
//# sourceMappingURL=organization.js.map