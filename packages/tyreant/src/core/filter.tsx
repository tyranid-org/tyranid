import * as React from 'react';
import { useState } from 'react';

import {
  CloseOutlined,
  FilterTwoTone,
  SearchOutlined,
} from '@ant-design/icons';

import { Button, Drawer, Popover, Input } from 'antd';
import {
  ColumnFilterItem,
  FilterDropdownProps,
} from 'antd/lib/table/interface';

import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';
import { useComponent, TyrComponent } from './component';
import { TyrManyComponent } from './many-component';

export interface FilterDdProps extends FilterDropdownProps {
  filtersContainer?: boolean;
}

export type Filter = (
  component: TyrComponent<any>,
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
  component: TyrComponent<any>;
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
  component,
  filterDdProps,
  children,
}: TyrFilterProps<SearchValueType>) {
  const { path } = pathProps;
  const pathName = path!.name;

  const [searchValue, setSearchValue] = useState<SearchValueType | undefined>(
    component.filterValues[pathName]
  );

  React.useEffect(() => {
    setSearchValue(component.filterValues[pathName]);
  }, [component.filterValues[pathName]]);

  const onSearch = () => {
    (component as TyrManyComponent).skip = 0;
    (component as TyrManyComponent).query();
    component.updateConfigFilter(pathName, component.filterValues[pathName]);
  };

  const setLiveSetSearchValue = (value: SearchValueType | undefined) => {
    setSearchValue(value);

    if (component.local) {
      component.filterValues[pathName] = value;
      onSearch();
    }
  };

  const clear = () => {
    delete component.filterValues[pathName];
    setSearchValue(undefined);
    filterDdProps.clearFilters?.();
    onSearch();
  };

  const search = (onChange?: boolean) => {
    component.filterValues[pathName] = searchValue;
    onSearch();
    if (!onChange) filterDdProps.confirm?.();
  };

  component.filterConnections[pathName] = {
    clear,
    search,
    searchValue,
    setSearchValue,
  };

  return (
    <div className={`tyr-filter tyr-${typeName}-filter`}>
      {children(searchValue, setLiveSetSearchValue, search)}
      {!filterDdProps.filtersContainer && (
        <div className="tyr-filter-footer">
          <Button onClick={() => clear()} size="small" style={{ width: 90 }}>
            Reset
          </Button>

          {!component.local && (
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

export const TyrFilters = ({
  component,
}: {
  component?: TyrComponent<any>;
}) => {
  const [visible, setVisible] = useState(false);
  const c = component || useComponent();
  if (!c) return <div className="no-component" />;
  const paths = c.paths?.filter(f => f.path);
  if (!paths) return <div className="no-paths"></div>;

  const body = (
    <>
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
                    setSelectedKeys: (selectedKeys: string[]) => c.refresh(),
                    selectedKeys: [],
                    confirm: () => c.query(),
                    clearFilters: () => {},
                    //filters?: ColumnFilterItem[];
                    //getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
                    visible: true,
                    filtersContainer: true,
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
    </>
  );

  const { filterConnections } = c;

  const footer = (
    <>
      <Button
        onClick={() => {
          for (const name in filterConnections)
            filterConnections[name]?.clear();
          setVisible(false);
        }}
        size="small"
        style={{ width: 90 }}
      >
        Reset
      </Button>

      {!c.local && (
        <Button
          type="primary"
          onClick={() => {
            for (const name in filterConnections)
              filterConnections[name]?.search();
            setVisible(false);
          }}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90 }}
        >
          Search
        </Button>
      )}
    </>
  );

  const title = c.collection.label + ' Filters';

  const filterTheme = c.props.theme?.filter;
  const filterIcon = filterTheme?.icon || (
    <FilterTwoTone twoToneColor="#386695" />
  );

  switch (filterTheme?.as) {
    case 'popover':
      return (
        <Popover
          overlayClassName="tyr-filters tyr-popover"
          title={title}
          trigger="click"
          visible={visible}
          placement="bottomLeft"
          onVisibleChange={setVisible}
          align={{ offset: [0, -3] }}
          content={
            <>
              <div className="tyr-filter-body">{body}</div>
              <div className="tyr-filter-footer">{footer}</div>
            </>
          }
        >
          <Button
            className={
              'tyr-filters-btn' + (c.filtering ? ' tyr-filters-active' : '')
            }
          >
            {filterIcon}
          </Button>
          <TyrFilterSearchBar />
          <TyrFilterSummary />
        </Popover>
      );
    default:
      return (
        <>
          <Drawer
            visible={visible}
            closable={true}
            onClose={() => setVisible(false)}
            placement="left"
            className="tyr-filters tyr-drawer"
            title={title}
            width={280}
            footer={footer}
          >
            {body}
          </Drawer>
          <Button
            className={
              'tyr-filters-btn' + (c.filtering ? ' tyr-filters-active' : '')
            }
            onClick={() => setVisible(true)}
          >
            {filterIcon}
          </Button>
          <TyrFilterSearchBar />
          <TyrFilterSummary />
        </>
      );
  }
};

export const TyrTagSet = ({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) => (
  <div className="tyr-tag-set">
    <label>{label}</label>
    {children}
  </div>
);

export const TyrTag = <C extends Tyr.CollectionInstance>({
  id,
  collection,
  onClick,
}: {
  id: Tyr.IdType<Tyr.DocumentType<C>>;
  collection: C;
  onClick?: (filterValue: any) => void;
}) => {
  const doc = collection.byIdIndex[id];
  return doc?.$label ? (
    <div className="tyr-tag" onClick={() => onClick?.(id)}>
      {doc.$label}
      <CloseOutlined />
    </div>
  ) : (
    <></>
  );
};

function unselect(set: any[] | any, value: any): any {
  if (Array.isArray(set)) {
    set = set.filter(v => v !== value);
    if (!set.length) set = undefined;
  } else {
    if (set === value) set = undefined;
  }

  return set;
}

export const TyrFilterSummary = ({
  component,
}: {
  component?: TyrComponent<any>;
}) => {
  const c = component || useComponent();

  if (!c) return <div className="no-component" />;

  const tags: JSX.Element[] = [];

  const { filterValues } = c;
  for (const pathName in filterValues) {
    const fv = filterValues[pathName];

    if (fv) {
      const pathProps = c.activePath(pathName);
      if (pathProps) {
        const { path } = pathProps;
        const { link } = path.detail;

        const onClick = (id: any) => {
          c.setFilterValue(pathName, unselect(c.filterValue(pathName), id));
          c.query();
        };

        if (link) {
          if (Array.isArray(fv)) {
            tags.push(
              <TyrTagSet key={link.id} label={path.label}>
                {fv.map(fv => (
                  <TyrTag
                    key={fv}
                    id={fv}
                    collection={link}
                    onClick={onClick}
                  />
                ))}
              </TyrTagSet>
            );
          } else {
            tags.push(
              <TyrTagSet key={link.id} label={path.label}>
                <TyrTag key={fv} id={fv} collection={link} onClick={onClick} />
              </TyrTagSet>
            );
          }
        }
      }
    }
  }

  return <div className="tyr-filter-summary">{tags}</div>;
};

export const TyrFilterSearchBar = ({
  component,
}: {
  component?: TyrComponent<any>;
}) => {
  const c = component || useComponent()!;
  const [searchValue, setSearchValue] = useState(c.filterSearchValue || '');

  if (!c) return <div className="no-component" />;

  return (
    <div className="tyr-filter-search-bar">
      <Input.Search
        enterButton
        value={searchValue}
        onChange={ev => {
          const v = ev.target.value;
          c.filterSearchValue = v;
          setSearchValue(v);
        }}
      />
    </div>
  );
};
