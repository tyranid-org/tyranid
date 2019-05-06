import * as Excel from 'exceljs';
import Tyr from './tyr';

// TODO:  optionally pass in a cursor rather than a list of documents

async function toExcel(opts) {
  const { collection, documents, columns, stream, filename } = opts;
  const workbook = new Excel.stream.xlsx.WorkbookWriter({
    stream,
    filename,
    useStyles: true,
    useSharedStrings: true
  });

  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('sheet 1');

  sheet.columns = columns.map(column => {
    const path = column.field;
    const namePath = collection.parsePath(path);

    return {
      header: column.label || namePath.pathLabel,
      key: path,
      width: 10
    };
  });

  for (const document of documents) {
    const row = {};

    for (const column of columns) {
      const path = column.field;
      const namePath = collection.parsePath(path);

      row[path] = namePath.get(document);
    }

    sheet.addRow(row).commit();
  }

  sheet.commit();

  await workbook.commit();
}

Tyr.excel = {
  toExcel
};
