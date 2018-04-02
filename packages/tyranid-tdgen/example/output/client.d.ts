/**
 *
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 *
 * Generated by `tyranid-tdgen@0.4.1`: https://github.com/tyranid-org/tyranid-tdgen
 * date: Wed Oct 18 2017 14:11:09 GMT-0400 (EDT)
 */
  

declare module 'tyranid-client' {
  import { Tyr as Isomorphic } from 'tyranid-isomorphic';

  export namespace Tyr {

    export const byName: CollectionsByName & { [key: string]: CollectionInstance | void };
    export const byId: CollectionsById & { [key: string]: CollectionInstance | void };
    export const init: () => void;
    export type CollectionName = Isomorphic.CollectionName;
    export type CollectionId = Isomorphic.CollectionId;

    export interface CollectionInstance<T extends Document = Document> {
      findAll(args: any): Promise<T[]>;
      findOne(args: any): Promise<T | null>;
      idToUid(id: string): string;
      on(opts: any): () => void;
      subscribe(query: any, cancel?: boolean): void;
      values: T[];
    }

    export interface Document {
      $model: CollectionInstance<this>;
      $uid: string;
      $id: string;
    }

    

    /**
     * documents inserted into the db and given _id
     */
    interface Inserted extends Tyr.Document {
      _id: string
    }

    /**
     * Client document definition for MigrationStatusCollection,
     * extends isomorphic base interface BaseMigrationStatus.
     */
    export interface MigrationStatus
      extends Inserted,
              Isomorphic.BaseMigrationStatus<string, Inserted> {}
    

    /**
     * Client document definition for TyrInstanceCollection,
     * extends isomorphic base interface BaseTyrInstance.
     */
    export interface TyrInstance
      extends Inserted,
              Isomorphic.BaseTyrInstance<string, Inserted> {}
    

    /**
     * Client document definition for TyrLogCollection,
     * extends isomorphic base interface BaseTyrLog.
     */
    export interface TyrLog
      extends Inserted,
              Isomorphic.BaseTyrLog<string, Inserted> {}
    

    /**
     * Client document definition for TyrLogEventCollection,
     * extends isomorphic base interface BaseTyrLogEvent.
     */
    export interface TyrLogEvent
      extends Inserted,
              Isomorphic.BaseTyrLogEvent<string, Inserted> {}
    

    /**
     * Client document definition for TyrLogLevelCollection,
     * extends isomorphic base interface BaseTyrLogLevel.
     */
    export interface TyrLogLevel
      extends Inserted,
              Isomorphic.BaseTyrLogLevel<string, Inserted> {}
    

    /**
     * Client document definition for TyrSchemaCollection,
     * extends isomorphic base interface BaseTyrSchema.
     */
    export interface TyrSchema
      extends Inserted,
              Isomorphic.BaseTyrSchema<string, Inserted> {}
    

    /**
     * Client document definition for TyrSchemaTypeCollection,
     * extends isomorphic base interface BaseTyrSchemaType.
     */
    export interface TyrSchemaType
      extends Inserted,
              Isomorphic.BaseTyrSchemaType<string, Inserted> {}
    

    /**
     * Client document definition for TyrSubscriptionCollection,
     * extends isomorphic base interface BaseTyrSubscription.
     */
    export interface TyrSubscription
      extends Inserted,
              Isomorphic.BaseTyrSubscription<string, Inserted> {}
    

    /**
     * Client document definition for TyrUserAgentCollection,
     * extends isomorphic base interface BaseTyrUserAgent.
     */
    export interface TyrUserAgent
      extends Inserted,
              Isomorphic.BaseTyrUserAgent<string, Inserted> {}
    

    /**
     * Client document definition for UnitCollection,
     * extends isomorphic base interface BaseUnit.
     */
    export interface Unit
      extends Inserted,
              Isomorphic.BaseUnit<string, Inserted> {}
    

    /**
     * Client document definition for UnitFactorCollection,
     * extends isomorphic base interface BaseUnitFactor.
     */
    export interface UnitFactor
      extends Inserted,
              Isomorphic.BaseUnitFactor<string, Inserted> {}
    

    /**
     * Client document definition for UnitSystemCollection,
     * extends isomorphic base interface BaseUnitSystem.
     */
    export interface UnitSystem
      extends Inserted,
              Isomorphic.BaseUnitSystem<string, Inserted> {}
    

