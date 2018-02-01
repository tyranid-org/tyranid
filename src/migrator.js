
import * as path     from 'path';
import * as _        from 'lodash';
import * as nodeUuid from 'uuid';
import * as chalk    from 'chalk';

import Collection    from './core/collection';
import Tyr           from './tyr';

const clr       = chalk.hex('#cc5500'),
      clrMig    = chalk.hex('#cc0055'),
      clrDesc   = chalk.hex('#000000'),
      clrRed    = chalk.keyword('red'),
      clrGreen  = chalk.keyword('green'),
      clrYellow = chalk.hex('#aaaa00');

const MigrationStatus = new Collection({
  id: '_m1',
  name: 'tyrMigrationStatus',
  internal: true,
  fields: {
    _id: { is: 'string' },
    appliedOn : { is: 'date'},
    uuid: { is: 'string' }
  }
});

const doRemoveLock = async remove => {
  if (remove) {
    await MigrationStatus.db.remove({ '_id': '$$MIGRATION-LOCK' });
    log({ note: 'End Migration', end: true });
  }
};

const waitForUnLock = async () => {
  const lock = await MigrationStatus
    .findOne({ query: { _id: '$$MIGRATION-LOCK' } });

  if (!lock) {
    Tyr.options.migration.waitingOnMigration = false;
  } else {
    Tyr.options.migration.waitingOnMigration = true;
    logger.info('Waiting for migration to finish...');
    setTimeout( waitForUnLock, 5000);
  }
};

let allStartMs, startMs;

function log(opts) {
  let { migration, action, note, desc, error } = opts;

  if (desc) {
    let text = clr('*** ');
    text += clrMig.bold('^');
    text += clrDesc(' ' + desc);
    text += clrDesc(' '.padEnd(94 - desc.length));
    text += clr(' ***');
    console.log(text);
  } else if (migration) {
    let text = clr('*** ');
    text += clrMig.bold(`${migration}`);
    text += clr(' '.padEnd(30 - migration.length, '*'));
    text += ' ';

    let actionLabel, ms = '';
    switch (action) {
      case 'start':
        actionLabel = 'STARTING';
        text += clrGreen(actionLabel);
        startMs = Date.now();
        break;
      case 'complete':
        actionLabel = 'COMPLETE';
        text += clrGreen.bold(actionLabel);
        ms = ` (${Date.now() - startMs}ms)`;
        break;
      case 'skip':
        actionLabel = 'SKIPPING';
        text += clrYellow.bold(actionLabel);
        break;
      case 'error':
        actionLabel = 'ERROR';
        text += clrRed.bold(actionLabel);
        break;
      default:
      actionLabel = '';
    }

    note = note ? ' -- ' + note : '';
    text += clr(note);

    if (ms) {
      text += clr.bold(ms);
    }

    text += ''.padEnd(65 - actionLabel.length - note.length - ms.length);
    text += clr(' ***');
    console.log(text);

    if (error) {
      console.error(error);
    }
  } else {
    if (opts.start) {
      //console.log(clr(''.padEnd(104, '*')));
      allStartMs = Date.now();
    } else if (opts.end) {
      note += ` (${Date.now() - allStartMs}ms)`;
    }

    const filler = 102 - note.length;
    const leadFiller = Math.floor(filler / 2);
    let text = clr(''.padEnd(leadFiller, '*'));
    text += ' ';
    text += clr.bold(note);
    text += ' ';
    text += clr(''.padEnd(filler - leadFiller, '*'));
    console.log(text);

    //if (opts.end) console.log(clr(''.padEnd(104, '*')));
  }
}

export async function migrate(migrationArray) {
  const migrations = migrationArray || Tyr.options.migration.list;
  let removeLock = false;
  const uuid = nodeUuid.v4();

  try {
    const setOnInsert = { uuid };

    //console.log('Adding lock', setOnInsert);

    const lockObj = await MigrationStatus.findAndModify({
      query: { _id: '$$MIGRATION-LOCK' },
      update: {
        $setOnInsert : setOnInsert
      },
      new: true,
      upsert: true
    });

    //console.log('lockObj', JSON.stringify(lockObj, null, 2));

    if (_.get(lockObj, 'value.uuid') !== uuid) {
      waitForUnLock();
      return lockObj;
    }

    removeLock = true;

    log({ note: 'Beginning Migration', start: true });

    for (const migrationName of migrations) {
      const migration = require(path.join(Tyr.options.migration.dir, migrationName));

      if (migration.skip) {
        log({ migration: migrationName, action: 'skip', note: 'Marked as skip' });
        continue;
      }

      const m = await MigrationStatus.db.findOne({'_id' : migrationName});

      if (!m) {
        await MigrationStatus.db.save({
          _id : migrationName,
          appliedOn : new Date()
        });

        log({ migration: migrationName, action: 'start' });

        if (migration.desc) {
          log({ migration: migrationName, desc: migration.desc });
        }

        try {
          await migration.migrate();

          if (migration.noCommit) {
            await MigrationStatus.db.remove( { '_id' : migrationName } );
            log({ migration: migrationName, action: 'complete', note: 'Not committed' });
          } else {
            log({ migration: migrationName, action: 'complete' });
          }
        } catch (err) {
          console.log(err.stack);
          await MigrationStatus.db.remove( { '_id' : migrationName } );
          log({ migration: migrationName, action: 'error', error: err });
        }
      } else {
        log({ migration: migrationName, action: 'skip', note: 'Already applied' });
      }
    }
  } catch (err) {
    console.log(err.stack);
  } finally {
    doRemoveLock(removeLock);
  }
}

Tyr.migrate = migrate;
