/// <reference path="./types/server.d.ts" />

import test, { TestContext } from 'ava';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as path from 'path';
import { Tyr } from 'tyranid';

import * as tyranidGracl from '../../src/';

import { captureLogStream } from '../helpers/captureLogStream';
import { createTestData } from '../helpers/createTestData';
import { expectAsyncToThrow } from '../helpers/expectAsyncToThrow';
import { expectedLinkPaths } from '../helpers/expectedLinkPaths';
import { Blog } from '../models/';

import { PermissionsModel } from '../../src/models/PermissionsModel';

import { findLinkInCollection } from '../../src/graph/findLinkInCollection';
import { getCollectionLinksSorted } from '../../src/graph/getCollectionLinksSorted';
import { getShortestPath } from '../../src/graph/getShortestPath';
import { stepThroughCollectionPath } from '../../src/graph/stepThroughCollectionPath';

import { documentMethods } from '../../src/tyranid/documentMethods';
import { validate as validateUid } from '../../src/tyranid/extractIdAndModel';
import { mixInDocumentMethods } from '../../src/tyranid/mixInDocumentMethods';

type GraclPlugin = tyranidGracl.GraclPlugin;

const VERBOSE_LOGGING = false;

const permissionTypes = [
  { name: 'own', abstract: false },
  { name: 'edit', format: 'TEST_LABEL', abstract: false, parent: 'own' },
  {
    name: 'view',
    format(act: string, col?: string) {
      return `Allowed to view ${_.capitalize(col)}`;
    },
    parent: 'edit',
    abstract: false
  },
  { name: 'delete', abstract: false },
  {
    name: 'abstract_view_chart',
    abstract: true,
    parents: ['view-user', 'view-post']
  },
  { name: 'view_alignment_triangle_private', abstract: true },

  {
    name: 'view-blog',
    collection: true,
    parents: ['view_alignment_triangle_private']
  }
];

const root = __dirname.replace(`${path.sep}test${path.sep}spec`, '');
const secure = new tyranidGracl.GraclPlugin({
  verbose: VERBOSE_LOGGING,
  permissionTypes
});

const checkStringEq = (
  t: TestContext,
  got: string[],
  want: string[],
  message = ''
) => {
  t.deepEqual(
    _.map(got, s => s.toString()),
    _.map(want, s => s.toString()),
    message
  );
};

async function giveBenAccessToChoppedPosts(t: TestContext, perm = 'view') {
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const chopped = await Tyr.byName.organization.findOne({
    query: { name: 'Chopped' }
  });

  if (!chopped || !ben) {
    throw new Error(`No ben or chopped!`);
  }

  t.truthy(ben, 'ben should exist');
  t.truthy(chopped, 'chopped should exist');

  const updatedChopped = await secure.permissionsModel.updatePermissions(
    chopped,
    { [`${perm}-post`]: true },
    ben
  );

  if (!updatedChopped) {
    throw new Error(`No updated chopped!`);
  }

  return updatedChopped;
}

let plugin: GraclPlugin;

test.before(async t => {
  const mongoClient = await mongodb.MongoClient.connect(
    'mongodb://127.0.0.1:27017/tyranid_gracl_test',
    { poolSize: 20, useNewUrlParser: true }
  );

  t.throws(() => {
    PermissionsModel.getGraclPlugin();
  });

  Tyr.config({
    mongoClient,
    db: mongoClient.db(),
    validate: [
      {
        dir: root + `${path.sep}test${path.sep}models`,
        fileMatch: '.*.js'
      }
    ],
    secure,
    cls: false,
    permissions: {
      find: 'view',
      insert: 'edit',
      update: 'edit',
      remove: 'delete'
    }
  });

  await secure.createIndexes();

  plugin = secure as GraclPlugin;

  await createTestData();
  t.pass();
});

test.beforeEach(createTestData);

test.serial('Should correctly validate uid', t => {
  t.throws(() => {
    validateUid(plugin, 'asdfasdfasdfasdf');
  });
  t.throws(() => {
    validateUid(plugin, 'xxxf32caa57cb7dceac70ef8d0a');
  }, /No collection found for id "xxx"/);
});

test.serial('Should produce correctly formatted labels', t => {
  t.deepEqual(
    secure.formatPermissionLabel('view-blog'),
    `Allowed to view Blog`
  );
  t.deepEqual(
    secure.formatPermissionLabel('view_alignment_triangle_private'),
    'View Alignment Triangle Private'
  );
  t.deepEqual(secure.formatPermissionLabel('edit-user'), 'TEST_LABEL');
});

test.serial('mixInDocumentMethods should throw when called again', t => {
  t.throws(() => {
    mixInDocumentMethods(Tyr.secure as GraclPlugin);
  });
});

test.serial('Should log formatted log output', t => {
  const hook = captureLogStream(process.stdout);
  plugin.verbose = true;
  plugin.log('TEST MESSAGE');
  plugin.verbose = false;
  hook.unhook();
  t.regex(hook.captured(), /tyranid-gracl: TEST MESSAGE/);
});

test.serial('should correctly find links using getCollectionLinksSorted', t => {
  const Chart = Tyr.byName.chart;
  const options = { direction: 'outgoing' };
  const links = getCollectionLinksSorted(secure, Chart, options);

  t.deepEqual(
    links,
    _.sortBy(Chart.links(options), field => field.link!.def.name),
    'should produce sorted links'
  );
});

test.serial('should find specific link using findLinkInCollection', t => {
  const Chart = Tyr.byName.chart;
  const User = Tyr.byName.user;
  const linkField = findLinkInCollection(secure, Chart, User);

  t.truthy(linkField);
  t.deepEqual(linkField.link && linkField.link.def.name, 'user');
  t.deepEqual(linkField.spath, 'userIds');
});

test.serial(
  'should return correct ids after calling stepThroughCollectionPath',
  async t => {
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const chipotleBlogs = await Tyr.byName.blog.findAll({
      query: {
        organizationId: chipotle ? chipotle.$id : new mongodb.ObjectID()
      }
    });
    const blogIds = _.map(chipotleBlogs, '_id') as mongodb.ObjectID[];
    const chipotlePosts = await Tyr.byName.post.findAll({
      query: { blogId: { $in: blogIds } }
    });
    const postIds = _.map(chipotlePosts, '_id') as mongodb.ObjectID[];

    const steppedPostIds = await stepThroughCollectionPath(
      secure,
      blogIds,
      Tyr.byName.blog,
      Tyr.byName.post
    );

    checkStringEq(
      t,
      steppedPostIds.nextCollectionIds.map(s => s.toString()),
      _.map(postIds, i => i.toString()),
      'ids after stepping should be all relevant ids'
    );

    await expectAsyncToThrow(
      t,
      () =>
        stepThroughCollectionPath(
          secure,
          blogIds,
          Tyr.byName.blog,
          Tyr.byName.user
        ),
      /cannot step through collection path, as no link to collection/,
      'stepping to a collection with no connection to previous col should throw'
    );
  }
);

