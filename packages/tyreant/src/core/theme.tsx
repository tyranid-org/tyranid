import * as React from 'react';
import { useContext } from 'react';

import { TyrTableProps } from './table';

export interface TyrThemeProps {
  table?: Partial<TyrTableProps<any>>;
}

export const ThemeContext = React.createContext<TyrThemeProps | undefined>(
  undefined
);

export const useThemeProps = <
  K extends keyof TyrThemeProps,
  P extends TyrThemeProps[K]
>(
  type: K,
  props: P
) => {
  const themeProps = useContext(ThemeContext);

  return Object.assign({}, themeProps?.[type], props);
};

export const TyrTheme: React.FunctionComponent<TyrThemeProps> = props => (
  <ThemeContext.Provider value={props}>{props.children}</ThemeContext.Provider>
);
