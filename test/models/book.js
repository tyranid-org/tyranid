import tyr from '../../src/tyranid';

var Book = new tyr.Collection({
  id: 'b00',
  name: 'book',
  fields: {
    _id: { is: 'integer' },
    isbn: { is: 'mongoid' }, // Pretend ISBNs are ObjectIds
    title: { is: 'string' },
    description: { is: 'string' },
    pages: { is: 'integer' }
  },
  primaryKey: { field: 'isbn', defaultMatchIdOnInsert: true }
});

export default Book;