test.serial('should correctly produce paths between collections', t => {
  for (const a in expectedLinkPaths) {
    if (!expectedLinkPaths.hasOwnProperty(a)) {
      continue;
    }
    for (const b in expectedLinkPaths[a]) {
      if (!expectedLinkPaths[a].hasOwnProperty(b)) {
        continue;
      }
      t.deepEqual(
        getShortestPath(secure, Tyr.byName[a], Tyr.byName[b]),
        expectedLinkPaths[a][b] || [],
        `Path from ${a} to ${b}`
      );
    }
  }
});

test.serial('should add permissions methods to documents', async t => {
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const methods = Object.keys(documentMethods) as Array<keyof Tyr.Document>;

  for (const method of methods) {
    if (method) {
      t.truthy(ben && ben[method], `should have method: ${method}`);
    }
  }
});

test.serial(
  'should create subject and resource classes for collections without links in or out',
  t => {
    t.true(secure.graclHierarchy.resources.has('usagelog'));
    t.true(secure.graclHierarchy.subjects.has('usagelog'));
  }
);

test.serial(
  'should return all relevant permissions on GraclPlugin.getAllPermissionTypes()',
  t => {
    const numOfResources = secure.graclHierarchy.resources.size;
    const numOfCrudPerms = _.filter(
      permissionTypes,
      (perm: { abstract?: boolean; collection?: boolean }) => {
        return !perm.abstract && !perm.collection;
      }
    ).length;
    const numOfAbstractPerms = _.filter(
      permissionTypes,
      (perm: { abstract?: boolean; collection?: boolean }) => {
        return perm.abstract;
      }
    ).length;
    const allPermissionTypes = secure.getAllPossiblePermissionTypes();
    t.deepEqual(
      allPermissionTypes.length,
      numOfAbstractPerms + numOfResources * numOfCrudPerms,
      'should have the correct number'
    );
  }
);

test.serial(
  'should return correct parent permissions on GraclPlugin.getPermissionParents(perm)',
  t => {
    const viewBlogParents = secure.getPermissionParents('view-blog');
    t.deepEqual(
      viewBlogParents.length,
      3,
      'view-blog should have three parent permissions'
    );
    t.notDeepEqual(
      viewBlogParents.indexOf('edit-blog'),
      -1,
      'view-blog should have edit-blog parent'
    );
    t.notDeepEqual(
      viewBlogParents.indexOf('view_alignment_triangle_private'),
      -1,
      'view-blog should have view_alignment_triangle_private parent'
    );
  }
);

test.serial(
  'should return correct permission children on GraclPlugin.getPermissionChildren(perm)',
  t => {
    const editPostChildren = secure.getPermissionChildren('edit-post');
    const editChildren = secure.getPermissionChildren('edit');
    t.notDeepEqual(
      editChildren.indexOf('view'),
      -1,
      'should include crud child'
    );
    t.notDeepEqual(
      editPostChildren.indexOf('abstract_view_chart'),
      -1,
      'should include specifically set abstract child'
    );
    t.notDeepEqual(
      editPostChildren.indexOf('view-post'),
      -1,
      'should include collection specific crud child'
    );
  }
);

interface Permission extends Tyr.Document {
  resourceId: mongodb.ObjectID;
  subjectId: mongodb.ObjectID;
  access: { [key: string]: boolean | void };
}

test.serial('should successfully add permissions', async t => {
  const updatedChopped = await giveBenAccessToChoppedPosts(t);
  const choppedPermissions = (await updatedChopped.$permissions(
    undefined,
    'resource'
  )) as Permission[];
  const existingPermissions = (await Tyr.byName.graclPermission.findAll({
    query: {}
  })) as Permission[];

  t.deepEqual(existingPermissions.length, 1);
  t.deepEqual(
    existingPermissions[0].resourceId.toString(),
    choppedPermissions[0].resourceId.toString(),
    'resourceId'
  );
  t.deepEqual(
    existingPermissions[0].subjectId.toString(),
    choppedPermissions[0].subjectId.toString(),
    'subjectId'
  );
  t.deepEqual(
    existingPermissions[0].access['view-post'],
    choppedPermissions[0].access['view-post'],
    'access'
  );
});

test.serial('should respect subject / resource hierarchy', async t => {
  await giveBenAccessToChoppedPosts(t);

  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const choppedBlog = await Tyr.byName.blog.findOne({
    query: { name: 'Salads are great' }
  });

  t.truthy(ben, 'ben should exist');
  t.truthy(choppedBlog, 'choppedBlog should exist');

  t.true(
    !!(ben && choppedBlog && (await choppedBlog.$isAllowed('view-post', ben))),
    'ben should have access to choppedBlog through access to chopped org'
  );
});

test.serial('should respect permissions hierarchy', async t => {
  await giveBenAccessToChoppedPosts(t, 'edit');

  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const choppedBlog = await Tyr.byName.blog.findOne({
    query: { name: 'Salads are great' }
  });

  t.truthy(ben, 'ben should exist');
  t.truthy(choppedBlog, 'choppedBlog should exist');

  t.true(
    !!(ben && choppedBlog && (await choppedBlog.$isAllowed('view-post', ben))),
    `ben should have 'view' access to choppedBlog through 'edit' access to chopped org`
  );
});

test.serial('should explain access result', async t => {
  await giveBenAccessToChoppedPosts(t, 'edit');

  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const choppedBlog = await Tyr.byName.blog.findOne({
    query: { name: 'Salads are great' }
  });
  const chipotleBlog = await Tyr.byName.blog.findOne({
    query: { name: 'Mexican Empire' }
  });
  const chipotlePost = await Tyr.byName.post.findOne({
    query: { blogId: chipotleBlog!._id }
  });
  const choppedPost = await Tyr.byName.post.findOne({
    query: { blogId: choppedBlog!._id }
  });

  const {
    explainations: resultChipotle
  } = await secure.permissionsModel.explainAccess(chipotlePost!, 'edit', ben!);

  const {
    explainations: resultChopped
  } = await secure.permissionsModel.explainAccess(choppedPost!, 'edit', ben!);

  t.deepEqual(resultChipotle, [
    {
      type: tyranidGracl.ExplainationType.UNSET,
      subjectPath: [],
      resourcePath: []
    }
  ]);

  t.deepEqual(resultChopped[0].type, tyranidGracl.ExplainationType.ALLOW);
  t.deepEqual(resultChopped[0].resourcePath, [
    'p00' + choppedPost!._id,
    'b00' + choppedBlog!._id,
    'o00' + choppedBlog!.organizationId
  ]);
  t.deepEqual(resultChopped[0].property, 'blogId');
  t.deepEqual(resultChopped[0].permissionType, 'edit-post');
});

