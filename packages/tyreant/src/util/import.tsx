import * as React from 'react';

import { UploadOutlined } from '@ant-design/icons';

import { Tyr } from 'tyranid/client';
import { TyrField, createForm } from '../core';
import { message } from 'antd';

export const TyrImport = createForm<Tyr.TyrImport>(
  {
    actions: [
      {
        trait: 'import',
        input: 0,
        name: 'import',
        label: (
          <>
            <UploadOutlined /> Import
          </>
        ),
        utility: true,
        on({ caller, self }) {
          const { collection } = caller;

          try {
            self.document = new Tyr.collections.TyrImport({
              collectionName: collection.def.name,
              defaults: new collection(),
            });
          } catch (err) {
            console.error(err);
            message.error(err.message);
          }
        },
      },
      {
        trait: 'save',
        name: 'import',
      },
    ],
  },
  ({ form, document: importDoc }) => {
    //$scope.title = Tyr.pluralize(collection.label);

    const defaults = importDoc.defaults;
    const { paths } = defaults.$model;

    const allPaths = (
      form.parent?.activePaths.map(p => p.path) ||
      Object.keys(paths).map(pathName => paths[pathName])
    ).filter(p => p?.tail);

    const importPaths = allPaths.filter(
      path => !path.tail.readonly && path.tail.relate !== 'ownedBy'
    );
    const defaultablePaths = allPaths.filter(
      path => !path.tail.readonly && path.tail.relate === 'ownedBy'
    );

    return (
      <>
        <h1>Import File</h1>
        <div className="tyr-import-help">
          <p>
            The import file should be an <b>Excel</b> file that contains the
            following column names (it can contain other columns, but they will
            be ignored):
          </p>
          <p>
            <b>{importPaths.map(path => path.label).join(', ')}</b>
          </p>
        </div>
        {importDoc.$id && (
          <>
            <TyrField path="on" mode="view" />
            <TyrField path="by" mode="view" />
          </>
        )}
        <TyrField path="file" />

        {!!defaultablePaths.length && <h1>Default Values</h1>}

        {defaultablePaths.map(path => (
          <TyrField key={path.name} path={path.name} document={defaults} />
        ))}
      </>
    );
  }
);
