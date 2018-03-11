"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
const collection_1 = require("../core/collection");
const UnitSystem = new collection_1.default({
    id: '_u0',
    name: 'unitSystem',
    enum: true,
    client: false,
    internal: true,
    fields: {
        _id: { is: 'integer' },
        name: { is: 'string', labelField: true },
        url: { is: 'url' },
    },
    values: [
        ['_id', 'name', 'url'],
        [1, 'metric', 'https://en.wikipedia.org/wiki/International_System_of_Units'],
        [2, 'english', 'https://en.wikipedia.org/wiki/English_units'],
        [3, 'planck', 'https://en.wikipedia.org/wiki/Planck_units']
    ]
});
tyr_1.default.UnitSystem = UnitSystem;
exports.default = UnitSystem;
//# sourceMappingURL=unitSystem.js.map