test.serial(
  'should create human readable access explaination result',
  async t => {
    await giveBenAccessToChoppedPosts(t, 'edit');

    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    const choppedBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Salads are great' }
    });

    const choppedPost = await Tyr.byName.post.findOne({
      query: { blogId: choppedBlog!._id }
    });

    const result = await secure.permissionsModel.explainAccess(
      choppedPost!,
      'edit',
      ben!
    );

    t.is(result.explainations.length, 1);
    t.is(result.explainations[0].resourcePath.length, 3);
    t.is(result.explainations[0].subjectPath.length, 1);
    t.is(result.hasAccess, true);
  }
);

test.serial(
  'should create human readable access explaination result (with long subject chain)',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    await chipotle!.$allow('edit-post', chipotle!);

    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const chipotlePost = await Tyr.byName.post.findOne({
      query: { blogId: chipotleBlog!._id }
    });

    const result = await secure.permissionsModel.explainAccess(
      chipotlePost!,
      'edit',
      ben!
    );

    t.is(result.explainations.length, 2);
    t.is(result.explainations[0].resourcePath.length, 3);
    t.is(result.explainations[0].subjectPath.length, 3);
    t.is(result.hasAccess, true);
  }
);

test.serial(
  'should create human readable access explaination result (with long subject chain, using doc method)',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    await chipotle!.$allow('edit-post', chipotle!);

    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const chipotlePost = await Tyr.byName.post.findOne({
      query: { blogId: chipotleBlog!._id }
    });

    const result = await chipotlePost!.$explainAccess('edit', ben!);

    if (typeof result === 'string') {
      throw new Error(`Should return metadata`);
    }

    t.is(result.explainations.length, 2);
    t.is(result.explainations[0].resourcePath.length, 3);
    t.is(result.explainations[0].subjectPath.length, 3);
    t.is(result.hasAccess, true);
  }
);

test.serial(
  'should correctly respect combined permission/subject/resource hierarchy',
  async t => {
    // Set deny view-access for parent subject to parent resource
    // Set allow edit-access for child subject to child resource
    // should return true when checking if child subject can view

    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const chipotleCorporateBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });

    if (!ben || !chipotle || !chipotleCorporateBlog) {
      throw new Error(`missing docs!`);
    }

    await chipotleCorporateBlog.$allow('edit-post', ben);
    await chipotle.$deny('view-post', chipotle);
    await chipotle.$deny('edit-post', chipotle);

    const access = await chipotleCorporateBlog.$isAllowed('view-post', ben);
    t.true(access, 'Ben should have view access to blog');
  }
);

test.serial('should validate permissions', async t => {
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const chipotleCorporateBlog = await Tyr.byName.blog.findOne({
    query: { name: 'Mexican Empire' }
  });

  if (!ben || !chipotleCorporateBlog) {
    throw new Error(`missing docs!`);
  }

  t.truthy(ben, 'ben should exist');
  t.truthy(chipotleCorporateBlog, 'chipotleCorporateBlog should exist');

  await expectAsyncToThrow(
    t,
    () => chipotleCorporateBlog.$isAllowed('viewBlahBlah', ben),
    /Invalid permission type/g,
    `checking 'viewBlahBlah' should throw`
  );
});

test.serial(
  'should successfully find permission when multiple permissions parents',
  async t => {
    await giveBenAccessToChoppedPosts(t);

    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`missing docs!`);
    }

    const access = await chopped.$isAllowed('abstract_view_chart', ben);
    t.true(access);
  }
);

test.serial('should throw error when passing invalid uid', async t => {
  const chopped = await Tyr.byName.organization.findOne({
    query: { name: 'Chopped' }
  });
  if (!chopped) {
    throw new Error(`missing docs!`);
  }

  await expectAsyncToThrow(
    t,
    () =>
      chopped.$allow('abstract_view_chart', {
        $uid: 'u00undefined',
        $model: Tyr.byName.user
      } as any), // tslint:disable-line
    /Invalid uid/g,
    'invalid uid should throw (allow, string)'
  );

  await expectAsyncToThrow(
    t,
    () => chopped.$allow('abstract_view_chart', 'u00undefined'),
    /Invalid uid/g,
    'invalid uid should throw (allow, doc)'
  );

  await expectAsyncToThrow(
    t,
    () => chopped.$isAllowed('abstract_view_chart', 'u00undefined'),
    /Invalid uid/g,
    'invalid uid should throw (isAllowed, string)'
  );
});

test.serial(
  'should skip a link in the hierarchy chain when no immediate parent ids present',
  async t => {
    const noTeamUser = await Tyr.byName.user.findOne({
      query: { name: 'noTeams' }
    });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    if (!noTeamUser || !chopped || !chipotle) {
      throw new Error(`missing docs!`);
    }

    chopped.$allow('view-post', chipotle);

    const access = await chopped.$isAllowed('view-post', noTeamUser);
    t.true(
      access,
      'noTeamUser should have access even without teams linking to org'
    );
  }
);

