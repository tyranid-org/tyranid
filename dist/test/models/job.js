"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
var Job = new tyranid_1.default.Collection({
    id: 'j00',
    name: 'job',
    enum: true,
    fields: {
        _id: { is: 'integer' },
        name: { is: 'string', labelField: true },
        manager: { is: 'boolean' }
    },
    values: [
        ['_id', 'name', 'manager'],
        [1, 'Software Engineer', false],
        [2, 'Software Lead', true],
        [3, 'Designer', false]
    ]
});
Job.prototype.isSoftware = function () {
    return this.name.substring(0, 8) === 'Software';
};
exports.default = Job;
//# sourceMappingURL=job.js.map