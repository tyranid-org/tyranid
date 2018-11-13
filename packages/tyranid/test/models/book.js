import tyr from '../../src/tyranid';

var Book = new tyr.Collection({
  id: 'b00',
  name: 'book',
  client: true,
  express: { rest: true },
  fields: {
    _id: { is: 'integer' },
    isbn: { is: 'mongoid' }, // Pretend ISBNs are ObjectIds
    serial: { is: 'mongoid' }, // Pretend serial #s are ObjectIds
    title: { is: 'string' },
    description: { is: 'string' },
    pages: {
      is: 'integer',
      async validate() {
        return this.pages > 5000 && 'Book is too big for the library';
      }
    },
    domain: { is: 'string' }
  },
  primaryKey: { field: 'isbn', defaultMatchIdOnInsert: true },
  fromClient(opts) {
    this.domain = 'custom';
  }
  //fromClient: function(opts) { this.domain = 'custom'; },
  //fromClient: opts => { this.domain = 'custom'; },
});

export default Book;
