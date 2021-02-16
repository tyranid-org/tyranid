import * as React from 'react';
import {
  Fragment as F,
  useEffect,
  createRef,
  useState,
  RefObject,
} from 'react';

import { Slider, Input } from 'antd';

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange } from './type';
import { getValue } from '../core/path';
import { TyrFilter } from '../core/filter';
import { byName, TyrTypeProps } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

type SliderValue = [number, number] | undefined;
type TimeUnit = 'hours' | 'minutes' | 'seconds';

interface TimeMeta {
  name: TimeUnit;
  label: string;
  array: number[];
  size: number;
}

const numArr = (num: number) => Array.from(Array(num).keys());

const timeMeta: { [timeUnit in TimeUnit]: TimeMeta } = {
  hours: {
    name: 'hours',
    label: 'hr',
    array: numArr(24),
    size: 24,
  },
  minutes: {
    name: 'minutes',
    label: 'min',
    array: [0, 5, 15, 30, 45],
    size: 60,
  },
  seconds: {
    name: 'seconds',
    label: 's',
    array: [0, 5, 15, 30, 45],
    size: 60,
  },
};

// TODO: This components hard-coded for minutes, ideally should look at the units defined for this duration and modify UI accordingly
const columns: TimeMeta[] = [
  timeMeta.hours,
  timeMeta.minutes,
  //timeMeta.seconds,
];

const calculateUnitValues = (value: number) => {
  const uvs = {} as { [timeUnit in TimeUnit]: number };
  for (let v = value, ci = columns.length - 1; ci >= 0; ci--) {
    const { name, size } = columns[ci];

    uvs[name] = ci > 0 ? v % size : v;
    v = Math.trunc(v / size);
  }

  return uvs;
};

export const TyrDurationBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  const [unitRefs, setUnitRefs] = useState<RefObject<Input>[]>([]);
  useEffect(() => {
    mapPropsToForm(props);
    const v = props.path!.get(props.document);
    if (v) setValue(v);
    setUnitRefs(unitRefs => columns.map((_, i) => unitRefs[i] || createRef()));
  }, [props.path?.name, props.document]);
  const [value, setValue] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const uvs = calculateUnitValues(value);

  const updateValue = (type: TimeUnit, unitValue: string | number) => {
    const parsedUnitValue = Number.parseInt(unitValue as string); // if it is a number this will also round it

    if (isNaN(parsedUnitValue)) return;

    let nv = 0;
    for (let ci = 0; ci < columns.length; ci++) {
      const { name, size } = columns[ci];

      if (ci) nv *= size;
      nv += type === name ? parsedUnitValue : uvs[name];
    }

    setValue(nv);
    onTypeChange(props, nv);
    props.onChange?.(nv, null, props);
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: TimeUnit
  ) => {
    const cIdx = columns.findIndex(c => c.name === type);
    let value;

    const v = e.currentTarget.value;
    const caretIndex = e.currentTarget.selectionStart || 0;
    switch (e.key) {
      case 'Backspace':
        value =
          Number.parseInt(
            v.substring(0, caretIndex - 1) + v.substring(caretIndex)
          ) || 0;
        break;
      case 'Delete':
        value =
          Number.parseInt(
            v.substring(0, caretIndex) + v.substring(caretIndex + 1)
          ) || 0;
        break;
      case 'Enter':
        if (cIdx + 1 < columns.length) unitRefs?.[cIdx + 1]?.current?.focus();
        else setExpanded(false);
      // fallthrough
      default:
        const key = Number.parseInt(e.key);
        value = Number.parseInt(v);
        if (!isNaN(key)) {
          value = Number.parseInt('' + value + key);

          if (value < 0 || value > (cIdx === 0 ? 1000 : timeMeta[type].size))
            value = key;
        }
    }

    updateValue(type, value);
  };

  return decorateField('duration', props, () => (
    <div>
      {expanded && (
        <div className="expanded">
          <div className="input-area">
            {columns.map((column, cIdx) => (
              <div key={cIdx} className="column">
                <Input
                  autoFocus={!cIdx}
                  ref={unitRefs[cIdx]}
                  value={uvs[column.name]}
                  onKeyDown={e => onKeyDown(e, column.name)}
                />
                {column.label}
              </div>
            ))}
          </div>
          <div className="pane">
            {columns.map((column, cIdx) => (
              <div key={cIdx} className="column">
                {column.array.map(n => (
                  <div
                    key={n}
                    className={`entry${
                      uvs[column.name] === n ? ' selected' : ''
                    }`}
                    onClick={() => {
                      updateValue(column.name, n);
                      if (cIdx + 1 === columns.length) setExpanded(false);
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {columns.map((column, cIdx) => {
        const uv = uvs[column.name];
        return (
          <F key={cIdx}>
            <a onClick={() => setExpanded(true)}>
              {('0' + uv).slice(uv > 99 ? -3 : -2)}
            </a>
            {column.label}
            {cIdx + 1 < columns.length ? ' ' : ''}
          </F>
        );
      })}
    </div>
  ));
};

export const TyrDuration = withThemedTypeContext('duration', TyrDurationBase);

byName.duration = {
  component: TyrDurationBase,
  filter(component, props) {
    const path = props.path!;
    const pathName = path.name;

    const sliderProps = {
      ...(props.searchRange
        ? { min: props.searchRange[0] as number }
        : { min: 0 }),
      ...(props.searchRange
        ? { max: props.searchRange[1] as number }
        : { max: 100 }),
    };

    const defaultValue: SliderValue =
      component.filterValue(pathName) ||
      ((props.searchRange
        ? (props.searchRange as SliderValue)
        : [0, 100]) as SliderValue);

    return {
      // maybe use a different UI than integer?
      filterDropdown: filterDdProps => (
        <TyrFilter<SliderValue>
          typeName="duration"
          component={component}
          filterDdProps={filterDdProps}
          pathProps={props}
        >
          {(searchValue, setSearchValue, search) => (
            <Slider
              range
              {...sliderProps}
              value={(searchValue || defaultValue) as SliderValue}
              onChange={(e: SliderValue) => {
                setSearchValue(e);
              }}
              style={{ width: 188 }}
            />
          )}
        </TyrFilter>
      ),
      onFilter: (value: number[] | undefined, doc: Tyr.Document) => {
        if (value === undefined) return true;
        const intVal = (path.get(doc) as number) || 0;
        return intVal >= value[0] && intVal <= value[1];
      },
      /*
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInputRef!.focus());
      }
    }
    */
    };
  },
  finder(
    path: Tyr.PathInstance,
    opts: Tyr.anny /* Tyr.Options_Find */,
    searchValue: Tyr.anny
  ) {
    if (searchValue) {
      if (!opts.query) opts.query = {};

      const searchParams = [
        { [path.spathArr]: { $gte: searchValue[0] } },
        { [path.spathArr]: { $lte: searchValue[1] } },
      ];

      if (opts.query.$and) {
        opts.query.$and = [...opts.query.$and, ...searchParams];
      } else {
        opts.query.$and = searchParams;
      }
    }
  },
  cellValue(path, document, props) {
    const v = getValue(props, document),
      uvs = calculateUnitValues(v);
    return (
      <>
        {columns.map((column, cIdx) => {
          const uv = uvs[column.name];
          return (
            <F key={cIdx}>
              <b>{('0' + uv).slice(uv > 99 ? -3 : -2)}</b>
              <label>{column.label}</label>
              {cIdx + 1 < columns.length ? ' ' : ''}
            </F>
          );
        })}
      </>
    );
  },
};

registerComponent('TyrDuration', TyrDuration);
