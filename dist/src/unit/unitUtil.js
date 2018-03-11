"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asterisk = 42;
exports.minus = 45;
exports.slash = 47;
exports._0 = 48;
exports._9 = 57;
exports._A = 64;
exports._Z = 90;
exports.caret = 94;
exports._a = 97;
exports._z = 122;
exports.isLetter = code => (code >= exports._A && code <= exports._Z) || (code >= exports._a && code <= exports._z);
exports.isDigit = code => code >= exports._0 && code <= exports._9;
/**
 * Given "a2b-3c2" this returns 3.
 */
function countComponents(components) {
    const len = components.length;
    let c = 0, identifier = false;
    for (let i = 0; i < len; i++) {
        const ch = components.charCodeAt(i);
        if (exports.isLetter(ch)) {
            if (!identifier) {
                identifier = true;
                c++;
            }
        }
        else if (ch === exports.minus || ch === exports.caret || exports.isDigit(ch) || ch === exports.slash || ch === exports.asterisk) {
            if (!c) {
                throw new Error(`A units component clause must start with an identifier in "${components}"`);
            }
            identifier = false;
        }
        else {
            throw new Error(`Illegal character in unit components clause: ${ch} in "${components}"`);
        }
    }
    return c;
}
exports.countComponents = countComponents;
function compact(components) {
    for (let i = 0; i < components.length;) {
        const c = components[i];
        if (!c.degree) {
            components.splice(i, 1);
        }
        else {
            i++;
        }
    }
}
exports.compact = compact;
function merge(name, components) {
    for (let i = 0; i < components.length;) {
        const ci = components[i];
        if (!ci.degree) {
            components.splice(i, 1);
        }
        else {
            let j = 0;
            for (; j < i; j++) {
                const cj = components[j];
                if (cj[name] === ci[name]) {
                    cj.degree += ci.degree;
                    components.splice(i, 1);
                    break;
                }
            }
            if (j === i) {
                i++;
            }
        }
    }
}
exports.merge = merge;
//# sourceMappingURL=unitUtil.js.map