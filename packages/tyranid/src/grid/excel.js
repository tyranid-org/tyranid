import * as Excel from 'exceljs';

import Tyr from '../tyr';
import { createLogger, pathify } from './grid';
import { Importer } from './import';

// TODO:  optionally pass in a cursor rather than a list of documents

// only works for first 26 columns, columnNumber is 1-based
//function columnLetter(columnNumber) {
//return String.fromCharCode(64 + columnNumber);
//}

function colorCssToArbg(cssColor) {
  if (!cssColor) return undefined;

  if (cssColor && cssColor.argb) return cssColor;

  if (!cssColor.startsWith('#'))
    throw `only hex colors are (currently) supported, found "${cssColor}"`;

  let colorStr = cssColor.substring(1);
  switch (colorStr.length) {
    case 3:
      colorStr =
        colorStr[0] +
        colorStr[0] +
        colorStr[1] +
        colorStr[1] +
        colorStr[2] +
        colorStr[2];
      break;
    case 6:
      break;
    default:
      throw `only 3- or 6-digit hex color strings are currently supported, found "${cssColor}"`;
  }

  return { argb: 'FF' + colorStr.toUpperCase() };
}

function assignCellStyle(cell, style) {
  // alignments
  const alignmentDef = style.alignment;
  if (alignmentDef) {
    cell.alignment = alignmentDef;
  }

  // borders
  let borders;

  for (const borderType of [
    'borderLeft',
    'borderRight',
    'borderTop',
    'borderBottom',
  ]) {
    const borderDef = style[borderType];

    if (borderDef) {
      if (!borders) borders = {};

      const direction = borderType.substring(6).toLowerCase();
      const border = (borders[direction] = {});

      const borderStyle = borderDef.style;
      if (borderStyle) {
        border.style = borderStyle;
      }

      const borderColor = borderDef.color;
      if (borderColor) {
        border.color = colorCssToArbg(borderColor);
      }
    }
  }

  if (borders) cell.border = borders;

  // fills
  const fillDef = style.fill;
  if (fillDef) {
    const fill = { ...fillDef };

    if (fill.fgColor) fill.fgColor = colorCssToArbg(fill.fgColor);
    if (fill.bgColor) fill.bgColor = colorCssToArbg(fill.bgColor);
    const stops = fill.stops;
    if (stops) {
      for (const stop of stops) {
        if (stop.color) stop.color = colorCssToArbg(stop.color);
      }
    }

    cell.fill = fill;
  }

  // fonts
  const fontDef = style.font;
  if (fontDef) {
    const font = { ...fontDef };

    if (font.color) font.color = colorCssToArbg(font.color);

    cell.font = font;
  }

  // formats
  const formatDef = style.format;
  if (formatDef) {
    // TODO:  if we add string formats, parse format to see how to apply it, right now assume it is number since that is all we support
    cell.numFmt = formatDef;
  }
}

