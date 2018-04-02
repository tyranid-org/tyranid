import { Tyr } from 'tyranid';
import { ExecutionResult, GraphQLSchema } from 'graphql';

declare module 'tyranid' {
  namespace Tyr {
    export interface TyranidGraphQlQueryOptions {
      query: string;
      variables?: { [key: string]: any };
      auth?: Tyr.Document;
      perm?: string;
    }

    export interface TyranidGraphQLFunction {
      // full options object
      (opts: TyranidGraphQlQueryOptions): Promise<ExecutionResult>;

      // just query string
      (query: string): Promise<ExecutionResult>;

      // template tag
      (queryString: TemplateStringsArray, ...interpolated: any[]): Promise<
        ExecutionResult
      >;

      schema: GraphQLSchema;
    }

    export let graphql: TyranidGraphQLFunction;
  }
}
