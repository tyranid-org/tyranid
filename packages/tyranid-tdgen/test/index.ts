import { Tyr } from 'tyranid';
import test from 'ava';
import * as path from 'path';
import * as fs from 'fs';

import { generateFileSync, generateStream, generateFile } from '../src';
import { wordWrap } from '../src/util';

const root = __dirname.replace(`${path.sep}test`, '');

test.before(async () => {
  await Tyr.config({
    validate: [
      { dir: root + `${path.sep}test${path.sep}models`, fileMatch: '.*.js' }
    ]
  });
});

test('Should successfully write file', () => {
  generateFileSync(
    Tyr.collections,
    path.join(root, '../generated/isomorphic.d.ts'),
    { type: 'isomorphic' }
  );
});

test('Should successfully write file async', t => {
  return generateFile(
    Tyr.collections,
    path.join(root, '../generated/server.d.ts'),
    { type: 'server' }
  ).then(() => {
    t.pass();
  }); // void promise for ava
});

test('Should generate client-side definitions', t => {
  generateStream(Tyr.collections, { type: 'client' })
    .pipe(fs.createWriteStream(path.join(root, '../generated/client.d.ts')))
    .on('end', () => {
      t.pass();
    });
});

test('Word wrap should wrap long lines', t => {
  const str = `
Duis enim elit reprehenderit laborum quis sint irure cupidatat. Consequat quis consequat anim velit ullamco excepteur. Incididunt sunt excepteur eiusmod nisi cillum elit voluptate ullamco. Ad ex velit culpa voluptate non esse. Sunt sint officia dolore mollit consequat est magna cupidatat consequat irure esse consectetur. Cupidatat nulla veniam consectetur laboris excepteur laboris nostrud labore.
  `;
  const length = 80;
  const wrapped = wordWrap(str, length);
  const words = str.trim().split(/\s+/g);
  words.sort();
  const wrappedWords = wrapped.join(' ').trim().split(/\s+/g);
  wrappedWords.sort();

  t.deepEqual(words, wrappedWords);
  for (const line of wrapped) {
    t.true(line.length <= length);
  }
});

test('Word wrap should handle words longer than the line width', t => {
  const str = `
    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
  `;
  const length = 40;
  const wrapped = wordWrap(str, length);
  const joined = wrapped.join(' ');
  const wrappedWords = joined.replace(/- /g, '').split(' ');
  const split = str.trim().split(/\s+/g);
  split.sort();
  t.deepEqual(wrappedWords, split);
});

test('Should be able to break union type', t => {
  const unionType = `activeStatus|activityLog|activityLogType|agendaJob|agendaJobLog|answerStatus|application|approvalStatus|biMapEntry|calendarEvent|category|communicationRank|completionStatus|createdFromType|csvReport|dashboard|dashboardPanel|dataAdapter|dataAdapterRunStat|dataAdapterStatus|dataAdapterType|daySetting|dayTask|edgeMap|extEntity|feature|file|graclPermission|group|groupCommunicationInfluence|groupStatus|img|invite|inviteStatus|inviteType|itemSelection|language|layout|license|licenseType|logPromotionCategory|lookupType|lookupVal|metric|metricAdapterEntityType|metricData|metricObservation|metricObservationType|metricStatus|metricTarget|metricTargetType|migrationStatus|notification|notificationStatus|notificationSubType|notificationTaskStatus|notificationType|onaBetweennessCentralityScore|onaGraph|orgImport|orgImportStatus|organization|organizationStatus|outbrief|pageStatus|passwordPolicy|paymentLog|paymentLogType|presentationForum|presentationForumSession|presentationForumSessionStatus|presentationForumStatus|presentationStatus|presentationTemplate|question|questionDataType|questionInstanceDisplayType|questionInstanceStatus|questionLanguage|questionPersonType|questionStatus|questionType|respondent|response|review|reviewGroup|reviewReport|reviewStatus|skill|sliderValueDisplayType|spreadsheetTemplate|spreadsheetTemplateMappingType|sso|ssoStatus|ssoType|survey|surveyLanguage|surveyMessage|surveyMessageStatus|surveyMessageType|surveyResponse|surveyStatus|surveyType|tag|tinyString|tmFilter|tmLog|tmPriority|translation|triangleLayer|triangleLayerItem|triangleLayerItemActiveStatusType|triangleLayerItemDependencyStatus|triangleLayerItemDependencyType|triangleLayerItemLayerType|triangleLayerItemMetricThresholdType|triangleLayerItemOrder|triangleLayerItemStatus|triangleLayerItemStatusColor|triangleLayerItemStatusType|triangleLayerItemTaskStatus|triangleLayerItemTaskType|triangleLayerItemUpdateFrequency|triangleLayerItemUpdateStatus|trianglePresentationNotes|tyrLog|tyrLogEvent|tyrLogLevel|tyrSchema|tyrSchemaType|tyrUserAgent|unit|unitFactor|unitSystem|unitType|user|userCommunicationPercentile|userEmailData|userLandingFeature|userStatus|view|whiteLabel|workflow|workflowState|workflowType`;
  const wrapped = wordWrap(unionType, {
    split: /\|/,
    breakWords: false,
    join: '|'
  });
  const postWrapping = wrapped.join('|').split('|');
  const union = unionType.split('|');
  t.deepEqual(unionType, wrapped.join('|'));
  t.deepEqual(postWrapping, union);
});