test.serial(
  'should skip multiple links in the hierarchy chain when no immediate parent ids present',
  async t => {
    const freeComment = await Tyr.byName.comment.findOne({
      query: { text: 'TEST_COMMENT' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    if (!ben || !chipotle || !freeComment) {
      throw new Error(`missing docs!`);
    }

    await chipotle.$allow('view-comment', ben);

    const access = await freeComment.$isAllowed('view-comment', ben);
    t.true(access, 'ben should have access through organization');
  }
);

test.serial(
  'should skip multiple links in the hierarchy chain when no immediate parent ids present, passing uid, using model',
  async t => {
    const freeComment = await Tyr.byName.comment.findOne({
      query: { text: 'TEST_COMMENT' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    if (!ben || !chipotle || !freeComment) {
      throw new Error(`missing docs!`);
    }

    await PermissionsModel.updatePermissions(
      chipotle.$uid,
      {
        'view-comment': true
      },
      ben.$uid
    );

    const access = await freeComment.$isAllowed('view-comment', ben);
    t.true(access, 'ben should have access through organization');
  }
);

test.serial(
  'should modify existing permissions instead of creating new ones',
  async t => {
    await giveBenAccessToChoppedPosts(t);

    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`missing docs!`);
    }

    t.is(
      (await chopped.$permissions(undefined, 'resource')).length,
      1,
      'chopped should start with one permission'
    );

    t.truthy(ben, 'ben should exist');
    t.truthy(chopped, 'chopped should exist');

    t.is(
      (await chopped.$permissions(undefined, 'resource')).length,
      1,
      'chopped should end with one permission'
    );

    const allPermissions = await tyranidGracl.PermissionsModel.findAll({
      query: {}
    });

    t.is(
      allPermissions.length,
      1,
      'there should be one permission in the database'
    );
  }
);

test.serial(
  'should successfully remove all permissions after secure.deletePermissions()',
  async t => {
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });
    const cava = await Tyr.byName.organization.findOne({
      query: { name: 'Cava' }
    });
    const post = await Tyr.byName.post.findOne({
      query: { text: 'Why burritos are amazing.' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    if (!chopped || !cava || !post || !chipotle || !ben || !ted) {
      throw new Error(`Missing documents`);
    }

    t.true(
      !(await ted.$permissions()).length,
      'initially should have no permissions'
    );

    const permissionsForTed = await Tyr.byName.graclPermission.findAll({
      query: {
        $or: [{ subjectId: ted.$uid }, { resourceId: ted.$uid }]
      }
    });

    t.falsy(
      permissionsForTed.length,
      'global search for permissions should turn up nothing'
    );

    const prePermissionChecks = await Promise.all([
      chopped.$isAllowed('view-user', ted),
      cava.$isAllowed('view-post', ted),
      post.$isAllowed('edit-post', ted),
      ted.$isAllowed('view-user', ben),
      chipotle.$isAllowed('view-post', ted)
    ]);

    t.false(
      _.every(prePermissionChecks),
      'all initial perm checks should return false'
    );

    const permissionOperations = await Promise.all([
      chopped.$allow('view-user', ted),
      cava.$allow('view-post', ted),
      post.$allow('edit-post', ted),
      chipotle.$deny('view-post', ted),
      ted.$allow('view-user', ben)
    ]);

    t.is(
      (await ted.$permissions(undefined, 'resource', true)).length,
      1,
      'after populating teds permission (as resource), one permission should show up'
    );

    const updatedPermissionsForTed = await Tyr.byName.graclPermission.findAll({
      query: {
        $or: [{ subjectId: ted.$uid }, { resourceId: ted.$uid }]
      }
    });

    t.is(updatedPermissionsForTed.length, permissionOperations.length);

    const permissionChecks = await Promise.all([
      chopped.$isAllowed('view-user', ted),
      cava.$isAllowed('view-post', ted),
      post.$isAllowed('edit-post', ted),
      ted.$isAllowed('view-user', ben)
    ]);

    const tedSubjectPermissions = await ted.$permissions();
    t.is(tedSubjectPermissions.length, 4);

    const tedResourcePermissions = await ted.$permissions(
      undefined,
      'resource'
    );
    t.is(tedResourcePermissions.length, 2);

    const tedDirectResourcePermissions = await ted.$permissions(
      undefined,
      'resource',
      true
    );
    t.is(tedDirectResourcePermissions.length, 1);

    t.true(_.every(permissionChecks));
    t.false(await chipotle.$isAllowed('view-post', ted));

    await secure.permissionsModel.deletePermissions(ted);

    const postPermissionChecks = await Promise.all([
      chopped.$isAllowed('view-user', ted),
      cava.$isAllowed('view-post', ted),
      post.$isAllowed('edit-post', ted),
      ted.$isAllowed('view-user', ben)
    ]);

    t.false(_.every(postPermissionChecks));

    const updatedChopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });
    const updatedCava = await Tyr.byName.organization.findOne({
      query: { name: 'Cava' }
    });
    const updatedPost = await Tyr.byName.post.findOne({
      query: { text: 'Why burritos are amazing.' }
    });
    const updatedChipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    if (!updatedChopped || !updatedCava || !updatedPost || !updatedChipotle) {
      throw new Error(`Missing documents`);
    }

    t.falsy((await updatedChopped.$permissions(undefined, 'resource')).length);
    t.falsy((await updatedCava.$permissions(undefined, 'resource')).length);
    t.falsy((await updatedPost.$permissions(undefined, 'resource')).length);
    t.falsy((await updatedChipotle.$permissions(undefined, 'resource')).length);
  }
);

test.serial('should work if passing uid instead of document', async t => {
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const chopped = await Tyr.byName.organization.findOne({
    query: { name: 'Chopped' }
  });

  if (!ben || !chopped) {
    throw new Error(`Missing documents`);
  }

  await chopped.$allow('view-post', ben.$uid);
  await chopped.$deny('view-blog', ben.$uid);

  const blogExplaination = await chopped.$explainPermission(
    'view-blog',
    ben.$uid
  );
  const postAccess = await chopped.$isAllowed('view-post', ben.$uid);

  t.regex(
    blogExplaination.reason,
    /Permission set on <Resource:organization/,
    'blogExplaination.reason'
  );
  t.false(blogExplaination.access, 'blogExplaination.access');
  t.is(blogExplaination.type, 'view-blog', 'blogExplaination.type');
  t.true(postAccess, 'postAccess');
});

test.serial('should correctly explain permissions', async t => {
  await giveBenAccessToChoppedPosts(t);

  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const chopped = await Tyr.byName.organization.findOne({
    query: { name: 'Chopped' }
  });

  if (!ben || !chopped) {
    throw new Error(`Missing documents`);
  }

  const access = await PermissionsModel.explainPermission(
    chopped.$uid,
    'view-post',
    ben.$uid
  );

  t.regex(access.reason, /Permission set on <Resource:organization/);
  t.true(access.access);
  t.is(access.type, 'view-post');
});

test.serial(
  'should remove permissions when using $removePermissionAsSubject',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('view-post', ben);

    const access = await chopped.$explainPermission('view-post', ben);

    t.regex(access.reason, /Permission set on <Resource:organization/);
    t.true(access.access);
    t.is(access.type, 'view-post');

    await ben.$removePermissionAsSubject('view-post');

    const accessAfterRemove = await chopped.$explainPermission(
      'view-post',
      ben
    );

    t.regex(accessAfterRemove.reason, /No permissions were set specifically/);
    t.false(accessAfterRemove.access);
    t.is(accessAfterRemove.type, 'view-post');
  }
);

test.serial(
  'should remove permissions when using $removePermissionAsResource',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('view-post', ben);

    const access = await chopped.$explainPermission('view-post', ben);

    t.regex(access.reason, /Permission set on <Resource:organization/);
    t.true(access.access);
    t.is(access.type, 'view-post');

    await chopped.$removePermissionAsResource('view-post');

    const accessAfterRemove = await chopped.$explainPermission(
      'view-post',
      ben
    );

    t.regex(accessAfterRemove.reason, /No permissions were set specifically/);
    t.false(accessAfterRemove.access);
    t.is(accessAfterRemove.type, 'view-post');
  }
);

test.serial(
  'should remove permissions for specific access when using $removePermissionAsResource',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped || !ted) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('view-post', ben);
    await chopped.$deny('view-post', ted);

    const accessBen = await chopped.$explainPermission('view-post', ben);

    t.regex(accessBen.reason, /Permission set on <Resource:organization/);
    t.true(accessBen.access);
    t.is(accessBen.type, 'view-post');

    const accessTed = await chopped.$explainPermission('view-post', ted);

    t.regex(accessTed.reason, /Permission set on <Resource:organization/);
    t.false(accessTed.access);
    t.is(accessTed.type, 'view-post');

    await chopped.$removePermissionAsResource('view-post', 'deny');

    const accessBenAfter = await chopped.$explainPermission('view-post', ben);

    t.regex(accessBenAfter.reason, /Permission set on <Resource:organization/);
    t.true(accessBenAfter.access);
    t.is(accessBenAfter.type, 'view-post');

    const accessTedAfter = await chopped.$explainPermission('view-post', ted);

    t.regex(accessTedAfter.reason, /No permissions were set specifically/);
    t.false(accessTedAfter.access);
    t.is(accessTedAfter.type, 'view-post');
  }
);

