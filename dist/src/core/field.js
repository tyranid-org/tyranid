"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("../tyr");
const namePath_1 = require("./namePath");
const validationError_1 = require("./validationError");
class Field {
    constructor(def) {
        this.def = def;
    }
    get label() {
        return _.result(this.def, 'label') || tyr_1.default.labelize(this.name);
    }
    async labelify(value) {
        return this.link ? await this.link.idToLabel(value) : value;
    }
    get namePath() {
        let np = this._np;
        if (!np) {
            np = this._np = new namePath_1.default(this.collection, this.path);
        }
        return np;
    }
    get spath() {
        return this.namePath.spath;
    }
    get db() {
        return this.def.db !== false;
    }
    /** @private @isopmorphic */
    _calcPathLabel() {
        const p = this.parent, l = this.def.pathLabel || this.label;
        if (p) {
            const pl = p.pathLabel;
            if (pl) {
                return pl + ' ' + l;
            }
        }
        return l;
    }
    get pathLabel() {
        return this._calcPathLabel();
    }
    async validate(doc) {
        const validateFn = this.def.validate;
        if (validateFn) {
            const reason = await validateFn.apply(doc, this);
            if (reason) {
                throw new validationError_1.default(this, reason);
            }
        }
    }
}
exports.default = Field;
tyr_1.default.Field = Field;
//# sourceMappingURL=field.js.map