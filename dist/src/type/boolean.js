"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const type_1 = require("../core/type");
function fromString(s) {
    if (s && s.length) {
        if (/^(f|false|no|off|0)$/i.test(s)) {
            return false;
        }
        if (/^(t|true|yes|on|1)$/i.test(s)) {
            return true;
        }
        /*
        // NOTE:  not sure how "intelligent" we want to be here?
        //        if a valid use case comes through where it makes sense to be more aggressive in boolean conversion
        //        probably makes sense to go ahead and implement it
    
        const f = parseFloat(s);
        if (!isNaN(f)) {
          return !!f;
        }
        */
        throw new Error(`Invalid boolean: ${s}`);
    }
    return undefined;
}
const BooleanType = new type_1.default({
    name: 'boolean',
    fromString,
    fromClient(field, value) {
        switch (typeof value) {
            case 'string':
                try {
                    return fromString(value);
                }
                catch (err) {
                    // rethrowing a more specific error below
                }
                break;
            case 'boolean':
                return value;
            case 'number':
                if (value === 1) {
                    return true;
                }
                else if (value === 0) {
                    return false;
                }
                // NOTE:  see "intelligent" above
                break;
        }
        throw new Error(`Invalid boolean on field ${field.name}: ${value}`);
    },
    query(namePath, where, query) {
        switch (where) {
            case true:
                query[namePath.name] = true;
                break;
            case false:
                query[namePath.name] = { $ne: true };
                break;
        }
    },
    matches(namePath, where, doc) {
        if (where !== undefined) {
            const value = namePath.get(doc);
            return !where === !value;
        }
        else {
            return true;
        }
    },
    format(field, value) {
        return value ? 'Yes' : 'No';
    }
});
exports.default = BooleanType;
//# sourceMappingURL=boolean.js.map