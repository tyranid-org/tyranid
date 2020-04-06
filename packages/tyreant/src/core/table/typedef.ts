import { TyrSortDirection } from '../typedef';

export interface TyrTableConfig {
  key: string;
  documentUid?: string;
  required?: string[];
  lockedLeft?: number;
  title?: string;
  header?: string | React.ReactNode;
  asDrawer?: boolean;
  compact?: boolean;

  // This should reset the column order, the sort, and the filters
  hideReset?: boolean;
}

export interface ColumnConfigField {
  name: string;
  label: string;
  locked: boolean;
  hidden: boolean;
  sortDirection?: TyrSortDirection;
  hasFilter?: boolean;
  width?: number;
}
