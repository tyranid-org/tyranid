import * as awsS3 from 'aws-s3-promisified';
import * as fs from 'fs';
import * as multiparty from 'connect-multiparty';
import * as tmp from 'tmp-promise';
import { ObjectID } from 'mongodb';

import Tyr from '../tyr';

const { MediaType } = Tyr.collections;

const s3 = awsS3();
const multipartyMiddleware = multiparty();

function keyPathFor(collection, docId) {
  return `${collection.def.name}/${docId.substring(0, 3)}/${docId}`;
}

function keyFor(field, docId, filename) {
  const { collection, path } = field;

  const safeFileName = filename.replace(/\+/g, '%2B');

  // TODO:  what about arrays?
  return `${keyPathFor(collection, docId)}/${path.spath}-${safeFileName}`;
}

function keyForTmp(field, tmpId, filename) {
  const { collection, path } = field;

  // TODO:  what about arrays?
  return `${collection.def.name}/tmp/${tmpId}/${path.spath}-${filename}`;
}

/**
 *
 * FIELDS FORMAT
 *
 * fields: {
 *   file: { is: 's3', of: [ 'image/*', 'video/*'] }
 * }
 *
 * VALUE FORMAT
 *
 * {
 *   filename: string; // the name of the file that was originally uploaded
 *   key: string; // key in s3 bucket
 *   type: string; // media type
 *   tmpId?: string; // temporary id assigned before the document has been saved
 *   size: number; // the size of the file
 * }
 */
