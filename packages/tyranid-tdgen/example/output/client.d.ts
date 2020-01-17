/**
 *
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 *
 * Generated by `tyranid-tdgen@0.4.1`: https://github.com/tyranid-org/tyranid-tdgen
 * date: Wed Oct 18 2017 14:11:09 GMT-0400 (EDT)
 */

import { Tyr as Isomorphic } from 'tyranid/isomorphic';
import * as io from 'socket.io-client';

export namespace Tyr {
  export const $all: '$all';

  export import Metadata = Isomorphic.Metadata;

  export interface CollectionsByName {
    [key: string]: CollectionInstance;
  }

  export interface CollectionsByClassName {
    [key: string]: CollectionInstance;
  }

  export interface CollectionsById {
    [key: string]: CollectionInstance;
  }

  export const byId: CollectionsById & {
    [key: string]: CollectionInstance | void;
  };
  export const byName: CollectionsByName & {
    [key: string]: CollectionInstance | void;
  };
  export function byUid(uid: string, options?: any): Promise<Document | null>;
  export const collections: CollectionInstance[] &
    CollectionsByClassName & {
      [key: string]: CollectionInstance | void;
    };
  export const documentPrototype: any;

  export function parseUid(
    uid: string
  ): { collection: CollectionInstance; id: any };

  export const init: () => void;
  export const setSocketLibrary: (library: typeof io) => void;
  export const reconnectSocket: () => void;
  export type CollectionName = Isomorphic.CollectionName;
  export type CollectionId = Isomorphic.CollectionId;

  export type ObjIdType = string;
  export type AnyIdType = ObjIdType | number | string;

  export interface CollectionInstance<
    IdType = AnyIdType,
    T extends Document<IdType> = Document<IdType>
  > extends Isomorphic.CollectionInstance<IdType, T> {
    cache(
      document: T | object,
      type: 'insert' | 'update' | 'remove',
      silent: boolean
    ): T;
    subscribe(query: any, cancel?: boolean): Promise<void>;
  }

  export interface Document<IdType = ObjIdType>
    extends Isomorphic.Document<IdType> {}
  export interface Inserted<IdType>
    extends Document<IdType>,
      Isomorphic.Inserted<IdType> {}
}
