import { Tyr } from 'tyranid';

import {
  Blog,
  User,
  Team,
  Chart,
  Inventory,
  Organization,
  Comment,
  UserStatus
} from './models';

export async function createTestData() {
  // nuke old data...
  await Promise.all(Tyr.collections.map(c => c.remove({ query: {} })));

  /**
    Organiations
   */
  const chipotle = await Organization.insert({ name: 'Chipotle' });
  const chopped = await Organization.insert({ name: 'Chopped' });
  const cava = await Organization.insert({ name: 'Cava' });

  await Inventory.insert({ name: 'Chipotle', organizationId: chipotle.$id });
  await Inventory.insert({ name: 'Chopped', organizationId: chopped.$id });
  await Inventory.insert({ name: 'Cava', organizationId: cava.$id });

  /**
    Blogs
   */
  const chipotleFoodBlog = await Blog.insert({
    name: 'Burritos Etc',
    organizationId: chipotle.$id
  });
  const chipotleCorporateBlog = await Blog.insert({
    name: 'Mexican Empire',
    organizationId: chipotle.$id
  });
  const choppedBlog = await Blog.insert({
    name: 'Salads are great',
    organizationId: chopped.$id
  });
  const cavaBlog = await Blog.insert({
    name: 'Spinach + Lentils',
    organizationId: cava.$id
  });

  /**
    Posts
   */
  await Blog.insert({
    name: 'Why burritos are amazing.',
    blogId: chipotleFoodBlog.$id
  });
  await Blog.insert({
    name: 'Ecoli challenges.',
    blogId: chipotleFoodBlog.$id
  });
  await Blog.insert({
    name: "We don' actually know why people got sick.",
    blogId: chipotleFoodBlog.$id
  });
  await Blog.insert({
    name: 'Re-evaluating the way we clean up.',
    blogId: chipotleCorporateBlog.$id
  });
  await Blog.insert({
    name: 'Burrito Management, a new paradigm.',
    blogId: chipotleCorporateBlog.$id
  });
  await Blog.insert({
    name: 'Salads are great, the post.',
    blogId: choppedBlog.$id
  });
  await Blog.insert({
    name: 'Guacamole Greens to the rescue!.',
    blogId: choppedBlog.$id
  });
  await Blog.insert({ name: 'Lentils are great', blogId: cavaBlog.$id });

  /**
   *  Comment
   */
  await Promise.all([
    // comment with no post id but organizationId which links to higher
    Comment.insert({
      text: 'TEST_COMMENT',
      blogId: chipotleCorporateBlog.$id
    })
  ]);

  const burritoMakers = await Team.insert({
    name: 'burritoMakers',
    organizationId: chipotle.$id
  });
  const chipotleMarketing = await Team.insert({
    name: 'chipotleMarketing',
    organizationId: chipotle.$id
  });
  const cavaEngineers = await Team.insert({
    name: 'cavaEngineers',
    organizationId: cava.$id
  });

  await Team.insert({ name: 'choppedExec', organizationId: chopped.$id });

  /**
    Users
   */
  const ben = await User.insert({
    name: 'ben',
    organizationId: chipotle.$id,
    teamIds: [burritoMakers.$id, chipotleMarketing.$id],
    status: (UserStatus as any).ACTIVE._id,
    nested: {
      inner: 4
    }
  });

  const ted = await User.insert({
    name: 'ted',
    organizationId: cava.$id,
    status: (UserStatus as any).ACTIVE._id,
    teamIds: [cavaEngineers.$id]
  });

  User.insert({
    name: 'noTeams',
    status: (UserStatus as any).DELETED._id,
    organizationId: chipotle.$id
  });

  await Promise.all([
    Chart.insert({
      name: 'test1',
      blogId: cavaBlog.$id,
      organizationId: cava.$id,
      userIds: [ben.$id, ted.$id]
    })
  ]);
}
