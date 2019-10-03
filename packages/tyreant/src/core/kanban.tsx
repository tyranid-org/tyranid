import * as React from 'react';
import {
  DragDropContext,
  DropResult,
  ResponderProvided,
  Droppable,
  Draggable
} from 'react-beautiful-dnd';

type CardData = {
  $label: string;
  $id: string;
};

export type TyrKanbanProps = Readonly<{
  data: CardData[];
  across?: string;
  cardRenderer?: (data: CardData) => JSX.Element;
}>;

type TyrKanbanState = {
  columns: { [Identifier: string]: ColumnData };
};

export class TyrKanban extends React.Component<TyrKanbanProps, TyrKanbanState> {
  state: TyrKanbanState = {
    columns: {}
  };

  onDragEnd(result: DropResult, provided: ResponderProvided) {
    const { data } = this.props;
    const { columns } = this.state;
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

    const droppedCard = data.find(d => d.$id === draggableId);

    if (!droppedCard) {
      return;
    }

    const column = columns[source.droppableId];

    const newCards = Array.from(column.data);
    newCards.splice(source.index, 1);
    newCards.splice(source.index, 0, droppedCard);

    const newColumn = {
      ...column,
      data: newCards
    };

    const newState = {
      ...this.state,
      columns: {
        ...columns,
        [newColumn.id]: newColumn
      }
    };

    this.setState(newState);
  }

  render() {
    const { cardRenderer } = this.props;
    const columns: ColumnData[] = [
      {
        id: '1',
        label: 'first column',
        data: [
          {
            $label: 'first card',
            $id: '1'
          }
        ]
      }
    ];

    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        >
        {columns.map((column, index) => (
          <Column
            key={column.id}
            column={column}
            cardRenderer={cardRenderer}
            index={index}
          />
        ))}
      </DragDropContext>
    );
  }
}

type ColumnData = { id: string; label: string; data: CardData[] };

export type ColumnProps = Readonly<{
  column: ColumnData;
  index: number;
  cardRenderer?: (data: CardData) => JSX.Element;
}>;

const ColumnTitle = (props: { label: string }) => <div>{props.label}</div>;

export class Column extends React.Component<ColumnProps> {
  render() {
    const { column } = this.props;

    return (
      <div>
        <ColumnTitle label={column.label} />
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {column.data.map((card, index) => (
                <Card key={card.$id} data={card} index={index} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  }
}

export type CardProps = Readonly<{
  data: CardData;
  index: number;
  cardRenderer?: (data: CardData) => JSX.Element;
}>;

export class Card extends React.Component<CardProps> {
  render() {
    const { data, index, cardRenderer } = this.props;

    return (
      <Draggable draggableId={data.$id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            {cardRenderer ? cardRenderer(data) : data.$label}
          </div>
        )}
      </Draggable>
    );
  }
}
