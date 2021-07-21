import * as util from 'util';
import * as os from 'os';
import * as fs from 'fs';

import Tyr from '../tyr';

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

    // $authContext: { type: 'user'/*, role: 'creator' */ }
    // would insert the following:
    user: { link: 'user?' },
    //organization: { link: 'organization?' },
    //network: { link: 'network?' }
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
        mediaType: { is: 'string' },
      },
      async fnServer(localFilePath, mediaType) {
        this.endedAt = new Date();

        const { MediaType } = Tyr.collections;
        const { s3 } = Tyr.Type.byName;

        const mediaTypeObj = MediaType.byId(mediaType);
        if (!mediaTypeObj)
          throw new Tyr.AppError(`Unknown media type "${mediaType}"`);

        const filename = 'export.' + mediaTypeObj.extensions[0];

        const stats = await stat(localFilePath);

        const key = s3.def.keyFor(
          TyrExport.fields.file,
          this._id.toString(),
          filename
        );
        await s3.def.uploadS3(key, localFilePath);

        this.file = {
          key,
          filename,
          type: mediaType,
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
        name: { is: 'string' },
      },
    },
  },
});

TyrExport.service = {
  async export(collectionId, fields, findOpts, name) {
    const { user } = this;
    const userId = user.$id;

    const e = new TyrExport();

    // TODO:  examine componentOpts and try to create a readable version of the filter
    e.name = name || 'Export';
    e.user = userId;

    const collection = Tyr.byId[collectionId];
    e.collectionName = collection.name;

    await e.$save(); // save early to get an _id which we need for S3

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

    const documents = await collection.findAll({
      query: findOpts.query,
      projection,
      population,
      // limit: findOpts.limit, // No limit on export
      auth: user,
    });

    const fileName = `${collectionId}-${userId.toString()}-export.csv`;
    const filePath = os.tmpdir() + '/' + fileName;

    await Tyr.csv.toCsv({
      collection,
      documents,
      columns: paths.map(path => ({
        path,
      })),
      filename: filePath,
    });

    await e.$end(filePath, 'text/csv');
  },
};

export default TyrExport;