async function toExcel(opts) {
  const {
    collection,
    documents,
    columns,
    stream,
    filename,
    header,
    images,
  } = opts;

  // exceljs did not support images in the streaming api at time of writing
  const streaming = !images || !images.length;

  let workbook;

  if (streaming) {
    workbook = new Excel.stream.xlsx.WorkbookWriter({
      stream,
      filename,
      useStyles: true,
      useSharedStrings: true,
    });
  } else {
    workbook = new Excel.Workbook();
  }

  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('sheet 1');

  if (images) {
    for (const image of images) {
      const dot = image.path.lastIndexOf('.');
      if (dot === -1) throw `image "${image.path}" does not have an extension`;

      const ext = image.path.substring(dot + 1);
      switch (ext) {
        case 'gif':
        case 'jpeg':
        case 'jpg':
        case 'png':
          break;
        default:
          throw `image "${image.path}" does not have a valid image extension (must be .gif, .jpeg, .jpg, or .png)`;
      }

      image.id = workbook.addImage({
        filename: image.path,
        extension: ext,
      });
    }
  }

  const extraRows = (header && header.extraRows) || [];

  await pathify(collection, columns);

  sheet.columns = columns.map(column => ({
    key: column.path.name,
    width: column.width || 10,
  }));

  sheet.autoFilter = {
    from: { row: 1 + extraRows.length, column: 1 },
    to: { row: 1 + extraRows.length, column: columns.length },
  };

  let ri = 1;
  for (const row of extraRows) {
    const headerRow = sheet.addRow();
    let ci = 1;

    if (row.height) headerRow.height = row.height;

    for (const column of row.columns) {
      const cell = headerRow.getCell(ci);
      cell.value = column.label || '';
      assignCellStyle(cell, column);

      if (column.colspan) {
        sheet.mergeCells(ri, ci, ri, ci + column.colspan - 1);
        ci += column.colspan;
      } else {
        ci++;
      }
    }

    if (streaming) headerRow.commit();
    ri++;
  }

  const headerRow = sheet.addRow();
  if (header && header.height) headerRow.height = header.height;
  for (let ci = 1; ci <= columns.length; ci++) {
    const column = columns[ci - 1];
    const path = collection.parsePath(column.path);

    const cell = headerRow.getCell(ci);

    cell.value = column.label || path.label;

    const cellStyle = column.header;
    if (cellStyle) assignCellStyle(cell, cellStyle);
  }
  if (streaming) headerRow.commit();

  for (const document of documents) {
    const row = sheet.addRow();

    let ci = 1;
    for (const column of columns) {
      const { path } = column;

      const cell = row.getCell(ci);
      const get = column.get;

      if (get) {
        cell.value = get.call(column, document);
      } else {
        cell.value = await path.detail.type.format(
          path.detail,
          path.get(document)
        );
      }

      const cellStyle = column.cell;
      if (cellStyle)
        assignCellStyle(
          cell,
          typeof cellStyle === 'function' ? cellStyle(document) : cellStyle
        );

      ci++;
    }

    if (streaming) row.commit();
  }

  if (images) {
    for (const image of images) {
      sheet.addImage(image.id, image.location);
    }
  }

  if (streaming) sheet.commit();

  if (streaming) await workbook.commit();

  if (!streaming) {
    if (stream) {
      workbook.xlsx.write(stream);
    } else {
      await workbook.xlsx.writeFile(filename);
    }
  }
}

const simplifyLabel = label =>
  typeof label === 'string' ? label?.toLowerCase().replace(/\s/g, '') : '';

async function fromExcel(opts) {
  const { collection, stream, filename, header, defaults, save } = opts;

  const log = createLogger(opts.log);

  const workbook = new Excel.Workbook();

  if (stream) {
    stream.pipe(workbook.xlsx.createInputStream());
  } else {
    await workbook.xlsx.readFile(filename);
  }

  // are these useful?
  //workbook.created
  //workbook.modified

  const extraRows = header?.extraRows || [];

  await pathify(opts.collection, opts.columns);

  const expectedColumns = opts.columns.map(column => ({
    ...column,
    label: column.label || column.path.label,
  }));

  const sheet =
    workbook.getWorksheet('sheet 1') ||
    workbook.getWorksheet('Sheet1') ||
    workbook.getWorksheet('Data format') ||
    workbook.getWorksheet('Data') ||
    workbook.getWorksheet(1);

  let headerRowNumber = 1 + extraRows.length;

  let actualColumns;

  for (const column of expectedColumns) {
    console.log(`expecting "${simplifyLabel(column.label)}"`);
  }
  for (;;) {
    const rowValues = sheet.getRow(headerRowNumber).values;
    console.log('rowValues.length', rowValues.length);

    const anyMatches = rowValues.some(value => {
      const label = simplifyLabel(value || '');
      console.log(`looking for "${label}"`);

      return expectedColumns.some(
        column => simplifyLabel(column.label) === label
      );
    });

    if (!header && !anyMatches) {
      // if they didn't pass in a header, look for the header row ... there could be generic help text
      // or other things above the header row that we need to skip
      headerRowNumber++;

      if (headerRowNumber >= 20) {
        log('No header row found.');
        return undefined;
      }

      continue;
    }

    actualColumns = rowValues.map(value => {
      const label = simplifyLabel(value || '');

      const column = expectedColumns.find(
        column => simplifyLabel(column.label) === label
      );
      if (!column) {
        log(`Ignoring column "${label}".`);
        return undefined;
      } else {
        return column;
      }
    });

    break;
  }

  const importer = new Importer({
    collection,
    columns: actualColumns,
    defaults,
    opts: opts.opts,
    save,
    log,
  });
  const documents = [];

  sheet.eachRow((row, rowNumber) => {
    if (row.hidden || rowNumber <= headerRowNumber) return;

    documents.push(
      row.values.map(v => {
        if (v.value) v = v.value;
        if (v && v.text) v = v.text;
        return v;
      })
    );
  });

  return Tyr.serially(documents, doc => importer.importRow(doc));
}

Tyr.excel = {
  toExcel,
  fromExcel,
};
