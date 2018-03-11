"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
class ValidationError extends Error {
    constructor(field, reason) {
        super(reason);
        this.field = field;
        this.reason = reason;
    }
    get message() {
        return 'The value at ' + this.field.path + ' ' + this.reason;
    }
}
exports.default = ValidationError;
tyr_1.default.ValidationError = ValidationError;
exports.default = ValidationError;
//# sourceMappingURL=validationError.js.map