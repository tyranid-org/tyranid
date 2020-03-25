import * as React from 'react';

import { observable } from 'mobx';
import { observer } from 'mobx-react';

import {
  DragDropContext,
  DropResult,
  ResponderProvided,
  Droppable,
  Draggable
} from 'react-beautiful-dnd';

import { Tyr } from 'tyranid/client';

import { TyrFilters } from './filter';
import { useComponent, TyrComponentState } from './component';
import { TyrManyComponentProps, TyrManyComponent } from './many-component';
import { useThemeProps } from './theme';
import { TyrIntersectionObserver, useIsVisible } from '../util';

interface ColumnData<D extends Tyr.Document> {
  id: string;
  def: TyrKanbanColumnDef;
  cards: D[];
}

// this value doesn't really matter since we just care about significant digits,
// some number larger than 0 just chosen for readability when debugging
const MAX_INTERVAL = 1e12;

export interface TyrKanbanColumnDef {
  label: string;
  match: object;

  /**
   * Any documents not matching any of the given match values will be placed into this column
   * if default is set to true.
   */
  default?: boolean;
}

export interface TyrKanbanProps<D extends Tyr.Document>
  extends TyrManyComponentProps<D> {
  //across?: string;
  collection: Tyr.CollectionInstance<D>;
  columns: Tyr.CollectionInstance | TyrKanbanColumnDef[];
  ordering: string;
  cardRenderer?: (document: D, visible: boolean) => JSX.Element;
}

@observer
export class TyrKanbanBase<
  D extends Tyr.Document = Tyr.Document
