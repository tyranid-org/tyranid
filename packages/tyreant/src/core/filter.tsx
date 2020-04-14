import * as React from 'react';
import { useState } from 'react';

import { FilterTwoTone, SearchOutlined } from '@ant-design/icons';

import { Button, Popover } from 'antd';
import {
  ColumnFilterItem,
  FilterDropdownProps,
} from 'antd/lib/table/interface';

import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';
import { useComponent, TyrComponent } from './component';

export interface Filterable {
  searchValues: { [pathName: string]: any };
  onSearch(): void;

  localSearch: boolean;
  localDocuments?: Tyr.Document<any>[];
}

export type Filter = (
  filterable: Filterable,
  props: TyrPathProps<any>
) =>
  | {
      filterDropdown?:
        | React.ReactNode
        | ((props: FilterDdProps) => React.ReactNode);
      filterIcon?: React.ReactNode;
      onFilter?: (value: any, doc: Tyr.Document) => boolean;
      onFilterDropdownVisibleChange?: (visible: boolean) => void;
      filterDropdownVisible?: boolean;
      filters?: ColumnFilterItem[];
    }
  | undefined;

export type Finder = (
  path: Tyr.PathInstance,
  opts: any /* TODO: add Tyr.Options_Find to client */,
  searchValue: any
) => void;

export interface TyrFilterProps<SearchValueType> {
  typeName: string;
  filterable: Filterable;
  pathProps: TyrPathProps<any>;
  filterDdProps: FilterDdProps;
  children: (
    searchValue: SearchValueType | undefined,
    setSearchValue: (v: SearchValueType | undefined) => void,
    search: (onChange?: boolean) => void
  ) => React.ReactNode;
}

export function TyrFilter<SearchValueType>({
  typeName,
  pathProps,
  filterable,
  filterDdProps,
  children,
}: TyrFilterProps<SearchValueType>) {
  const { path } = pathProps;
  const pathName = path!.name;

  const [searchValue, setSearchValue] = useState<SearchValueType | undefined>(
    filterable.searchValues[pathName]
  );

  React.useEffect(() => {
    setSearchValue(filterable.searchValues[pathName]);
  }, [filterable.searchValues[pathName]]);

  const setLiveSetSearchValue = (value: SearchValueType | undefined) => {
    setSearchValue(value);

    if (pathProps.liveSearch) {
      filterable.searchValues[pathName] = value;
      filterable.onSearch();
    }
  };

  const clear = () => {
    delete filterable.searchValues[pathName];
    setSearchValue(undefined);
    filterDdProps.clearFilters?.();
    filterable.onSearch();
  };

  const search = (onChange?: boolean) => {
    filterable.searchValues[pathName] = searchValue;
    filterable.onSearch();
    if (!onChange) filterDdProps.confirm?.();
  };

  const { connect } = filterDdProps;
  if (connect) connect({ clear, search, searchValue, setSearchValue });

  return (
    <div className={`tyr-filter tyr-${typeName}-filter`}>
      {children(searchValue, setLiveSetSearchValue, search)}
      {!filterDdProps.connect && (
        <div className="tyr-filter-footer">
          <Button onClick={() => clear()} size="small" style={{ width: 90 }}>
            Reset
          </Button>

          {!pathProps.liveSearch && (
            <Button
              type="primary"
              onClick={() => search()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export interface TyrFilterConnection {
  clear: () => void;
  search: () => void;
  searchValue: any;
  setSearchValue: (v: any) => void;
}

export interface FilterDdProps extends FilterDropdownProps {
  connect?: (connection: TyrFilterConnection) => void;
}

export const TyrFilters = ({ component }: { component?: TyrComponent }) => {
  const [connections] = useState<{
    [name: string]: TyrFilterConnection;
  }>({});

  const [visible, setVisible] = useState(false);
  const c = component || useComponent();
  if (!c) return <div className="no-component" />;
  const paths = c.paths?.filter(f => f.path);
  if (!paths) return <div className="no-paths"></div>;

  return (
    <Popover
      overlayClassName="tyr-filters"
      title="Filters"
      trigger="click"
      visible={visible}
      placement="bottomLeft"
      onVisibleChange={setVisible}
      align={{ offset: [0, -3] }}
      content={
        <>
          <div className="tyr-filter-body">
            {paths.map(f => {
              const path = f.path!;

              const filter = c.getFilter(f);
              if (!filter) return <div className="no-filter" />;

              const { filterDropdown } = filter;

              if (filterDropdown) {
                return (
                  <div className="tyr-filter-container" key={path.name}>
                    <h1>{path.pathLabel}</h1>
                    {typeof filterDropdown === 'function'
                      ? filterDropdown({
                          prefixCls: '',
                          setSelectedKeys: (selectedKeys: string[]) => {
                            c.refresh();
                          },
                          selectedKeys: [],
                          confirm: () => {
                            c.requery();
                          },
                          clearFilters: () => {},
                          //filters?: ColumnFilterItem[];
                          //getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
                          connect: connection => {
                            connections[path.name] = connection;
                          },
                          visible: true,
                        })
                      : filterDropdown}
                  </div>
                );
              }

              return (
                <div className="tyr-filter-container" key={f.path!.name}>
                  {f.path!.name} Filter TODO
                </div>
              );
            })}
          </div>
          <div className="tyr-filter-footer">
            <Button
              onClick={() => {
                for (const name in connections) connections[name]?.clear();
                setVisible(false);
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>

            {!c.isLocal && (
              <Button
                type="primary"
                onClick={() => {
                  for (const name in connections) connections[name]?.search();
                  setVisible(false);
                }}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
            )}
          </div>
        </>
      }
    >
      <Button>
        <FilterTwoTone twoToneColor="#386695" />
      </Button>
    </Popover>
  );
};
