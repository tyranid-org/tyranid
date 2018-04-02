export const asterisk = 42;
export const minus = 45;
export const slash = 47;
export const _0 = 48;
export const _9 = 57;
export const _A = 64;
export const _Z = 90;
export const caret = 94;
export const _a = 97;
export const _z = 122;

export const isLetter = code =>
  (code >= _A && code <= _Z) || (code >= _a && code <= _z);
export const isDigit = code => code >= _0 && code <= _9;

/**
 * Given "a2b-3c2" this returns 3.
 */
export function countComponents(components) {
  const len = components.length;
  let c = 0,
    identifier = false;

  for (let i = 0; i < len; i++) {
    const ch = components.charCodeAt(i);

    if (isLetter(ch)) {
      if (!identifier) {
        identifier = true;
        c++;
      }
    } else if (
      ch === minus ||
      ch === caret ||
      isDigit(ch) ||
      ch === slash ||
      ch === asterisk
    ) {
      if (!c) {
        throw new Error(
          `A units component clause must start with an identifier in "${components}"`
        );
      }

      identifier = false;
    } else {
      throw new Error(
        `Illegal character in unit components clause: ${ch} in "${components}"`
      );
    }
  }

  return c;
}

export function compact(components) {
  for (let i = 0; i < components.length; ) {
    const c = components[i];

    if (!c.degree) {
      components.splice(i, 1);
    } else {
      i++;
    }
  }
}

export function merge(name, components) {
  for (let i = 0; i < components.length; ) {
    const ci = components[i];

    if (!ci.degree) {
      components.splice(i, 1);
    } else {
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
