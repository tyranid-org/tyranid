"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
class SecureError {
    constructor(msg) {
        this.msg = msg;
    }
    get message() {
        return this.msg ? this.msg : 'Security violation';
    }
    toString() {
        return this.message();
    }
}
exports.default = SecureError;
tyr_1.default.SecureError = SecureError;
//# sourceMappingURL=secureError.js.map