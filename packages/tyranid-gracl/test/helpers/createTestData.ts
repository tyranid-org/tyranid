import { Tyr } from 'tyranid';
import { Blog } from '../models/Blog';
import { Chart } from '../models/Chart';
import { Comment } from '../models/Comment';
import { Inventory } from '../models/Inventory';
import { Item } from '../models/Item';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { User } from '../models/User';

export async function createTestData() {
  await Promise.all(Tyr.collections.map(c => c.remove({ query: {} })));

  const [chipotle, chopped, cava] = await Promise.all([
    Organization.insert({ name: 'Chipotle' }),
    Organization.insert({ name: 'Chopped' }),
    Organization.insert({ name: 'Cava' })
  ]);

  const [] = await Promise.all([
    Inventory.insert({ name: 'Chipotle', organizationId: chipotle.$id }),
    Inventory.insert({ name: 'Chopped', organizationId: chopped.$id }),
    Inventory.insert({ name: 'Cava', organizationId: cava.$id })
  ]);

  const [
    chipotleFoodBlog,
    chipotleCorporateBlog,
    choppedBlog,
    cavaBlog
  ] = await Promise.all([
    Blog.insert({ name: 'Burritos Etc', organizationId: chipotle.$id }),
    Blog.insert({ name: 'Mexican Empire', organizationId: chipotle.$id }),
    Blog.insert({ name: 'Salads are great', organizationId: chopped.$id }),
    Blog.insert({ name: 'Spinach + Lentils', organizationId: cava.$id })
  ]);

  const [] = await Promise.all([
    Blog.addPost('Why burritos are amazing.', chipotleFoodBlog),
    Blog.addPost('Ecoli challenges.', chipotleFoodBlog),
    Blog.addPost(
      `We don' actually know why people got sick.`,
      chipotleFoodBlog
    ),
    Blog.addPost('Re-evaluating the way we clean up.', chipotleCorporateBlog),
    Blog.addPost('Burrito Management, a new paradigm.', chipotleCorporateBlog),
    Blog.addPost('Salads are great, the post.', choppedBlog),
    Blog.addPost('Guacamole Greens to the rescue!.', choppedBlog),
    Blog.addPost('Lentils are great', cavaBlog)
  ]);

  await Promise.all([
    // comment with no post id but organizationId which links to higher
    Comment.insert({ text: 'TEST_COMMENT', blogId: chipotleCorporateBlog.$id })
  ]);

  const [burritoMakers, chipotleMarketing, cavaEngineers] = await Promise.all([
    Team.insert({ name: 'burritoMakers', organizationId: chipotle.$id }),
    Team.insert({ name: 'chipotleMarketing', organizationId: chipotle.$id }),
    Team.insert({ name: 'cavaEngineers', organizationId: cava.$id })
  ]);

  await Team.insert({ name: 'choppedExec', organizationId: chopped.$id });

  const [ben, ted] = await Promise.all([
    User.insert({
      name: 'ben',
      organizationId: chipotle.$id,
      teamIds: [burritoMakers.$id, chipotleMarketing.$id]
    }),
    User.insert({
      name: 'ted',
      organizationId: cava.$id,
      teamIds: [cavaEngineers.$id]
    }),
    User.insert({ name: 'noTeams', organizationId: chipotle.$id })
  ]);

  await Promise.all([
    Item.insert({
      name: 'test-ben-item',
      userId: ben.$id
    })
  ]);

  await Promise.all([
    Chart.insert({
      name: 'test1',
      blogId: cavaBlog.$id,
      organizationId: cava.$id,
      userIds: [ben.$id, ted.$id]
    })
  ]);
}