test.serial(
  'should correctly check abstract parent of collection-specific permission',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('view_alignment_triangle_private', ben);
    const access = await chopped.$isAllowed('view-blog', ben);
    t.true(access, 'should have access through abstract parent');
  }
);

test.serial(
  'should correctly check normal crud hierarchy for crud permission with additional abstract permission',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('edit-blog', ben);
    const access = await chopped.$isAllowed('view-blog', ben);
    t.true(access, 'should have access through abstract parent');
  }
);

test.serial('should return false with no user', async t => {
  const Post = Tyr.byName.post;
  const query = await secure.query(Post, 'view');

  t.falsy(query, 'query should be false');
});

test.serial('should return false with no permissions', async t => {
  const Post = Tyr.byName.post;
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const query = ben && (await secure.query(Post, 'edit', ben));

  t.falsy(query, 'query should be false');
});

test.serial(
  'should return false with no permissions set for user for specific permission type',
  async t => {
    await giveBenAccessToChoppedPosts(t);

    const Post = Tyr.byName.post;
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const query = ben && (await secure.query(Post, 'edit', ben));

    t.falsy(query, 'query should be false');
  }
);

test.serial(
  'should return empty object for collection with no permissions hierarchy node',
  async t => {
    const Chart = Tyr.byName.chart;
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const query = ben && (await secure.query(Chart, 'view', ben));

    t.deepEqual(query, {}, 'query should be {}');
  }
);

test.serial(
  'should produce query restriction based on permissions',
  async t => {
    await giveBenAccessToChoppedPosts(t);

    const Post = Tyr.byName.post;
    const Org = Tyr.byName.organization;
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Org.findOne({ query: { name: 'Chopped' } });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    const choppedBlogs = await Blog.findAll({
      query: { organizationId: chopped.$id },
      projection: { _id: 1 }
    });

    const query = await secure.query(Post, 'view', ben);

    checkStringEq(
      t,
      _.get(query, '$or.0.blogId.$in') as string[],
      _.map(choppedBlogs, '_id').map(id => id.toString()),
      'query should find correct blogs'
    );
  }
);

test.serial(
  'Should return all relevant entities on doc.$entitiesWithPermission(perm)',
  async t => {
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });

    const cava = await Tyr.byName.organization.findOne({
      query: { name: 'Cava' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const chipotleBlogs =
      chipotle &&
      (await Tyr.byName.blog.findAll({
        query: { organizationId: chipotle.$id }
      }));
    const post = await Tyr.byName.post.findOne({
      query: { text: 'Why burritos are amazing.' }
    });

    if (!ted || !cava || !chipotle || !chipotleBlogs || !post) {
      throw new Error(`Missing documents`);
    }

    await Promise.all([
      cava.$allow('edit-post', ted),
      post.$deny('view-post', ted),
      chipotleBlogs[0].$allow('view-post', ted)
    ]);

    const entities = await ted.$entitiesWithPermission('view-post');

    t.not(entities.indexOf(cava.$uid), -1);
    t.not(entities.indexOf(chipotleBlogs[0].$uid), -1);
  }
);

test.serial(
  'Allowed parent permission should be reflected in both isAllowed and authenticated query',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben) {
      throw new Error(`Missing documents`);
    }

    const posts = await Tyr.byName.post.findAll({
      query: {},
      auth: ben,
      perm: 'edit'
    });

    // should initially return no posts
    t.deepEqual(posts, []);

    // make ben owner of one post
    const post = await Tyr.byName.post.findOne({ query: {} });
    if (post) {
      await post.$allow('own-post', ben);
    }

    const owned = await Tyr.byName.post.findAll({
      query: {},
      auth: ben,
      perm: 'edit'
    });

    t.deepEqual(owned, [post]);
    t.deepEqual(await owned[0].$isAllowed('edit-post', ben), true);
  }
);

test.serial(
  'should correctly respect combined permission/subject/resource hierarchy in query()',
  async t => {
    // Set deny view-access for parent subject to parent resource
    // Set allow edit-access for child subject to child resource
    // should return true when checking if child subject can view

    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const chipotleCorporateBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });

    if (!ben || !chipotleCorporateBlog || !chipotle) {
      throw new Error(`Missing documents`);
    }

    await chipotleCorporateBlog.$allow('edit-post', ben);
    await chipotle.$deny('view-post', chipotle);

    const query = await Tyr.byName.post.secureQuery({}, 'view', ben);

    const foundPosts = await Tyr.byName.post.findAll({ query });

    t.true(
      _.every(foundPosts, post => {
        return post.blogId!.toString() === chipotleCorporateBlog.$id.toString();
      }),
      'all found posts should come from the one allowed blog'
    );
  }
);

test.serial(
  'should be appropriately filtered based on permissions',
  async t => {
    await giveBenAccessToChoppedPosts(t);

    const Post = Tyr.byName.post;
    const User = Tyr.byName.user;
    const Org = Tyr.byName.organization;
    const ben = await User.findOne({ query: { name: 'ben' } });

    if (!ben) {
      throw new Error(`Missing documents`);
    }

    const postsBenCanSee = await Post.findAll({
      query: {},
      auth: ben
    });

    const chopped = await Org.findOne({ query: { name: 'Chopped' } });

    if (!chopped) {
      throw new Error(`Missing documents`);
    }

    const choppedBlogs = await Blog.findAll({
      query: { organizationId: chopped.$id },
      projection: { _id: 1 }
    });

    const choppedPosts = await Post.findAll({
      query: { blogId: { $in: _.map(choppedBlogs, '_id') } }
    });

    checkStringEq(
      t,
      _.map(postsBenCanSee, d => d.$id.toHexString()) as string[],
      _.map(choppedPosts, d => d.$id.toHexString()) as string[],
      'ben should only see chopped posts'
    );
  }
);

test.serial(
  'should filter based on abstract parent access of collection-specific permission',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const blogs = await Tyr.byName.blog.findAll({ query: {} });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('view_alignment_triangle_private', ben);

    const blogsBenCanSee = await Tyr.byName.blog.findAll({
      query: {},
      auth: ben
    });

    t.is(blogs.length, 4);
    t.is(blogsBenCanSee.length, 1);
    const blog = blogsBenCanSee[0];

    if (blog && blog.organizationId) {
      t.is(blog.organizationId.toString(), chopped.$id.toString());
    } else {
      t.fail();
    }
  }
);

test.serial(
  'should filter based on abstract parent access of collection-specific permission',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chopped.$allow('edit-organization', ben);

    const {
      $or: [{ organizationId: { $in: [organizationId] } }]
    } = await Tyr.byName.blog.secureQuery({}, 'view-organization', ben);

    t.is(organizationId.toString(), chopped.$id.toString());
  }
);

