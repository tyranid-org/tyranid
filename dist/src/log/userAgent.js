"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyr_1 = require("../tyr");
const UserAgent = new tyr_1.default.Collection({
    id: '_u4',
    name: 'tyrUserAgent',
    client: false,
    internal: true,
    fields: {
        _id: { is: 'mongoid' },
        ua: { is: 'string', label: 'User Agent' }
    },
});
const byString = {};
UserAgent.by = async function (uaString) {
    let ua = byString[uaString];
    if (ua) {
        return ua;
    }
    ua = await UserAgent.findOne({ ua: uaString });
    if (!ua) {
        ua = await UserAgent.save({ ua: uaString });
    }
    byString[uaString] = ua;
    return ua;
};
exports.default = UserAgent;
//# sourceMappingURL=userAgent.js.map