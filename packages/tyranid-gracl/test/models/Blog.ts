import { Tyr } from 'tyranid';
import { Post } from './Post';

export const BlogBaseCollection = new Tyr.Collection({
  id: 'b00',
  name: 'blog',
  dbName: 'blogs',
  // graclConfig: {
  //   permissions: {
  //     thisCollectionOnly: true
  //   }
  // },
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclTypes: ['resource']
    }
  }
});

export class Blog extends BlogBaseCollection {
  public static async addPost(text: string, blog: Tyr.Document) {
    const post = new Post({ text, blogId: blog.$id });
    await post.$save();
    return post;
  }
}
