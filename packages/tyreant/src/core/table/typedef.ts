import { TyrFieldLaxProps } from '../field';

export interface TyrTableConfig {
  key: string;
  documentUid?: string;
  required?: string[];
  lockedLeft?: number;
  title?: string;
  header?: string | React.ReactNode;
  asDrawer?: boolean;
  compact?: boolean;
}

export interface TyrTableColumnFieldProps extends TyrFieldLaxProps {
  pinned?: 'left' | 'right';
  align?: 'left' | 'right' | 'center';
  ellipsis?: boolean;
  editClassName?: string;

  /**
   * What table column grouping should this be grouped under.
   */
  group?: string;
}

export interface ColumnConfigField {
  name: string;
  label: string;
  locked: boolean;
  hidden: boolean;
}
