"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../../src/tyranid");
const user_1 = require("../user");
var Department = {
    is: 'object',
    fields: {
        secondName: { is: 'string' },
        department: { link: 'department' }
    }
};
var Task = new tyranid_1.default.Collection({
    id: 'tsk',
    name: 'task',
    label: 'Issue',
    fields: {
        _id: { is: 'integer' },
        name: { is: 'string' },
        assigneeUid: {
            is: 'uid',
            label: 'Assignee UID',
            of: [user_1.default, 'department']
        },
        departments: { is: 'array', of: Department },
        manual: { link: 'book' }
    }
});
exports.default = Task;
//# sourceMappingURL=task.js.map