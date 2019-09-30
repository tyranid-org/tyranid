import { Tyr } from 'tyranid';
import * as names from './names';
import { pad, wordWrap } from './util';
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript';

/**
 * generate base interface for tyranid document type
 */
export function baseInterface(
  col: Tyr.CollectionInstance,
  opts: {
    commentLineWidth?: number;
  }
): string {
  const { commentLineWidth } = opts;
  const { name, fields } = col.def;
  const interfaceName = names.base(name);
  const properties: string[] = [];

  if (!fields) throw new Error(`Collection "${name}" has no fields!`);

  const fieldKeys = Object.keys(fields);
  fieldKeys.sort();

  for (const fieldName of fieldKeys) {
    const field = fields[fieldName];
    const def = field.def;

    /**
     * don't include injected _id in raw response
     */
    if (def && fieldName !== '_id') {
      const required = def.required;
      const indent = 4;
      const fieldType = addField({
        name: fieldName,
        field,
        indent,
        colName: name,
        commentLineWidth
      });

      properties.push(
        addComment(def, indent - 1, undefined, commentLineWidth) +
          '\n' +
          pad(
            `${required ? fieldName : fieldName + '?'}: ${fieldType};`,
            indent - 1
          )
      );
    }
  }

  return `
    /**
     * Base interface from which documents in collection
     * "${name}" <${names.collection(name)}> are derived
     */
    export interface ${interfaceName}<ObjIdType = string, ObjContainer = Inserted<string>, NumContainer = Inserted<number>> {${properties.join(
    ''
  )}
    }
    `;
}

function assignableToString(fieldName: string) {
  switch (fieldName) {
    case 'string':
    case 'url':
    case 'email':
    case 'image':
    case 'password':
    case 'uid':
      return true;
  }
  return false;
}

export function commentsFor({
  note,
  help
}: { note?: string; help?: string } = {}) {
  let comment = '';

  if (help) comment += help;

  if (note) {
    if (comment) comment += '\n';
    comment += note;
  }

  return comment;
}

export function addComment(
  obj: { note?: string; help?: string },
  indent: number,
  tags: {
    tag: string;
    text: string;
  }[] = [],
  width = 80
) {
  let out = '';

  const comment = commentsFor(obj);

  if (comment) {
    const lines = wordWrap(comment, width);

    out += '\n' + pad('/**\n', indent);
    let line: string | undefined = '';
    while ((line = lines.shift())) {
      out += pad(' * ' + line + (lines.length === 0 ? '' : '\n'), indent);
    }
    for (const tag of tags) {
      const lines = wordWrap(tag.text, width - 5);
      out += '\n' + pad(' * @' + tag.tag + ' ' + lines[0], indent);
      for (let i = 1; i < lines.length; i++) {
        out +=
          '\n' + pad(' * ', indent) + ' '.repeat(2 + tag.tag.length) + lines[i];
      }
    }

    out += '\n';
    out += pad(' */', indent);
    //out += '\n' + pad('', indent);
  }
  return out;
}

/**
 *
 * given an field definition, emit a type definition
 *
 */
export function addField({
  name,
  field,
  indent = 0,
  parent,
  colName,
  commentLineWidth,
  noPopulatedProperty = false
}: {
  name: string;
  field: Tyr.FieldInstance;
  indent: number;
  parent?: string;
  colName?: string;
  noPopulatedProperty?: boolean;
  commentLineWidth?: number;
}): string {
  const { def, type } = field;

  // if the field is `_id` and the collection is an enum, use the type alias
  if (name === '_id' && colName && def.enum) return names.id(colName);

  /**
   *
   * link types
   *
   */
  const isArray = field.type.name === 'array';
  if (field.link || (isArray && field.of!.link)) {
    const link = field.link! || field.of!.link!;
    if (!link)
      throw new Error(`No collection for link: ${colName}.${field.path}`);

    const linkIdType = names.idType(link);

    // add populated prop too
    if (parent === 'array' || noPopulatedProperty) return linkIdType;

    let out = isArray ? `${linkIdType}[]` : linkIdType;
    out += ';\n';

    const popName = Tyr.NamePath.populateNameFor(name);

    let popTypeName = `${
      names.idType(link) === 'number' ? 'Num' : 'Obj'
    }Container & ${names.base(
      link.def.name
    )}<ObjIdType, ObjContainer, NumContainer>`;
    if (isArray) popTypeName = `(${popTypeName})[]`;

    out += pad(`${popName}?: ${popTypeName}`, indent - 1);
    return out;
  }

  /**
   *
   * general types
   *
   */
  const tsName = type.def.typescript;
  if (tsName) return tsName;

  switch (def.is) {
    case 'mongoid':
      return 'ObjIdType';

    case 'array': {
      return `${
        def.of
          ? addField({
              name,
              field: field.of!,
              indent,
              parent: 'array'
            })
          : 'any'
      }[]`;
    }

    case 'object': {
      if (def.keys && def.of) {
        const defKeysIs = typeof def.keys === 'string' ? def.keys : def.keys.is;

        if (
          !defKeysIs ||
          (!assignableToString(defKeysIs) && defKeysIs !== 'integer')
        ) {
          console.warn(
            `tyranid-tdgen: Invalid key type: ${JSON.stringify(
              def.keys
            )} defaulting to any`
          );
          return 'any';
        }

        const subType = addField({
          name: name + '_hash',
          field: field.of!,
          indent: indent + 1,
          noPopulatedProperty: true
        });

        const keyType = assignableToString(defKeysIs) ? 'string' : 'number';

        let out = '';
        out += '{';
        out += '\n';
        out += pad(`[key: ${keyType}]: ${subType} | void;`, indent);
        out += '\n';
        out += pad('}', indent - 1);
        return out;
      }

      const subFields = def.fields;

      if (!subFields || (Array.isArray(subFields) && !subFields.length))
        return 'any';
      const subFieldKeys = Object.keys(subFields);
      subFieldKeys.sort();

      let obj = '{';

      for (const sub of subFieldKeys) {
        const subField = subFields[sub];
        const subDef = subField.def;
        const required =
          sub === '_id' ||
          subFields[sub].required ||
          (subDef && subDef.required);
        obj += '\n';
        const subName = sub + (required ? '' : '?');
        const subType = addField({
          name: sub,
          field: subField,
          indent: indent + 1
        });
        const fieldDef = `${subName}: ${subType};`;
        const comment =
          (subDef && addComment(subDef, indent, undefined, commentLineWidth)) ||
          '';
        obj += comment ? pad(comment, indent) : '';
        obj += comment ? fieldDef : pad(fieldDef, indent);
      }

      obj += '\n';
      obj += pad('}', indent - 1);
      return obj;
    }

    default:
      return 'any';
  }
}
