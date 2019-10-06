import * as React from 'react';
import {
  DragDropContext,
  DropResult,
  ResponderProvided,
  Droppable,
  Draggable
} from 'react-beautiful-dnd';

const cardData: CardData[] = [
  {
    $id: '1',
    $label: 'card 1',
    columnId: '1'
  },
  {
    $id: '2',
    $label: 'card 2',
    columnId: '1'
  },
  {
    $id: '3',
    $label: 'card 3',
    columnId: '2'
  }
];

const columnData: ColumnData[] = [
  {
    id: '1',
    label: 'Column 1'
  },
  {
    id: '2',
    label: 'Column 2'
  }
];

type CardData = {
  $label: string;
  $id: string;
  columnId: string;
};

type ColumnData = { id: string; label: string; data?: CardData[] };

type KanbanData = {
  cards: CardData[];
  columns: ColumnData[];
};

const kanbanData: KanbanData = {
  cards: cardData,
  columns: columnData
};

const kanbanStyle = {
  display: 'flex'
};

export type TyrKanbanProps = Readonly<{
  data: KanbanData;
  across?: string;
  cardRenderer?: (data: CardData) => JSX.Element;
}>;

type TyrKanbanState = {
  // columns: { [Identifier: string]: ColumnData };
  data: KanbanData;
};

// <TyrKanban data={kanbanData}/>
export class TyrKanban extends React.Component<TyrKanbanProps, TyrKanbanState> {
  state: TyrKanbanState = {
    data: this.props.data
  };

  onDragEnd(result: DropResult, provided: ResponderProvided) {
    const { data } = this.state;
    const { columns, cards } = data;
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

    const droppedCard = cards.find(d => d.$id === draggableId);

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

    /*
    if (startColumn === finishColumn) {
      const newCards = cards.filter(card => card.columnId === startColumn.id);
      newCards.splice(source.index, 1);
      newCards.splice(source.index, 0, droppedCard);

      const newColumn = {
        ...startColumn,
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
      return;
    }

    const startCards = cards.filter(card => card.columnId === startColumn.id);
    startCards.splice(source.index, 1);

    const newStartColumn = {
      ...startColumn,
      data: startCards
    };

    const finishCards = cards.filter(card => card.columnId === finishColumn.id);
    finishCards.splice(destination.index, 0, droppedCard);

    const newFinishColumn = {
      ...finishColumn,
      data: finishCards
    };

    const newState = {
      ...this.state,
      columns: {
        ...this.state.columns,
        [newStartColumn.id]: newStartColumn,
        [newFinishColumn.id]: newFinishColumn
      }
    };

    this.setState(newState);
    */
  }

  render() {
    const { cardRenderer } = this.props;
    const { data } = this.state;
    const { columns, cards } = data;

    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <div className="tyr-kanban" style={kanbanStyle}>
          {columns.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              cards={cards.filter(card => card.columnId === column.id)}
              cardRenderer={cardRenderer}
              index={index}
            />
          ))}
        </div>
      </DragDropContext>
    );
  }
}

const columnStyle = {
  display: 'flex',
  flexDirection: 'column' as any,
  minWidth: '200px',
  margin: '8px',

  border: '1px solid grey',
  borderRadius: '2px'
};

const columnBodyStyle = {
  minHeight: '100px',
  padding: '8px',
  flexGrow: 1,

  transition: 'background-color 0.2s ease'
};

const columnTitleStyle = {
  padding: '8px'
};

export type ColumnProps = Readonly<{
  column: ColumnData;
  cards: CardData[];
  index: number;
  cardRenderer?: (data: CardData) => JSX.Element;
}>;

const ColumnTitle = (props: { label: string }) => (
  <div className="tyr-kanban-column-title" style={columnTitleStyle}>
    {props.label}
  </div>
);

export class Column extends React.Component<ColumnProps> {
  render() {
    const { column, cards } = this.props;

    return (
      <div className="tyr-kanban-column" style={columnStyle}>
        <ColumnTitle label={column.label} />
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`tyr-kanban-column-body${
                snapshot.isDraggingOver ? ' is-dragging-over' : ''
              }`}
              style={columnBodyStyle}
            >
              {cards.map((card, index) => (
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
