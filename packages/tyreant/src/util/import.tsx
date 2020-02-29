import * as React from 'react';

import { Tyr } from '../tyreant';
import { TyrField, TyrForm, TyrModal } from '../core';

//const { TyrImport: TyrImportCol } = Tyr.collections;

export const TyrImport = TyrForm.create<Tyr.TyrImport>(
  {
    decorator: <TyrModal />,
    actions: [
      {
        traits: ['edit'],
        input: 0,
        name: 'import',
        action: ({ caller, self }) => {
          const { collection } = caller;

          self.document = new Tyr.collections.TyrImport({
            collectionName: collection.name,
            defaults: new collection()
          });
        }
      },
      {
        traits: ['save'],
        name: 'import'
      }
    ]
  },
  ({ document: importDoc }) => {
    //$scope.title = Tyr.pluralize(collection.label);

    const defaults = importDoc.defaults;
    const { fields } = defaults.$model;
    const allFields = Object.keys(fields).map(fieldName => fields[fieldName]);

    const importFields = allFields.filter(
      field => !field.readonly && field.relate !== 'ownedBy'
    );
    const defaultableFields = allFields.filter(
      field => !field.readonly && field.relate === 'ownedBy'
    );

    return (
      <>
        <h1>Import File</h1>
        <div className="tyr-import-help">
          <p>
            The import file should be an excel file that contains the following
            column names (it can contain other columns, but they will be
            ignored):
          </p>
          <p>
            <b>{importFields.map(field => field.label).join(', ')}</b>
          </p>
        </div>
        {importDoc.$id && (
          <>
            <TyrField path="on" mode="view" />
            <TyrField path="by" mode="view" />
          </>
        )}
        <TyrField path="file" />

        <h1>Default Values</h1>

        {defaultableFields.map(field => (
          <TyrField key={field.name} path={field.name} document={defaults} />
        ))}
      </>
    );
  }
);