test.serial(
  'should get view access to parent when parent can view itself',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });

    if (!ben || !chipotle) {
      throw new Error(`Missing documents`);
    }

    await chipotle.$allow('view-organization', chipotle);
    const access = await chipotle.$isAllowed('view-organization', ben);
    t.true(access, 'ben should have access through parent');
  }
);

test.serial('should default to lowest hierarchy permission', async t => {
  const chopped = await giveBenAccessToChoppedPosts(t);
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const post = await Tyr.byName.post.findOne({
    query: { text: 'Salads are great, the post.' }
  });
  const choppedBlogs = await Tyr.byName.blog.findAll({
    query: { organizationId: chopped.$id }
  });
  const choppedPosts = await Tyr.byName.post.findAll({
    query: { blogId: { $in: choppedBlogs.map(b => b.$id) } }
  });

  if (!ben || !chopped || !post) {
    throw new Error(`Missing documents`);
  }

  // all chopped posts
  t.is(choppedPosts.length, 2);
  t.not(
    _.map(choppedPosts, p => p.$id.toString()).indexOf(post.$id.toString()),
    -1
  );

  // explicitly deny view access to this post
  await post.$deny('view-post', ben);

  const postsBenCanSee = await Tyr.byName.post.findAll({
    query: {},
    auth: ben
  });

  t.is(postsBenCanSee.length, 1);
  t.is(
    _.map(postsBenCanSee, p => p.$id.toString()).indexOf(post.$id.toString()),
    -1
  );
});

test.serial(
  'Should restrict permission to include set in graclConfig schema option',
  t => {
    const allowed = secure.getAllowedPermissionsForCollection('comment');
    t.deepEqual(allowed.sort(), ['view-comment'].sort());
  }
);

test.serial(
  'Should throw error if attempting to use permission not allowed for collection',
  async t => {
    const post = await Tyr.byName.post.findOne({ query: {} });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben || !post) {
      throw new Error(`Missing documents`);
    }

    await expectAsyncToThrow(
      t,
      () => post.$allow('view-user', ben),
      /tyranid-gracl: Tried to use permission "view-user" with collection "post"/,
      'Should throw when not using a post-specific permission.'
    );
  }
);

test.serial(
  'Should return correct allowed permissions for given collection',
  t => {
    const allowed = secure.getAllowedPermissionsForCollection('post');
    const blogAllowed = secure.getAllowedPermissionsForCollection('blog');

    allowed.sort();
    blogAllowed.sort();

    const blogExpected = [
      'abstract_view_chart',
      'own-blog',
      'own-comment',
      'own-post',
      'delete-blog',
      'delete-comment',
      'delete-post',
      'edit-blog',
      'edit-comment',
      'edit-post',
      'view-blog',
      'view-comment',
      'view-post',
      'view_alignment_triangle_private'
    ];

    const allowedExpected = [
      'own-post',
      'delete-post',
      'edit-post',
      'view-post'
    ];

    blogAllowed.sort();
    blogExpected.sort();
    allowed.sort();
    allowedExpected.sort();

    t.deepEqual(blogAllowed, blogExpected);
    t.deepEqual(allowed, allowedExpected);
  }
);

test.serial('Should throw when trying to set raw crud permission', async t => {
  const post = await Tyr.byName.post.findOne({ query: {} });
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

  if (!ben || !post) {
    throw new Error(`Missing documents`);
  }

  await expectAsyncToThrow(
    t,
    () => post.$allow('view', ben),
    /Cannot use raw crud permission/,
    'Should throw when using a raw crud permission.'
  );
});

test.serial(
  'Should return object relating uids to access level for multiple permissions when using $determineAccessToAllPermissionsForResources()',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const posts = await Tyr.byName.post.findAll({ query: {} });

    if (!ben) {
      throw new Error(`Missing documents`);
    }

    const accessObj = await ben.$determineAccessToAllPermissionsForResources(
      ['view', 'edit', 'delete'],
      _.map(posts, '$uid')
    );

    for (const post of posts) {
      for (const perm in accessObj[post.$uid]) {
        if (!accessObj[post.$uid].hasOwnProperty(perm)) {
          continue;
        }
        t.deepEqual(
          accessObj[post.$uid][perm],
          await post.$isAllowedForThis(perm, ben)
        );
      }
    }
  }
);

test.serial(
  'Should allow inclusion / exclusion of all permissions for a given collection',
  t => {
    const inventoryAllowed = secure.getAllowedPermissionsForCollection(
      'inventory'
    );
    const teamAllowed = secure.getAllowedPermissionsForCollection('team');

    const inventoryExpected = [
      'own-inventory',
      'edit-inventory',
      'view-inventory',
      'delete-inventory',
      'abstract_view_chart'
    ];

    const teamExpected = [
      'abstract_view_chart',
      'own-team',
      'delete-team',
      'edit-team',
      'view-team',
      'own-user',
      'delete-user',
      'edit-user',
      'view-user'
    ];

    inventoryAllowed.sort();
    inventoryExpected.sort();
    teamAllowed.sort();
    teamExpected.sort();

    t.deepEqual(inventoryAllowed, inventoryExpected);
    t.deepEqual(teamAllowed, teamExpected);
  }
);

test.serial(
  'Should throw when *forThis methods are given non-crud permission',
  async t => {
    const post = await Tyr.byName.post.findOne({ query: {} });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben || !post) {
      throw new Error(`Missing documents`);
    }

    await expectAsyncToThrow(
      t,
      () => {
        return post.$isAllowedForThis('view_alignment_triangle_private', ben);
      },
      /with a crud action, given/,
      '$isAllowedForThis'
    );

    await expectAsyncToThrow(
      t,
      () => {
        return post.$allowForThis('view_alignment_triangle_private', ben);
      },
      /with a crud action, given/,
      '$allowForThis'
    );

    await expectAsyncToThrow(
      t,
      () => {
        return post.$denyForThis('view_alignment_triangle_private', ben);
      },
      /with a crud action, given/,
      '$denyForThis'
    );
  }
);

test.serial(
  'Should respect resource hierarchy for deny exception (linked parent deny, child allow)',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const posts =
      chipotleBlog &&
      (await Tyr.byName.post.findAll({
        query: { blogId: chipotleBlog.$id }
      }));

    if (!ben || !chipotleBlog || !posts) {
      throw new Error(`Missing documents`);
    }

    await chipotleBlog.$deny('view-post', ben);
    await posts[0].$allow('view-post', ben);

    const access = await ben.$determineAccessToAllPermissionsForResources(
      ['view-post'],
      posts.map(p => p.$uid)
    );
    t.true(
      access[posts[0].$uid]['view-post'],
      'should have access to first post'
    );
  }
);

