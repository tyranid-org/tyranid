import * as React from 'react';

import { UploadOutlined } from '@ant-design/icons';

import { Tyr } from 'tyranid/client';
import { TyrField, createForm, TyrPathProps } from '../core';
import { message } from 'antd';

interface ImportColumn {
  path: Tyr.PathInstance;
  createOnImport?: boolean;
}

export const TyrImport = createForm<Tyr.TyrImport>(
  {
    actions: [
      {
        trait: 'import',
        input: 0,
        name: 'import',
        utility: true,
        label: (
          <>
            <UploadOutlined /> Import
          </>
        ),
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
        label: (
          <>
            <UploadOutlined /> Import
          </>
        ),
        hide: ({ document }) => {
          return !document.file;
        },
      },
    ],
  },
  ({ form, document: importDoc }) => {
    //$scope.title = Tyr.pluralize(collection.label);

    const defaults = importDoc.defaults;
    const { paths } = defaults.$model;

    const allColumns: ImportColumn[] = ((form.parent?.activePaths ||
      Object.keys(paths).map(pathName => ({
        path: paths[pathName],
      }))) as ImportColumn[]).filter(c => c.path?.tail);

    importDoc.columns = allColumns.map(c => ({
      path: c.path.name,
      ...(c.createOnImport && { createOnImport: true }),
    }));

    const importColumns = allColumns.filter(c => {
      const tail = c.path.tail;
      return (!tail.readonly || tail.def.unique) && tail.relate !== 'ownedBy';
    });
    const defaultableColumns = allColumns.filter(c => {
      const tail = c.path.tail;
      return (!tail.readonly || tail.def.unique) && tail.relate === 'ownedBy';
    });

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
            <b>{importColumns.map(c => c.path.label).join(', ')}</b>
          </p>
        </div>
        {importDoc.$id && (
          <>
            <TyrField path="on" mode="view" />
            <TyrField path="by" mode="view" />
          </>
        )}
        <TyrField path="file" onChange={() => form.refresh()} />

        {!!defaultableColumns.length && <h1>Default Values</h1>}

        {defaultableColumns.map(c => (
          <TyrField key={c.path.name} path={c.path.name} document={defaults} />
        ))}
      </>
    );
  }
);
