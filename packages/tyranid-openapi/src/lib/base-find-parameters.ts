/**
 * query parameters for searching
 */

export const SEARCH_STRING = {
  name: '$search',
  in: 'query',
  type: 'string',
  description: `
Search against a text field.

For example \`?$search=name:ben\`
searches the \`name\` property for the string \`ben\`. Nested properties
can be specified using dot syntax (for example: \`?$search=info.nested.name:ben\`)
  `.trim()
};

export const MIN_DATE = {
  name: '$minDate',
  in: 'query',
  type: 'string',
  description: `
Restrict minimum date value for a date field.


For example \`?$minDate=date:1494522427127\`
returns matches with the \`date\` field having values greater
than 1494522427127 (milliseconds since the unix epoch)
  `
};

export const MAX_DATE = {
  name: '$maxDate',
  in: 'query',
  type: 'string',
  description: `
Restrict maximum date value for a date field.

For example \`?$maxDate=date:1494522427127\`
returns matches with the "date" field having values less
than 1494522427127 (milliseconds since the unix epoch)
  `
};

export const LIMIT = {
  name: '$limit',
  in: 'query',
  type: 'number',
  description: `Number of results to include in response`,
  default: 10
};

export const SKIP = {
  name: '$skip',
  in: 'query',
  type: 'number',
  description: `Number of results to skip in search`,
  default: 0
};

export const SORT = {
  name: '$sort',
  in: 'query',
  type: 'string',
  description: `Property to sort on`,
  default: '_id'
};

export const ASCEND = {
  name: '$ascend',
  in: 'query',
  type: 'boolean',
  description: `Ascending sort`,
  default: false
};

export const DEFAULT_PARAMETERS = [
  SEARCH_STRING,
  MIN_DATE,
  MAX_DATE,
  LIMIT,
  SKIP,
  SORT,
  ASCEND
];
