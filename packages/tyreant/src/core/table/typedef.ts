import { TyrFieldLaxProps } from '../field';
import { Tyr } from 'tyranid/client';

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

export interface TyrTableConfigField {
  name: string;
  hidden?: boolean;
}

export type TyrTableConfigFields = TyrTableConfigField[];

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

export type TyrTableConfigType = Tyr.Document & {
  key?: string;
  name?: string;
  fields: TyrTableConfigFields;
  documentUid: string;
  userId: string;
  collectionId: string;
};
