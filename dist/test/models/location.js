"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
const Location = new tyranid_1.default.Collection({
    id: 'l00',
    name: 'location',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string', labelField: true },
    }
});
exports.default = Location;
//# sourceMappingURL=location.js.map