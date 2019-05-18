import * as chai from 'chai';

import { Tyr } from 'tyranid';

// const { expect, assert } = chai;

export function add() {
  const { User } = Tyr.collections;

  const testDataPathPrefix = `${__dirname}/../../test/data/`;

  describe('excel.js', () => {
    it('should create an excel file with images', async () => {
      const users = await User.findAll();

      const excelDef: Tyr.ExcelDef<Tyr.User> = {
        collection: User,
        documents: users,
        images: [
          {
            path: testDataPathPrefix + 'apple_logo.jpeg',
            location: {
              tl: { col: 0.1, row: 0.1 },
              br: { col: 1, row: 1 }
            }
          }
        ],
        header: {
          height: 30,
          extraRows: [
            {
              height: 50,
              columns: [
                {
                  label: ''
                },
                {
                  colspan: 3,
                  alignment: { vertical: 'middle', horizontal: 'center' },
                  label: 'A long header spanning 3 columns',
                  borderBottom: { color: '#f00', style: 'dashDot' }
                },
                {
                  label: 'Bar',
                  borderTop: { color: '#00ff00', style: 'double' },
                  borderBottom: { color: '#00f', style: 'double' },
                  borderLeft: { color: '#000', style: 'thick' },
                  fill: { type: 'pattern', pattern: 'solid', fgColor: '#eee' },
                  font: { color: '#f00', size: 30 }
                }
              ]
            }
          ]
        },
        columns: [
          { field: 'name.first', label: 'First Name', width: 15 },
          { field: 'name.last', label: 'Last Name', width: 15 },
          {
            field: 'name',
            get(doc) {
              const { name } = doc;
              return name ? name.first + ' ' + name.last : 'Unnamed';
            },
            width: 20
          },
          { field: 'job', width: 20 },
          {
            field: 'age',
            header: {
              font: { color: '#fff' },
              fill: { type: 'pattern', pattern: 'solid', fgColor: '#000' },
              borderLeft: { style: 'thick' },
              borderRight: { style: 'thick' }
            },
            cell: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: '#ffb' },
              format: '0.00',
              borderLeft: { style: 'thick' },
              borderRight: { style: 'thick' }
            },
            width: 10
          }
        ],
        filename: 'foo.xlsx'
      };

      await Tyr.excel.toExcel(excelDef);

      const readDocs = await Tyr.excel.fromExcel(excelDef);
    });

    it('should stream an excel file', async () => {
      const users = await User.findAll();
      // no images present implies that the streaming version of exceljs will be used
      await Tyr.excel.toExcel({
        collection: User,
        documents: users,
        columns: [
          { field: 'name.first', width: 20 },
          { field: 'name.last', width: 20 },
          {
            field: 'age',
            header: {
              font: { color: '#fff' },
              fill: { type: 'pattern', pattern: 'solid', fgColor: '#000' },
              borderLeft: { style: 'thick' },
              borderRight: { style: 'thick' }
            },
            cell: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: '#ffb' },
              format: '0.00',
              borderLeft: { style: 'thick' },
              borderRight: { style: 'thick' }
            },
            width: 10
          }
        ],
        filename: 'foo.xlsx'
      });
    });
  });
}
