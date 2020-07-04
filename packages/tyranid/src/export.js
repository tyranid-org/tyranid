import Tyr from './tyr';

const TyrExport = new Tyr.Collection({
  id: '_ex',
  name: 'tyrExport',
  internal: true,
  express: {
    rest: true,
  },
  fields: {
    _id: { is: 'mongoid' },

    name: { is: 'string', labelField: true },

    collectionName: { is: 'string' },
    file: { is: 's3' },

    on: { is: 'datetime', help: 'This is when the export was requested.' },

    componentOpts: {
      is: 'object',
      fields: {
        findOpts: { is: 'object' },
        fields: { is: 'array', of: 'string' },
      },
      note:
        'This contains the component options that were set when the export was begun, e.g. filters, etc.',
    },

    startedAt: {
      is: 'datetime',
      help: 'This is when the export file was started.',
    },
    endedAt: {
      is: 'datetime',
      help: 'This is when the export file was completed generating.',
    },

    //$authContext: { type: 'user'/*, role: 'creator' */ }
    // would insert the following:
    by: { link: 'user?' },
    organization: { link: 'organization?' },
    network: { link: 'network?' },

    // NOTE:  Tyr.config.userSchema properties automatically mixed in here
  },
  /*
  methods: {
    $start: {
      async fn() {
        this.startedAt = new Date();
        await this.$update({ fields: { startedAt: 1 } });
      },
    },
    $end: {
      parameters: {
        localFilePath: { is: 'string' },
      },
      async fn(localFilePath) {
        this.endedAt = new Date();

        // TODO:  upload this file to s3 and update this.file

        await this.$update({ fields: { endedAt: 1, file: 1 } });

        // TODO:  send a notification to the user
      },
    },
  },
  */
  async fromClient(opts) {
    const user = opts.req.user;

    if (!this.on) this.on = new Date();
    if (!this.by) this.by = user._id;
  },
});

export default TyrExport;