    /**
     * Client document definition for UnitTypeCollection,
     * extends isomorphic base interface BaseUnitType.
     */
    export interface UnitType
      extends Inserted,
              Isomorphic.BaseUnitType<string, Inserted> {}
    

    /**
     * Client document definition for UserCollection,
     * extends isomorphic base interface BaseUser.
     */
    export interface User
      extends Inserted,
              Isomorphic.BaseUser<string, Inserted> {}

    /**
     * Client collection definition.
     */
    export interface MigrationStatusCollection
      extends Tyr.CollectionInstance<MigrationStatus> {}
    

    /**
     * Client collection definition.
     */
    export interface TyrInstanceCollection
      extends Tyr.CollectionInstance<TyrInstance> {}
    

    /**
     * Client collection definition.
     */
    export interface TyrLogCollection
      extends Tyr.CollectionInstance<TyrLog> {}
    

    /**
     * Client collection definition.
     */
    export interface TyrLogEventCollection
      extends Tyr.CollectionInstance<TyrLogEvent>,
                Isomorphic.TyrLogEventCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface TyrLogLevelCollection
      extends Tyr.CollectionInstance<TyrLogLevel>,
                Isomorphic.TyrLogLevelCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface TyrSchemaCollection
      extends Tyr.CollectionInstance<TyrSchema> {}
    

    /**
     * Client collection definition.
     */
    export interface TyrSchemaTypeCollection
      extends Tyr.CollectionInstance<TyrSchemaType>,
                Isomorphic.TyrSchemaTypeCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface TyrSubscriptionCollection
      extends Tyr.CollectionInstance<TyrSubscription> {}
    

    /**
     * Client collection definition.
     */
    export interface TyrUserAgentCollection
      extends Tyr.CollectionInstance<TyrUserAgent> {}
    

    /**
     * Client collection definition.
     */
    export interface UnitCollection
      extends Tyr.CollectionInstance<Unit>,
                Isomorphic.UnitCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface UnitFactorCollection
      extends Tyr.CollectionInstance<UnitFactor>,
                Isomorphic.UnitFactorCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface UnitSystemCollection
      extends Tyr.CollectionInstance<UnitSystem>,
                Isomorphic.UnitSystemCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface UnitTypeCollection
      extends Tyr.CollectionInstance<UnitType>,
                Isomorphic.UnitTypeCollectionEnumStatic {}
    

    /**
     * Client collection definition.
     */
    export interface UserCollection
      extends Tyr.CollectionInstance<User> {}

    export type TyrLogEventId = Isomorphic.TyrLogEventId;
    export type TyrLogLevelId = Isomorphic.TyrLogLevelId;
    export type TyrSchemaTypeId = Isomorphic.TyrSchemaTypeId;
    export type UnitId = Isomorphic.UnitId;
    export type UnitFactorId = Isomorphic.UnitFactorId;
    export type UnitSystemId = Isomorphic.UnitSystemId;
    export type UnitTypeId = Isomorphic.UnitTypeId;
  
    /**
     * Add lookup properties to Tyr.byName with extended interfaces
     */
    export interface CollectionsByName {
      migrationStatus: MigrationStatusCollection;
      tyrInstance: TyrInstanceCollection;
      tyrLog: TyrLogCollection;
      tyrLogEvent: TyrLogEventCollection;
      tyrLogLevel: TyrLogLevelCollection;
      tyrSchema: TyrSchemaCollection;
      tyrSchemaType: TyrSchemaTypeCollection;
      tyrSubscription: TyrSubscriptionCollection;
      tyrUserAgent: TyrUserAgentCollection;
      unit: UnitCollection;
      unitFactor: UnitFactorCollection;
      unitSystem: UnitSystemCollection;
      unitType: UnitTypeCollection;
      user: UserCollection;
    }

    /**
     * Add lookup properties to Tyr.byId with extended interfaces
     */
    export interface CollectionsById {
      _m1: MigrationStatusCollection;
      _t2: TyrInstanceCollection;
      _l0: TyrLogCollection;
      _l2: TyrLogEventCollection;
      _l1: TyrLogLevelCollection;
      _t1: TyrSchemaCollection;
      _t0: TyrSchemaTypeCollection;
      _t3: TyrSubscriptionCollection;
      _u4: TyrUserAgentCollection;
      _u2: UnitCollection;
      _u3: UnitFactorCollection;
      _u0: UnitSystemCollection;
      _u1: UnitTypeCollection;
      u00: UserCollection;
    }
  
  }

}