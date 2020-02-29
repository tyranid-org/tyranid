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

export interface ColumnConfigField {
  name: string;
  label: string;
  locked: boolean;
  hidden: boolean;
}
