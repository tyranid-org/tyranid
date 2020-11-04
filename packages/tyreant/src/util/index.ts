export * from './export';
export * from './font';
export * from './hoc';
export * from './import';
export * from './imports';
export * from './job';
export * from './remove';
export * from './rerender';
export * from './visible';
export * from './full-table-height.hook';
export * from './window-size.hook';

export const classNames = (...classNames: (string | undefined | false)[]) => {
  let s;
  for (const className of classNames) {
    if (className) {
      if (s) s += ' ' + className;
      else s = className;
    }
  }

  return s;
};
