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

import { Tyr } from '../tyreant';

import { TyrFilters } from './filter';
import { TyrComponentState } from './component';
import { TyrManyComponentProps, TyrManyComponent } from './many-component';

interface ColumnDef {
  label: string;
  match: object;
}

interface ColumnData<D extends Tyr.Document> {
  id: string;
  def: ColumnDef;
  cards: D[];
}

export interface TyrKanbanProps<D extends Tyr.Document>
  extends TyrManyComponentProps<D> {
  //across?: string;
  collection: Tyr.CollectionInstance<D>;
  columns: ColumnDef[];
  cardRenderer?: (document: D) => JSX.Element;
}

@observer
export class TyrKanban<
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
    this.columns = this.props.columns.map((column, index) => {
      return {
        id: String(index),
        def: column,
        cards: this.documents.filter(doc => Tyr.isCompliant(column.match, doc))
      };
    });
  }

  onDragEnd = async (result: DropResult, provided: ResponderProvided) => {
    const { documents, columns } = this;
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const droppedCard = documents.find(d => d.$id === draggableId);
    if (!droppedCard) {
      console.log('Dropped card not found!');
      return;
    }

    const startColumn = columns.find(c => c.id === source.droppableId);
    if (!startColumn) {
      console.log('Droppable start column not found!');
      return;
    }

    const finishColumn = columns.find(c => c.id === destination.droppableId);
    if (!finishColumn) {
      console.log('Droppable finish column not found!');
      return;
    }

    if (startColumn === finishColumn) {
      const { cards } = startColumn;
      cards.splice(source.index, 1);
      cards.splice(destination.index, 0, droppedCard);
      return;
    }

    const startCards = startColumn.cards;
    startCards.splice(source.index, 1);

    const finishCards = finishColumn.cards;
    finishCards.splice(destination.index, 0, droppedCard);

    Object.assign(droppedCard, finishColumn.def.match);
    await droppedCard.$save();
  };

  render() {
    const { columns } = this;
    const { cardRenderer } = this.props;

    return this.wrap(() => (
      <>
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
      </>
    ));
  }
}

export interface TyrKanbanColumnProps<D extends Tyr.Document> {
  column: ColumnData<D>;
  cards: D[];
  index: number;
  cardRenderer?: (document: D) => JSX.Element;
}

export const TyrKanbanColumn = observer(
  <D extends Tyr.Document>({ column, cards }: TyrKanbanColumnProps<D>) => (
    <div className="tyr-kanban-column">
      <div className="tyr-kanban-column-title">{column.def.label}</div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`tyr-kanban-column-body${
              snapshot.isDraggingOver ? ' is-dragging-over' : ''
            }`}
          >
            {cards.map((card, index) => (
              <TyrCard key={card.$id} document={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
);

export interface TyrCardProps<D extends Tyr.Document> {
  document: D;
  index: number;
  cardRenderer?: (document: D) => JSX.Element;
}

export const TyrCard = <D extends Tyr.Document>({
  document,
  index,
  cardRenderer
}: TyrCardProps<D>) => (
  <Draggable draggableId={String(document.$id)} index={index}>
    {(provided, snapshot) => (
      <div
        className="tyr-card"
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        {cardRenderer ? cardRenderer(document) : document.$label}
      </div>
    )}
  </Draggable>
);
