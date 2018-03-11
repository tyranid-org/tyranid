"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const tyr_1 = require("../tyr");
const object_1 = require("../type/object");
const historical_1 = require("../historical/historical");
function toPlain(doc) {
    const plain = {};
    const fields = doc.$model.fields;
    for (const fieldName in fields) {
        const v = doc[fieldName];
        if (v !== undefined) {
            plain[fieldName] = doc[fieldName];
        }
    }
    return plain;
}
exports.toPlain = toPlain;
exports.documentPrototype = tyr_1.default.documentPrototype = {
    $asOf(date, props) {
        historical_1.default.asOf(this.$model, this, date, props);
    },
    $clone() {
        // Amazingly, a seemingly do-nothing cloneDeep `customizer`
        // seems to address https://github.com/lodash/lodash/issues/602
        return new this.$model(_.cloneDeep(this, val => val));
    },
    $cloneDeep() {
        return new this.$model(tyr_1.default.cloneDeep(this));
    },
    $copy(obj, keys) {
        if (keys) {
            if (keys === tyr_1.default.$all) {
                _.each(this.$model.fields, field => {
                    const key = field.name, v = obj[key];
                    if (v !== undefined) {
                        this[key] = v;
                    }
                    else {
                        delete this[key];
                    }
                });
            }
            else {
                for (const key of keys) {
                    this[key] = obj[key];
                }
            }
        }
        else {
            for (const key in obj) {
                if (obj.hasOwnProperty(key) && key !== '_history') {
                    const v = obj[key];
                    if (v !== undefined) {
                        this[key] = v;
                    }
                    else {
                        delete this[key];
                    }
                }
            }
        }
    },
    $snapshot(updateHistory, ...args) {
        const collection = this.$model;
        if (!collection.def.historical) {
            throw new Error('Document is not historical');
        }
        const opts = extractOptions(collection, args), updateFields = extractUpdateFields(this, opts);
        return historical_1.default.snapshot(collection, this, historical_1.default.patchPropsFromOpts(opts), updateFields, updateHistory);
    },
    $save(...args) {
        return this.$model.save(this, ...args);
    },
    $insert(...args) {
        return this.$model.insert(this, ...args);
    },
    $update(...args) {
        return this.$model.updateDoc(this, ...args);
    },
    async $remove() {
        await tyr_1.default.Event.fire({ collection: this.$model, type: 'remove', when: 'pre', document: this });
        const rslt = await this.$model.remove({ [this.$model.def.primaryKey.field]: this.$id }, '$remove', ...arguments);
        await tyr_1.default.Event.fire({ collection: this.$model, type: 'remove', when: 'post', document: this });
        return rslt;
    },
    $replace(obj) {
        this.$copy(obj, tyr_1.default.$all);
    },
    $slice(path, options) {
        return tyr_1.default._slice(this, path, options);
    },
    $toClient(opts) {
        return this.$model.toClient(this, opts);
    },
    $toPlain() {
        return toPlain(this);
    },
    $populate(fields, denormal) {
        return this.$model.populate(fields, this, denormal);
    },
    $validate() {
        return object_1.default.validate(this.$model, this);
    }
};
function defineDocumentProperties(dp) {
    Object.defineProperties(dp, {
        $id: {
            get() {
                return this[this.$model.def.primaryKey.field];
            },
            enumerable: false,
            configurable: false
        },
        $label: {
            get() {
                return this.$model.labelFor(this);
            },
            enumerable: false,
            configurable: false
        },
        $tyr: {
            get() {
                return tyr_1.default;
            },
            enumerable: false,
            configurable: false
        },
        $uid: {
            get() {
                const model = this.$model;
                return model.idToUid(this[model.def.primaryKey.field]);
            },
            enumerable: false,
            configurable: false
        }
    });
}
exports.defineDocumentProperties = defineDocumentProperties;
//# sourceMappingURL=document.js.map