test.serial(
  'Should respect resource hierarchy for deny exception (removed parent deny, child allow)',
  async t => {
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const chipotleBlogs =
      chipotle &&
      (await Tyr.byName.blog.findAll({
        query: { organizationId: chipotle.$id }
      }));
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const posts =
      chipotleBlogs &&
      (await Tyr.byName.post.findAll({
        query: { blogId: { $in: _.map(chipotleBlogs, '$id') } }
      }));

    if (!ben || !chipotle || !posts) {
      throw new Error(`Missing documents`);
    }

    await chipotle.$deny('view-post', ben);
    await posts[0].$allow('view-post', ben);

    const access = await ben.$determineAccessToAllPermissionsForResources(
      ['view-post'],
      posts.map(p => p.$uid)
    );
    t.true(
      access[posts[0].$uid]['view-post'],
      'should have access to first post'
    );
  }
);

test.serial('Should default to deny if conflicting parent access', async t => {
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
  const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
  const burritoMakers = await Tyr.byName.team.findOne({
    query: { name: 'burritoMakers' }
  });
  const chipotleMarketing = await Tyr.byName.team.findOne({
    query: { name: 'chipotleMarketing' }
  });

  if (!ben || !ted || !burritoMakers || !chipotleMarketing) {
    throw new Error(`Missing documents`);
  }

  await burritoMakers.$allow('view-user', ted);
  await chipotleMarketing.$deny('view-user', ted);

  t.false(await ben.$isAllowed('view-user', ted), 'Should not have access');
  const foundUsers = await Tyr.byName.user.findAll({
    query: { name: 'ben' },
    auth: ted
  });
  t.falsy(foundUsers.length, 'authenticated query should return no users');
});

test.serial(
  'Should be able to query collection using perm with alternate collection',
  async t => {
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });

    if (!ted || !chipotle) {
      throw new Error(`Missing documents`);
    }

    await chipotle.$allow('edit-comment', ted);

    const usersThatTedHasViewCommentAccessTo = await Tyr.byName.user.findAll({
      query: {},
      perm: 'view-comment',
      auth: ted
    });

    t.is(usersThatTedHasViewCommentAccessTo.length, 2);
  }
);

test.serial(
  'Should be throw if passing invalid permission as part of filtered query',
  async t => {
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });

    if (!ted) {
      throw new Error(`Missing documents`);
    }

    await expectAsyncToThrow(
      t,
      async () => {
        await Tyr.byName.team.findAll({
          query: {},
          perm: 'edit-invalidCollectionType',
          auth: ted
        });
      },
      /resource class and thus can't be used with permission/
    );
  }
);

test.serial(
  'Should return correct documents when using $canAccessThis',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ted || !ben || !chipotleBlog) {
      throw new Error(`Missing documents`);
    }

    await chipotleBlog.$allow('view-blog', ben);
    await chipotleBlog.$allow('edit-blog', ted);

    const canAccessViewResults = await chipotleBlog.$canAccessThis();

    const canAccessView = _.map(canAccessViewResults, '$uid');
    const canAccessEdit = _.map(
      await chipotleBlog.$canAccessThis('edit'),
      '$uid'
    );

    t.not(
      canAccessView.indexOf(ben.$uid),
      -1,
      'canAccessView should include ben'
    );
    t.not(
      canAccessView.indexOf(ted.$uid),
      -1,
      'canAccessView should include ted'
    );
    t.not(
      canAccessEdit.indexOf(ted.$uid),
      -1,
      'canAccessEdit should include ted'
    );
  }
);

