# Tyranid Sanitize

`tyranid-sanitize` is a tool for obfuscating text fields on documents in your tyranid collections using simple schema annotations.

## Schema Annotations

In order to mark fields to be sanitized, add the `sanitize` property to a field definition.

```typescript
import { Tyr } from 'tyranid';

export const Blog = new Tyr.Collection({
  id: 'b00',
  name: 'blog',
  dbName: 'blogs',
  fields: {
    _id: { is: 'mongoid' },
    /**
     *  we want to obfuscate the name when the database
     *  is passed to `tyranid-sanitize`, so we mark the field
     *  with `sanitize: 'name'` to generate a random name string
     *  using faker.js.
     */
    name: { is: 'string', sanitize: 'name' },
    organizationId: { link: 'organization' }
  }
});
```

The `sanitize` (see the type definition here: [./src/sanitize.ts](./src/sanitize.ts)) property can be one of the following:

* `true`: this will use the default sanitization (a random string of lorem ipsum)
* `lorem`: a random sentence of lorem ipsum
* `name`: a random name
* `email`: a random email

## Sanitizing a database

After marking properties for sanitization, use the `sanitize` function to create
a cloned, sanitized version of the database.

```typescript
import { Tyr } from 'tyranid';
import { sanitize } from 'tyranid-sanitize';

// ... after booting tyranid
await sanitize(Tyr);
```

### Sanitization Options

The `sanitize(tyr: Tyr, opts?: SanitizeOptions)` function takes an optional options argument:

```typescript
interface SanitizeOptions {
  /**
   * desired name of the output database
   */
  outDbName?: string;
  /**
   * number of documents to batch insert at a time
   */
  batchSize?: number;
  /**
   * verbose progress logging
   */
  verbose?: boolean;
  /**
   * sanitize each collection serially (defaults to concurrently)
   */
  serial?: boolean;
  /**
   * faker.js seed
   */
  seed?: number;
}
```
