import * as util from 'util';
import * as os from 'os';
import * as fs from 'fs';

import Tyr from './tyr';

const stat = util.promisify(fs.stat);

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
    user: { link: 'user?' },
    //organization: { link: 'organization?' },
    //network: { link: 'network?' },
  },
  methods: {
    $start: {
      async fnServer() {
        this.startedAt = new Date();
        await this.$update({ fields: { startedAt: 1 } });
      },
    },
    $end: {
      parameters: {
        localFilePath: { is: 'string' },
      },
      async fnServer(localFilePath) {
        this.endedAt = new Date();

        const { s3 } = Tyr.byName;

        const filename = 'export';

        const stats = await stat(localFilePath);

        const key = s3.keyFor(TyrExports.fields.file, this._id, filename);
        await s3.uploadS3(key, localFilePath);

        this.file = {
          key,
          filename,
          type: 'text/csv',
          size: stats.size,
        };
        await this.$update({ fields: { endedAt: 1, file: 1 } });

        // TODO:  send a notification to the user
      },
    },
  },
  async fromClient(opts) {
    const user = opts.req.user;

    if (!this.on) this.on = new Date();
    if (!this.by) this.by = user._id;
  },
  service: {
    export: {
      background: true,
      params: {
        collectionId: { is: 'string', required: true },
        fields: { is: 'array', of: 'string', required: true },
        findOpts: { ...Tyr.catalog.FindOpts, required: true },
      },
    },
  },
});

TyrExport.service = {
  async export(collectionId, fields, findOpts) {
    const { user } = this;
    const userId = user.$id;

    const e = new TyrExport();
    e.user = userId;

    const collection = Tyr.byId[collectionId];

    await e.$start();

    const paths = [];
    for (const pathName of fields) {
      try {
        paths.push(collection.parsePath(pathName));
      } catch {
        paths.push((await collection.findField(pathName))?.path);
      }
    }

    const projection = Tyr.projectify(paths);
    const population = {};
    for (const path of paths) {
      const link = path.detail.link;

      if (link && link.labelField && !link.isStatic())
        Tyr.assignDeep(population, {
          [path.spath]: link.labelProjection(),
        });
    }

    const documents = await this.findAll({
      query: findOpts.query,
      projection,
      population,
      limit: findOpts.limit,
      auth: user,
    });

    const fileName = collectionId + '-' + userId.toString() + '-export.csv';
    const filePath = os.tmpdir() + '/' + fileName;

    await Tyr.csv.toCsv({
      collection,
      documents,
      columns: paths.map(path => ({
        path,
      })),
      filename: filePath,
    });

    await e.$end(filePath);
  },
};

export default TyrExport;