test.serial(
  'Should return correct inherited documents when using $canAccessThis',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const noTeamUser = await Tyr.byName.user.findOne({
      query: { name: 'noTeams' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    const chipotleMarketing = await Tyr.byName.team.findOne({
      query: { name: 'chipotleMarketing' }
    });

    if (
      !ted ||
      !ben ||
      !chipotleBlog ||
      !chipotle ||
      !noTeamUser ||
      !chipotleMarketing
    ) {
      throw new Error(`Missing documents`);
    }

    await chipotleBlog.$allow('view-blog', chipotle);
    await chipotleBlog.$allow('edit-blog', ted);

    const canAccessView = _.map(await chipotleBlog.$canAccessThis(), '$uid');
    const canAccessEdit = _.map(
      await chipotleBlog.$canAccessThis('edit'),
      '$uid'
    );

    t.not(
      canAccessView.indexOf(ben.$uid),
      -1,
      'canAccessView should include ben'
    );
    t.not(
      canAccessView.indexOf(ted.$uid),
      -1,
      'canAccessView should include ted'
    );
    t.not(
      canAccessView.indexOf(noTeamUser.$uid),
      -1,
      'canAccessView should include noTeamUser'
    );
    t.not(
      canAccessView.indexOf(chipotle.$uid),
      -1,
      'canAccessView should include chipotle'
    );
    t.not(canAccessView.indexOf(chipotleMarketing.$uid), -1);

    t.is(
      canAccessEdit.indexOf(ben.$uid),
      -1,
      'canAccessEdit should not include ben'
    );
    t.not(
      canAccessEdit.indexOf(ted.$uid),
      -1,
      'canAccessEdit should include ted'
    );
  }
);

test.serial(
  'Should not include explicitly denied documents for $canAccessThis',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const noTeamUser = await Tyr.byName.user.findOne({
      query: { name: 'noTeams' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben || !chipotleBlog || !chipotle || !noTeamUser) {
      throw new Error(`Missing documents`);
    }

    await chipotleBlog.$allow('view-blog', chipotle);

    await chipotleBlog.$deny('view-blog', ben);

    const canAccessView = _.map(await chipotleBlog.$canAccessThis(), '$uid');

    t.is(
      canAccessView.indexOf(ben.$uid),
      -1,
      'canAccessView should not include ben'
    );
    t.not(
      canAccessView.indexOf(noTeamUser.$uid),
      -1,
      'canAccessView should include noTeamUser'
    );
    t.not(
      canAccessView.indexOf(chipotle.$uid),
      -1,
      'canAccessView should include chipotle'
    );
  }
);

test.serial(
  'Should only return documents that match all permissions provided',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const noTeamUser = await Tyr.byName.user.findOne({
      query: { name: 'noTeams' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben || !chipotleBlog || !chipotle || !noTeamUser) {
      throw new Error(`Missing documents`);
    }

    await chipotleBlog.$allow('view-blog', chipotle);
    await chipotleBlog.$allow('abstract_view_chart', chipotle);
    await chipotleBlog.$deny('abstract_view_chart', ben);

    const canAccessView = _.map(await chipotleBlog.$canAccessThis(), '$uid');

    t.not(
      canAccessView.indexOf(ben.$uid),
      -1,
      'canAccessView should include ben'
    );
    t.not(
      canAccessView.indexOf(noTeamUser.$uid),
      -1,
      'canAccessView should include noTeamUser'
    );
    t.not(
      canAccessView.indexOf(chipotle.$uid),
      -1,
      'canAccessView should include chipotle'
    );

    const canAccessViewAndAT = _.map(
      await chipotleBlog.$canAccessThis('view', 'abstract_view_chart'),
      '$uid'
    );

    t.is(
      canAccessViewAndAT.indexOf(ben.$uid),
      -1,
      'canAccessViewAndAT should not include ben'
    );
    t.not(
      canAccessViewAndAT.indexOf(noTeamUser.$uid),
      -1,
      'canAccessViewAndAT should include noTeamUser'
    );
    t.not(
      canAccessViewAndAT.indexOf(chipotle.$uid),
      -1,
      'canAccessViewAndAT should include chipotle'
    );
  }
);

test.serial(
  'Should only return documents that do not have access to resouce via denies',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const noTeamUser = await Tyr.byName.user.findOne({
      query: { name: 'noTeams' }
    });
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const chopped = await Tyr.byName.organization.findOne({
      query: { name: 'Chopped' }
    });

    if (!ben || !chipotleBlog || !chipotle || !noTeamUser || !chopped) {
      throw new Error(`Missing documents`);
    }

    await chipotleBlog.$allow('view-blog', chopped);
    await chipotleBlog.$deny('view-blog', chipotle);
    await chipotleBlog.$deny('abstract_view_chart', chipotle);
    await chipotleBlog.$allow('abstract_view_chart', ben);

    const canNotAccessView = _.map(
      await chipotleBlog.$deniedAccessToThis(),
      '$uid'
    );

    t.not(
      canNotAccessView.indexOf(ben.$uid),
      -1,
      'canNotAccessView should include ben'
    );
    t.not(
      canNotAccessView.indexOf(noTeamUser.$uid),
      -1,
      'canNotAccessView should include noTeamUser'
    );
    t.not(
      canNotAccessView.indexOf(chipotle.$uid),
      -1,
      'canNotAccessView should include chipotle'
    );

    const canNotAccessViewAndAT = _.map(
      await chipotleBlog.$deniedAccessToThis('view', 'abstract_view_chart'),
      '$uid'
    );

    t.is(
      canNotAccessViewAndAT.indexOf(ben.$uid),
      -1,
      'canNotAccessViewAndAT should not include ben'
    );
    t.not(
      canNotAccessViewAndAT.indexOf(noTeamUser.$uid),
      -1,
      'canNotAccessViewAndAT should include noTeamUser'
    );
    t.not(
      canNotAccessViewAndAT.indexOf(chipotle.$uid),
      -1,
      'canNotAccessViewAndAT should include chipotle'
    );
  }
);

test.serial(
  'Should throw if passing no permissions to PermissionsModel.findEntitiesWithPermissionAccessToResource',
  async t => {
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    if (!ben) {
      throw new Error(`Missing documents`);
    }

    await expectAsyncToThrow(
      t,
      () => {
        return PermissionsModel.findEntitiesWithPermissionAccessToResource(
          'allow',
          [],
          ben
        );
      },
      /No permissions provided to/
    );
  }
);

/**
 * https://github.com/tyranid-org/tyranid-gracl/issues/47
 */
test.serial(
  'PermissionsModel.determineAccess should respect both permission and subject/resource hierarchies',
  async t => {
    /**
     * item owned by ben
     */
    const item = await Tyr.byName.item.findOne({
      query: { name: 'test-ben-item' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });
    const ted = await Tyr.byName.user.findOne({ query: { name: 'ted' } });
    const cava = await Tyr.byName.organization.findOne({
      query: { name: 'Cava' }
    });

    if (!item || !ted || !ben || !cava) {
      throw new Error(`missing docs`);
    }

    /**
     *
     * deny view item for org,
     * allow edit user for user
     *
     */
    await item.$deny('view-item', cava);
    await ben.$allow('edit-item', ted);

    const isAllowedResult = await item.$isAllowed('view-item', ted);
    const explainResult = await item.$explainPermission('view-item', ted);

    t.false(isAllowedResult);
    t.false(explainResult.access);
    t.is(
      isAllowedResult,
      explainResult.access,
      'the $isAllowed result should mirror the $explainPermission result'
    );
  }
);

test.serial(
  'Should successfully deny multiple permissions when passing array to $deny',
  async t => {
    const chipotle = await Tyr.byName.organization.findOne({
      query: { name: 'Chipotle' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben || !chipotle) {
      throw new Error(`Missing documents`);
    }

    const permissions = [
      'view-organization',
      'view_alignment_triangle_private',
      'view-comment'
    ];

    await chipotle.$allow(permissions, chipotle);

    const accessResult = await chipotle.$determineAccess(permissions, ben);
    t.true(
      _.every(permissions, p => accessResult[p]),
      'ben should inherit all perms'
    );

    await chipotle.$deny(['view-organization', 'view-comment'], ben);
    const accessResult2 = await PermissionsModel.determineAccess(
      chipotle.$uid,
      permissions,
      ben.$uid
    );

    t.false(
      accessResult2['view-organization'],
      'should not have view-organization'
    );
    t.false(accessResult2['view-comment'], 'should not have view-comment');
    t.true(
      accessResult2.view_alignment_triangle_private,
      'should have view_alignment_triangle_private'
    );
  }
);

test.serial(
  'should deny all objects if subject only has negative permissions for collection',
  async t => {
    const chipotleBlog = await Tyr.byName.blog.findOne({
      query: { name: 'Mexican Empire' }
    });
    const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

    if (!ben || !chipotleBlog) {
      throw new Error(`Missing documents`);
    }

    const permissions = await ben.$permissions();
    t.is(permissions.length, 0);

    await chipotleBlog.$deny('view-blog', ben);

    const permissionsAfter = await ben.$permissions();
    t.is(permissionsAfter.length, 1);

    const blogs = await Tyr.byName.blog.findAll({ query: {}, auth: ben });
    t.is(blogs.length, 0);
  }
);

test.serial('Should handle lots of concurrent permissions updates', async t => {
  const chipotleBlog = await Tyr.byName.blog.findOne({
    query: { name: 'Mexican Empire' }
  });
  const ben = await Tyr.byName.user.findOne({ query: { name: 'ben' } });

  if (!ben || !chipotleBlog) {
    throw new Error(`Missing documents`);
  }

  await Promise.all(
    _.map(_.range(1000), () =>
      Blog.addPost(Math.random().toString(), chipotleBlog)
    )
  );

  const posts = await Tyr.byName.post.findAll({ query: {} });

  t.true(posts.length >= 1000, 'should be at least 1000 posts');

  // 14,000 concurrent updates
  await Promise.all(
    posts.map((p: Tyr.Post) =>
      Promise.all([
        p.$allow('view-post', ben),
        p.$allow('edit-post', ben),
        p.$allow('delete-post', ben),
        p.$allow('view-post', ben),
        p.$allow('view-post', ben),
        p.$allow('view-post', ben),
        p.$allow('edit-post', ben),
        p.$allow('view-post', ben),
        p.$allow('edit-post', ben),
        p.$allow('delete-post', ben),
        p.$allow('view-post', ben),
        p.$allow('view-post', ben),
        p.$allow('view-post', ben),
        p.$allow('edit-post', ben)
      ])
    )
  );

  // 4,000 concurrent checks
  await ben.$determineAccessToAllPermissionsForResources(
    ['view-post', 'edit-post', 'delete-post'],
    posts
  );

  t.pass();
});