> extends TyrManyComponent<D, TyrKanbanProps<D>> {
  hasPaging = false;

  @observable
  columns: ColumnData<D>[] = [];

  @observable
  documents: D[] & { count?: number } = [];

  constructor(props: TyrKanbanProps<D>, state: TyrComponentState<D>) {
    super(props, state);
  }

  async componentDidMount() {
    super.componentDidMount();

    this.findAll();
  }

  async postFind() {
    let { documents } = this;
    const { ordering } = this.props;
    let { columns } = this.props;

    if (columns instanceof Tyr.Collection) {
      const { fields } = this.collection;
      let path: Tyr.NamePathInstance | undefined;

      for (const fieldName in fields) {
        const field = fields[fieldName];

        if (field.link === columns) {
          path = field.namePath;
          break;
        }
      }

      if (!path)
        throw new Tyr.AppError(
          `Could not find path from ${this.collection.label} to ${columns.label}`
        );

      const { name } = path;
      columns = columns.values.map((v, idx) => ({
        label: v.$label,
        match: {
          [name]: v.$id
        },
        default: idx === 0
      }));
    }

    if (ordering) {
      const orderingPath = this.collection.parsePath(ordering);

      // if no existing ordering values, initialize them based on current order
      if (!documents.some(d => !!orderingPath.get(d))) {
        const multiple = MAX_INTERVAL / documents.length;
        let v = 0;

        for (const d of documents) {
          orderingPath.set(d, (v += multiple));
          // TODO:  implement bulk api in tyranid and use that
          await d.$update({ [ordering]: 1 });
        }
      } else {
        documents = this.documents = documents
          .slice()
          .sort((a, b) => orderingPath.get(a) - orderingPath.get(b));
      }
    }

    const tColumns = columns.map((column, index) => ({
      id: String(index),
      def: column,
      cards: [] as D[] // new Array(this.columns / 2) ?
    }));

    const defIdx = columns.findIndex(c => c.default);
    const def = defIdx >= 0 ? tColumns[defIdx] : undefined;

    OUTER: for (const d of documents) {
      for (const c of tColumns) {
        if (Tyr.isCompliant(c.def.match, d)) {
          c.cards.push(d);
          continue OUTER;
        }
      }

      if (def) {
        def.cards.push(d);
        const { match } = def.def;
        Object.assign(d, match);
        // TODO:  implement bulk api in tyranid and use that
        await d.$update({ fields: Tyr.projectify(match) });
      }
    }

    this.columns = tColumns;
  }

  onDragEnd = async (result: DropResult, provided: ResponderProvided) => {
    const { documents, columns } = this;
    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    )
      return;

    const droppedCard = documents.find(d => d.$id === draggableId);
    if (!droppedCard) return;

    const startColumn = columns.find(c => c.id === source.droppableId);
    if (!startColumn) return;

    const finishColumn = columns.find(c => c.id === destination.droppableId);
    if (!finishColumn) return;

    const { ordering } = this.props;
    const orderingPath = this.collection.parsePath(ordering);
    const projection = { [ordering]: 1 };
    const { cards } = finishColumn;
    const dIdx = destination.index;

    if (startColumn === finishColumn) {
      cards.splice(source.index, 1);
      cards.splice(dIdx, 0, droppedCard);
    } else {
      const startCards = startColumn.cards;
      startCards.splice(source.index, 1);

      cards.splice(dIdx, 0, droppedCard);

      const { match } = finishColumn.def;
      Object.assign(droppedCard, match);
      Object.assign(projection, Tyr.projectify(match));
    }

    const prevOrd = dIdx > 0 ? orderingPath.get(cards[dIdx - 1]) : 0;

    const clen = cards.length;
    const nextOrd =
      dIdx < clen - 1 ? orderingPath.get(cards[dIdx + 1]) : MAX_INTERVAL;

    //console.log({ clen, dIdx, prevOrd, nextOrd });

    orderingPath.set(droppedCard, (prevOrd + nextOrd) / 2);

    await droppedCard.$update({ projection });
  };

  render() {
    const { columns } = this;
    const { cardRenderer } = this.props;

    return this.wrap(() => (
      <div className="tyr-kanban-container">
        <TyrFilters />
        <DragDropContext onDragEnd={this.onDragEnd}>
          <div className="tyr-kanban">
            {columns.map((column, index) => (
              <TyrKanbanColumn
                key={column.id}
                column={column}
                cards={column.cards}
                cardRenderer={cardRenderer}
                index={index}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    ));
  }
}

export const TyrKanban = <D extends Tyr.Document>(props: TyrKanbanProps<D>) => (
  <TyrKanbanBase
    {...useThemeProps('kanban', props as TyrKanbanProps<D>)}
    parent={useComponent()}
  />
);

export interface TyrKanbanColumnProps<D extends Tyr.Document> {
  column: ColumnData<D>;
  cards: D[];
  index: number;
  cardRenderer?: (document: D, visible: boolean) => JSX.Element;
}

export const TyrKanbanColumn = observer(
  <D extends Tyr.Document>({
    column,
    cards,
    cardRenderer
  }: TyrKanbanColumnProps<D>) => {
    const [ref, setRef] = React.useState<HTMLElement | null>(null);

    return (
      <div className="tyr-kanban-column">
        <div className="tyr-kanban-column-title">{column.def.label}</div>
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <TyrIntersectionObserver scrollArea={ref}>
              <div
                {...provided.droppableProps}
                ref={(element: HTMLElement | null) => {
                  provided.innerRef(element);
                  setRef(element);
                }}
                className={`tyr-kanban-column-body${
                  snapshot.isDraggingOver ? ' is-dragging-over' : ''
                }`}
              >
                {cards.map((card, index) => (
                  <TyrCard
                    key={card.$id}
                    document={card}
                    index={index}
                    cardRenderer={cardRenderer}
                  />
                ))}
                {provided.placeholder}
              </div>
            </TyrIntersectionObserver>
          )}
        </Droppable>
      </div>
    );
  }
);

export interface TyrCardProps<D extends Tyr.Document> {
  document: D;
  index: number;
  cardRenderer?: (document: D, visible: boolean) => JSX.Element;
}

export const TyrCard = <D extends Tyr.Document>({
  document,
  index,
  cardRenderer
}: TyrCardProps<D>) => {
  const [ref, setRef] = React.useState<HTMLElement | null>(null);

  const visible = useIsVisible(ref);

  return (
    <Draggable draggableId={String(document.$id)} index={index}>
      {(provided, snapshot) => (
        <div
          className="tyr-card"
          ref={(el: HTMLDivElement) => {
            provided.innerRef(el);
            setRef(el);
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {cardRenderer ? cardRenderer(document, visible) : document.$label}
        </div>
      )}
    </Draggable>
  );
};