/*const S3Type = */ new Tyr.Type({
  name: 's3',

  compile(compiler, field) {
    let of = field.def.of;

    if (compiler.stage !== 'link') return;

    if (of) {
      if (!Array.isArray(of)) {
        of = [of];
      }

      for (const mediaType of of) {
        if (!MediaType.isValid(mediaType)) {
          throw compiler.err(
            field.pathName,
            `"${mediaType}" is not a valid media type`
          );
        }
      }

      field.of = of;
    }

    const { collection } = field;

    // check to see if we are the first s3 field in this collection since if there are
    // multiple s3 fields we only want to add these event handlers once
    const { paths } = collection;
    for (const pathName in paths) {
      const ofield = paths[pathName];

      if (ofield.type === this) {
        if (field === ofield) {
          break;
        }

        return;
      }
    }

    const s3 = this;

    if (!collection._hasS3) {
      collection._hasS3 = true;

      collection.on({
        type: 'change',
        when: 'post',
        order: 0,
        async handler(event) {
          for (const doc of await event.documents) {
            await s3.def.updateS3(doc);
          }
        },
      });

      collection.on({
        type: 'remove',
        when: 'pre',
        async handler(event) {
          for (const doc of await event.documents) {
            s3.def.removeS3(doc);
          }
        },
      });
    }
  },

  routes(opts) {
    const { app /*, auth */ } = opts;

    if (!Tyr.options.aws) return;

    app
      .route('/api/:collectionName/:path/s3/:docId?')
      .post(multipartyMiddleware, async (req, res, next) => {
        try {
          const { collectionName, path, docId } = req.params;
          const file = req.files.file;

          const { originalFilename: filename, type: mediaType } = file;
          //console.log('file', file);

          //const idx = filename.lastIndexOf('.');
          //const ext = filename.substring(idx + 1);

          const col = Tyr.byName[collectionName];
          if (!col) return res.sendStatus(404);

          const np = col.parsePath(path);
          const field = np.detail;

          if (field.of && !MediaType.matches(field.of, mediaType)) {
            res.status(415).json({
              msg: `"${mediaType}" is not a valid upload document type for this field.`,
            });
            return;
          }

          let key, tmpId;
          if (!docId) {
            tmpId = new ObjectID();
            key = keyForTmp(field, tmpId.toString(), filename);
          } else {
            key = keyFor(field, docId, filename);
          }

          /*const rslt = */ await s3.def.uploadS3(key, file.path);
          res.status(200).json({ key, tmpId });
        } catch (err) {
          console.error(err.stack);
          res.sendStatus(500);
        }
      });
  },

  //fromClient(field, value) {
  //},

  //toClient(field, value) {
  //},

  //format(field, value) {
  //return field.link.idToLabel(value);
  //}
  async updateS3(doc) {
    if (!doc._id) return;

    const aws = Tyr.options.aws;
    const bucket = aws && aws.bucket;
    if (!bucket) return;

    const col = doc.$model;
    const docId = doc._id.toString();

    const expectedKeys = [];

    const paths = col.paths;
    for (const pathName in paths) {
      const field = paths[pathName];
      if (!field) continue;
      const { type } = field;

      if (type.name !== 's3') continue;

      const val = field.path.get(doc);

      if (val) {
        if (val.tmpId) {
          const tmpKey = val.key;

          const newKey = keyFor(field, docId, val.filename);

          try {
            console.info(`S3 [${bucket}] COPY [${tmpKey}] => [${newKey}]`);
            await s3.copyObject(bucket, tmpKey, bucket, newKey);
          } catch (err) {
            console.error(
              's3.copyObject, tmpKey=' + tmpKey + ', newKey=' + newKey,
              err
            );
          }

          val.key = newKey;
          delete val.tmpId;

          // update the field directly so that we do not recursively call this handler
          await col.db.updateOne(
            { _id: doc._id },
            { $set: { [field.path.spath]: val } }
          );

          try {
            console.info(`S3 [${bucket}] DELETE [${tmpKey}]`);
            await s3.deleteObject(bucket, tmpKey);
          } catch (err) {
            console.error('s3.deleteObject, key=' + tmpKey, err);
          }
        }

        expectedKeys.push(val.key);
      }
    }

    const keyPath = keyPathFor(col, docId);
    console.info(`S3 [${bucket}] LIST [${keyPath}]`);
    const contents = await s3.listObjects(bucket, keyPath);

    if (contents.Contents) {
      for (const content of contents.Contents) {
        const key = content.Key;

        if (expectedKeys.indexOf(key) < 0) {
          console.info(`S3 [${bucket}] UNEXPECTED, DELETE [${key}]`);
          await s3.deleteObject(bucket, key);
        }
      }
    }
  },

  async removeS3(doc) {
    const aws = Tyr.options.aws;
    const bucket = aws && aws.bucket;
    if (!bucket) return;

    const keyPath = keyPathFor(doc.$model, doc._id.toString());
    console.info(`S3 [${bucket}] LIST [${keyPath}]`);
    const contents = await s3.listObjects(bucket, keyPath);

    if (contents.Contents) {
      for (const content of contents.Contents) {
        const key = content.Key;

        console.info(`S3 [${bucket}] DELETE [${key}]`);
        await s3.deleteObject(bucket, key);
      }
    }
  },

  async streamS3(doc) {
    const aws = Tyr.options.aws;
    const bucket = aws && aws.bucket;
    if (!bucket) return;

    const keyPath = keyPathFor(doc.$model, doc._id.toString());
    console.info(`S3 [${bucket}] GET [${keyPath}]`);
    return await s3.getObject(bucket, keyPath);
  },

  async downloadS3(field, doc, path) {
    if (!path) {
      const o = await tmp.file();
      path = o.path;
    }

    const aws = Tyr.options.aws;
    const bucket = aws && aws.bucket;
    if (!bucket) return;

    const value = field.path.get(doc);
    const keyPath = value.key;
    console.info(`S3 [${bucket}] GET [${keyPath}]`);
    await s3.saveObjectToFile(bucket, keyPath, path);

    return path;
  },

  async uploadS3(key, pathName) {
    const rslt = await s3.putFile(Tyr.options.aws.bucket, key, pathName);

    fs.unlink(file.path, err => console.error(err));

    return rslt;
  },

  keyFor(field, docId, filename) {
    return keyFor(field, docId, filenmame);
  },
});
