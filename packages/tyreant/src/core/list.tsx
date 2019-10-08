import * as React from 'react';
import {
  DragDropContext,
  DropResult,
  ResponderProvided,
  Droppable,
  Draggable
} from 'react-beautiful-dnd';

const listItemData: ListItem[] = [
  {
    $id: '1',
    $label: 'item 1'
  },
  {
    $id: '2',
    $label: 'item 2'
  },
  {
    $id: '3',
    $label: 'item 3'
  }
];

type ListItem = {
  $id: string;
  $label: string;
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column' as any,
  minWidth: '200px',
  margin: '8px',

  border: '1px solid grey',
  borderRadius: '2px'
};

const listBodyStyle = {
  minHeight: '100px',
  padding: '8px',
  flexGrow: 1,

  transition: 'background-color 0.2s ease'
};

export type TyrListProps = Readonly<{
  items: ListItem[];
  title?: string | JSX.Element;
  itemRenderer?: (item: ListItem) => JSX.Element;
  onReorder?: (item: ListItem, fromIndex: number, toIndex: number) => void;
}>;

type TyrListState = {
  items: ListItem[];
};

// <TyrList items={listData}/>
export class TyrList extends React.Component<TyrListProps, TyrListState> {
  state: TyrListState = {
    items: this.props.items
  };

  onDragEnd(result: DropResult, provided: ResponderProvided) {
    const { onReorder } = this.props;
    const { items } = this.state;
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

    const droppedItem = items.find(d => d.$id === draggableId);

    if (!droppedItem) {
      console.log('Dropped item not found!');
      return;
    }

    const newItems = items.splice(0);

    newItems.splice(source.index, 1);
    newItems.splice(source.index, 0, droppedItem);

    const newState = {
      ...this.state,
      items: newItems
    };

    this.setState(newState);

    onReorder && onReorder(droppedItem, source.index, destination.index);
  }

  render() {
    const { itemRenderer, title } = this.props;
    const { items } = this.state;

    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <div className="tyr-list" style={listStyle}>
          {title && <ListTitle title={title} />}
          <Droppable droppableId="list-1">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`tyr-list-body${
                  snapshot.isDraggingOver ? ' is-dragging-over' : ''
                }`}
                style={listBodyStyle}
              >
                {items.map((item, index) => (
                  <Draggable draggableId={item.$id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {itemRenderer ? itemRenderer(item) : item.$label}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    );
  }
}

const listTitleStyle = {
  padding: '8px'
};

const ListTitle = (props: { title: string | JSX.Element }) => (
  <div className="tyr-list-title" style={listTitleStyle}>
    {props.title}
  </div>
);
