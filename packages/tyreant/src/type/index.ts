export * from './type';

export * from './array';
export * from './array.key-value';
export * from './array.list';
export * from './bitmask';
export * from './boolean';
export * from './date';
export * from './datetime';
export * from './duration';
export * from './email';
export * from './integer';
export * from './double';
export * from './link';
export * from './link.abstract';
export * from './link.autocomplete';
export * from './link.radio';
export * from './link.select';
export * from './markup';
export * from './mongoid';
export * from './object';
export * from './password';
export * from './s3';
export * from './string';
export * from './text';
export * from './time';
export * from './timezone';
export * from './uid';
export * from './url';

import { byName } from './type';

for (const typeName in byName) {
  const typeUi = byName[typeName]!;

  const { extends: parentName } = typeUi;
  if (parentName) {
    const parentTypeUi = byName[parentName];

    for (const key in parentTypeUi) {
      const v = (typeUi as any)[key];
      if (!v) (typeUi as any)[key] = (parentTypeUi as any)[key];
    }
  }
}
