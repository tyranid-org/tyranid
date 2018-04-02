import { Tyr } from 'tyranid';
import { pad, wordWrap } from './util';
import * as names from './names';

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

  for (const field of fieldKeys) {
    const def = fields[field]['def'];

    /**
     * don't include injected _id in raw response
     */
    if (def && field !== '_id') {
      const required = def.required;
      const indent = 4;
      const fieldName = field + (required ? '' : '?');
      const fieldType = addField({
        name: field,
        def: def,
        indent,
        siblingFields: fields,
        colName: name,
        commentLineWidth
      });

      properties.push(
        addComment(def, indent - 1, commentLineWidth) +
          `${fieldName}: ${fieldType};`
      );
    }
  }

  return `
    /**
     * Base interface from which documents in collection
     * "${name}" <${names.collection(name)}> are derived
     */
    export interface ${interfaceName}<IdType = string, Container extends {} = {}> {
      ${properties.join('\n' + pad('', 3))}
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

export function addComment(
  field: Tyr.FieldDefinition,
  indent: number,
  width = 80
) {
  let out = '';
  if (field.note) {
    const lines = wordWrap(field.note, width);

    out += '/*\n';
    let line: string | undefined = '';
    while ((line = lines.shift())) {
      out += pad(' * ' + line + (lines.length === 0 ? '' : '\n'), indent);
    }
    out += '\n';
    out += pad(' */', indent);
    out += '\n' + pad('', indent);
  }
  return out;
}

/**
 *
 * given an field definition, emit a type definition
 *
 */
export function addField(opts: {
  name: string;
  def: Tyr.FieldDefinition;
  indent: number;
  parent?: string;
  colName?: string;
  siblingFields?: { [key: string]: any };
  noPopulatedProperty?: boolean;
  commentLineWidth?: number;
}): string {
  let {
    name,
    def,
    indent = 0,
    parent,
    siblingFields,
    colName,
    commentLineWidth,
    noPopulatedProperty = false
  } = opts;

  /**
   *
   * TODO: tyranid typings need to be fixed
   *
   */
  if (def.def) def = def.def;

  // if the field is `_id` and the collection is an enum, use the type alias
  if (name === '_id' && colName && def.enum) return names.id(colName);

  /**
   *
   * link types
   *
   */
  if (typeof def.link === 'string') {
    // Same parsing as https://github.com/tyranid-org/tyranid/blob/master/src/core/collection.js#L1458
    const linkCol =
      Tyr.byName[
        def.link.endsWith('?')
          ? def.link.substring(0, def.link.length - 1)
          : def.link
      ];
    if (!linkCol)
      throw new Error(`No collection for link: ${colName}.${def.link}`);

    const linkIdType = linkCol.def.enum ? names.id(linkCol.def.name) : 'IdType';

    // add populated prop too
    if (parent === 'array' || noPopulatedProperty) return linkIdType;
    // TODO: better parser will add optional array populated prop
    let out = '';
    out += `${linkIdType};\n`;

    const deIded = name.replace(/Id$/, '');
    let replacementName =
      !/Id$/.test(name) || (siblingFields && deIded in siblingFields)
        ? `${name}$`
        : deIded;

    /**
     * link type is intersection of base
     * interface with Container generic
     */
    out += pad(
      `${replacementName}?: Container & ${names.base(
        linkCol.def.name
      )}<IdType, Container>`,
      indent - 1
    );
    return out;
  }

  /**
   *
   * general types
   *
   */
  switch (def.is) {
    case 'string':
    case 'url':
    case 'email':
    case 'image':
    case 'password':
    case 'uid':
      return 'string';

    case 'boolean':
      return 'boolean';

    case 'double':
    case 'integer':
      return 'number';

    case 'date':
      return 'Date';

    case 'mongoid':
      return 'IdType';

    case 'array': {
      return `${def.of
        ? addField({
            name,
            def: def.of,
            indent,
            parent: 'array'
          })
        : 'any'}[]`;
    }

    case 'object': {
      if (def.keys && def.of) {
        if (
          !def.keys.is ||
          (!assignableToString(def.keys.is) && def.keys.is !== 'integer')
        ) {
          console.warn(
            `Invalid key type: ${JSON.stringify(def.keys)} defaulting to any`
          );
          return 'any';
        }

        const subType = addField({
          name: name + '_hash',
          def: def.of,
          indent: indent + 1,
          noPopulatedProperty: true
        });

        const keyType = assignableToString(def.keys.is) ? 'string' : 'number';

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
        const subDef = subFields[sub].def;
        const required =
          sub === '_id' ||
          subFields[sub].required ||
          (subDef && subDef.required);
        obj += '\n';
        const subName = sub + (required ? '' : '?');
        const subType = addField({
          name: sub,
          def: subFields[sub],
          indent: indent + 1,
          siblingFields: subFields
        });
        const fieldDef = `${subName}: ${subType};`;
        const comment =
          (subDef && addComment(subDef, indent, commentLineWidth)) || '';
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
