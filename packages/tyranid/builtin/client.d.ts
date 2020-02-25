/**
 *
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 *
 * Generated by `tyranid-tdgen@0.6.0-alpha.0`: https://github.com/tyranid-org/tyranid-tdgen
 * date: Tue Feb 25 2020 13:25:32 GMT-0600 (CST)
 */
  

import 'tyranid/client';
import { Tyr as Isomorphic } from 'tyranid/isomorphic';

declare module 'tyranid/client' {

  export namespace Tyr {

    

    /**
     * Client base document definition for MediaTypeCollection.
     */
    export interface BaseMediaType
      extends Isomorphic.BaseMediaType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for MediaTypeCollection,
     * extends isomorphic base interface BaseMediaType.
     */
    export interface MediaType
      extends Inserted<MediaTypeId>,
              BaseMediaType {}
    

    /**
     * Client base document definition for TyrExchangeRateCollection.
     */
    export interface BaseTyrExchangeRate
      extends Isomorphic.BaseTyrExchangeRate<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrExchangeRateCollection,
     * extends isomorphic base interface BaseTyrExchangeRate.
     */
    export interface TyrExchangeRate
      extends Inserted<string>,
              BaseTyrExchangeRate {}
    

    /**
     * Client base document definition for TyrImportCollection.
     */
    export interface BaseTyrImport
      extends Isomorphic.BaseTyrImport<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrImportCollection,
     * extends isomorphic base interface BaseTyrImport.
     */
    export interface TyrImport
      extends Inserted<ObjIdType>,
              BaseTyrImport {}
    

    /**
     * Client base document definition for TyrInstanceCollection.
     */
    export interface BaseTyrInstance
      extends Isomorphic.BaseTyrInstance<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrInstanceCollection,
     * extends isomorphic base interface BaseTyrInstance.
     */
    export interface TyrInstance
      extends Inserted<string>,
              BaseTyrInstance {}
    

    /**
     * Client base document definition for TyrLogCollection.
     */
    export interface BaseTyrLog
      extends Isomorphic.BaseTyrLog<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrLogCollection,
     * extends isomorphic base interface BaseTyrLog.
     */
    export interface TyrLog
      extends Inserted<ObjIdType>,
              BaseTyrLog {}
    

    /**
     * Client base document definition for TyrLogEventCollection.
     */
    export interface BaseTyrLogEvent
      extends Isomorphic.BaseTyrLogEvent<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrLogEventCollection,
     * extends isomorphic base interface BaseTyrLogEvent.
     */
    export interface TyrLogEvent
      extends Inserted<TyrLogEventId>,
              BaseTyrLogEvent {}
    

    /**
     * Client base document definition for TyrLogLevelCollection.
     */
    export interface BaseTyrLogLevel
      extends Isomorphic.BaseTyrLogLevel<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrLogLevelCollection,
     * extends isomorphic base interface BaseTyrLogLevel.
     */
    export interface TyrLogLevel
      extends Inserted<TyrLogLevelId>,
              BaseTyrLogLevel {}
    

    /**
     * Client base document definition for TyrMarkupTypeCollection.
     */
    export interface BaseTyrMarkupType
      extends Isomorphic.BaseTyrMarkupType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrMarkupTypeCollection,
     * extends isomorphic base interface BaseTyrMarkupType.
     */
    export interface TyrMarkupType
      extends Inserted<TyrMarkupTypeId>,
              BaseTyrMarkupType {}
    

    /**
     * Client base document definition for TyrMigrationStatusCollection.
     */
    export interface BaseTyrMigrationStatus
      extends Isomorphic.BaseTyrMigrationStatus<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrMigrationStatusCollection,
     * extends isomorphic base interface BaseTyrMigrationStatus.
     */
    export interface TyrMigrationStatus
      extends Inserted<string>,
              BaseTyrMigrationStatus {}
    

    /**
     * Client base document definition for TyrPageCollection.
     */
    export interface BaseTyrPage
      extends Isomorphic.BaseTyrPage<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrPageCollection,
     * extends isomorphic base interface BaseTyrPage.
     */
    export interface TyrPage
      extends Inserted<ObjIdType>,
              BaseTyrPage {}
    

    /**
     * Client base document definition for TyrSchemaCollection.
     */
    export interface BaseTyrSchema
      extends Isomorphic.BaseTyrSchema<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrSchemaCollection,
     * extends isomorphic base interface BaseTyrSchema.
     */
    export interface TyrSchema
      extends Inserted<ObjIdType>,
              BaseTyrSchema {}
    

    /**
     * Client base document definition for TyrSchemaTypeCollection.
     */
    export interface BaseTyrSchemaType
      extends Isomorphic.BaseTyrSchemaType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrSchemaTypeCollection,
     * extends isomorphic base interface BaseTyrSchemaType.
     */
    export interface TyrSchemaType
      extends Inserted<TyrSchemaTypeId>,
              BaseTyrSchemaType {}
    

    /**
     * Client base document definition for TyrSubscriptionCollection.
     */
    export interface BaseTyrSubscription
      extends Isomorphic.BaseTyrSubscription<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrSubscriptionCollection,
     * extends isomorphic base interface BaseTyrSubscription.
     */
    export interface TyrSubscription
      extends Inserted<ObjIdType>,
              BaseTyrSubscription {}
    

    /**
     * Client base document definition for TyrTableConfigCollection.
     */
    export interface BaseTyrTableConfig
      extends Isomorphic.BaseTyrTableConfig<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrTableConfigCollection,
     * extends isomorphic base interface BaseTyrTableConfig.
     */
    export interface TyrTableConfig
      extends Inserted<ObjIdType>,
              BaseTyrTableConfig {}
    

    /**
     * Client base document definition for TyrUserAgentCollection.
     */
    export interface BaseTyrUserAgent
      extends Isomorphic.BaseTyrUserAgent<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for TyrUserAgentCollection,
     * extends isomorphic base interface BaseTyrUserAgent.
     */
    export interface TyrUserAgent
      extends Inserted<ObjIdType>,
              BaseTyrUserAgent {}
    

    /**
     * Client base document definition for UnitCollection.
     */
    export interface BaseUnit
      extends Isomorphic.BaseUnit<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for UnitCollection,
     * extends isomorphic base interface BaseUnit.
     */
    export interface Unit
      extends Inserted<UnitId>,
              BaseUnit {}
    

    /**
     * Client base document definition for UnitFactorCollection.
     */
    export interface BaseUnitFactor
      extends Isomorphic.BaseUnitFactor<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for UnitFactorCollection,
     * extends isomorphic base interface BaseUnitFactor.
     */
    export interface UnitFactor
      extends Inserted<UnitFactorId>,
              BaseUnitFactor {}
    

    /**
     * Client base document definition for UnitSystemCollection.
     */
    export interface BaseUnitSystem
      extends Isomorphic.BaseUnitSystem<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for UnitSystemCollection,
     * extends isomorphic base interface BaseUnitSystem.
     */
    export interface UnitSystem
      extends Inserted<UnitSystemId>,
              BaseUnitSystem {}
    

    /**
     * Client base document definition for UnitTypeCollection.
     */
    export interface BaseUnitType
      extends Isomorphic.BaseUnitType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Client document definition for UnitTypeCollection,
     * extends isomorphic base interface BaseUnitType.
     */
    export interface UnitType
      extends Inserted<UnitTypeId>,
              BaseUnitType {}

    /**
     * Client collection definition.
     */
    export interface MediaTypeCollection
      extends Tyr.CollectionInstance<MediaType>,
                Isomorphic.MediaTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrExchangeRateCollection
      extends Tyr.CollectionInstance<TyrExchangeRate> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrImportCollection
      extends Tyr.CollectionInstance<TyrImport> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrInstanceCollection
      extends Tyr.CollectionInstance<TyrInstance> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrLogCollection
      extends Tyr.CollectionInstance<TyrLog> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrLogEventCollection
      extends Tyr.CollectionInstance<TyrLogEvent>,
                Isomorphic.TyrLogEventCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrLogLevelCollection
      extends Tyr.CollectionInstance<TyrLogLevel>,
                Isomorphic.TyrLogLevelCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrMarkupTypeCollection
      extends Tyr.CollectionInstance<TyrMarkupType>,
                Isomorphic.TyrMarkupTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrMigrationStatusCollection
      extends Tyr.CollectionInstance<TyrMigrationStatus> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrPageCollection
      extends Tyr.CollectionInstance<TyrPage> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrSchemaCollection
      extends Tyr.CollectionInstance<TyrSchema> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrSchemaTypeCollection
      extends Tyr.CollectionInstance<TyrSchemaType>,
                Isomorphic.TyrSchemaTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrSubscriptionCollection
      extends Tyr.CollectionInstance<TyrSubscription> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrTableConfigCollection
      extends Tyr.CollectionInstance<TyrTableConfig> {
    }

    /**
     * Client collection definition.
     */
    export interface TyrUserAgentCollection
      extends Tyr.CollectionInstance<TyrUserAgent> {
    }

    /**
     * Client collection definition.
     */
    export interface UnitCollection
      extends Tyr.CollectionInstance<Unit>,
                Isomorphic.UnitCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface UnitFactorCollection
      extends Tyr.CollectionInstance<UnitFactor>,
                Isomorphic.UnitFactorCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface UnitSystemCollection
      extends Tyr.CollectionInstance<UnitSystem>,
                Isomorphic.UnitSystemCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Client collection definition.
     */
    export interface UnitTypeCollection
      extends Tyr.CollectionInstance<UnitType>,
                Isomorphic.UnitTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    export type MediaTypeId = Isomorphic.MediaTypeId;
    export type TyrLogEventId = Isomorphic.TyrLogEventId;
    export type TyrLogLevelId = Isomorphic.TyrLogLevelId;
    export type TyrMarkupTypeId = Isomorphic.TyrMarkupTypeId;
    export type TyrSchemaTypeId = Isomorphic.TyrSchemaTypeId;
    export type UnitId = Isomorphic.UnitId;
    export type UnitFactorId = Isomorphic.UnitFactorId;
    export type UnitSystemId = Isomorphic.UnitSystemId;
    export type UnitTypeId = Isomorphic.UnitTypeId;
  
    /**
     * Add lookup properties to Tyr.byName with extended interfaces
     */
    export interface CollectionsByName {
      mediaType: MediaTypeCollection;
      tyrExchangeRate: TyrExchangeRateCollection;
      tyrImport: TyrImportCollection;
      tyrInstance: TyrInstanceCollection;
      tyrLog: TyrLogCollection;
      tyrLogEvent: TyrLogEventCollection;
      tyrLogLevel: TyrLogLevelCollection;
      tyrMarkupType: TyrMarkupTypeCollection;
      tyrMigrationStatus: TyrMigrationStatusCollection;
      tyrPage: TyrPageCollection;
      tyrSchema: TyrSchemaCollection;
      tyrSchemaType: TyrSchemaTypeCollection;
      tyrSubscription: TyrSubscriptionCollection;
      tyrTableConfig: TyrTableConfigCollection;
      tyrUserAgent: TyrUserAgentCollection;
      unit: UnitCollection;
      unitFactor: UnitFactorCollection;
      unitSystem: UnitSystemCollection;
      unitType: UnitTypeCollection;
    }

    /**
     * Add lookup properties to Tyr.collections with extended interfaces
     */
    export interface CollectionsByClassName {
      MediaType: MediaTypeCollection;
      TyrExchangeRate: TyrExchangeRateCollection;
      TyrImport: TyrImportCollection;
      TyrInstance: TyrInstanceCollection;
      TyrLog: TyrLogCollection;
      TyrLogEvent: TyrLogEventCollection;
      TyrLogLevel: TyrLogLevelCollection;
      TyrMarkupType: TyrMarkupTypeCollection;
      TyrMigrationStatus: TyrMigrationStatusCollection;
      TyrPage: TyrPageCollection;
      TyrSchema: TyrSchemaCollection;
      TyrSchemaType: TyrSchemaTypeCollection;
      TyrSubscription: TyrSubscriptionCollection;
      TyrTableConfig: TyrTableConfigCollection;
      TyrUserAgent: TyrUserAgentCollection;
      Unit: UnitCollection;
      UnitFactor: UnitFactorCollection;
      UnitSystem: UnitSystemCollection;
      UnitType: UnitTypeCollection;
    }

    /**
     * Add lookup properties to Tyr.byId with extended interfaces
     */
    export interface CollectionsById {
      _mt: MediaTypeCollection;
      _u5: TyrExchangeRateCollection;
      _im: TyrImportCollection;
      _t2: TyrInstanceCollection;
      _l0: TyrLogCollection;
      _l2: TyrLogEventCollection;
      _l1: TyrLogLevelCollection;
      _p1: TyrMarkupTypeCollection;
      _m1: TyrMigrationStatusCollection;
      _p0: TyrPageCollection;
      _t1: TyrSchemaCollection;
      _t0: TyrSchemaTypeCollection;
      _t3: TyrSubscriptionCollection;
      _tc: TyrTableConfigCollection;
      _u4: TyrUserAgentCollection;
      _u2: UnitCollection;
      _u3: UnitFactorCollection;
      _u0: UnitSystemCollection;
      _u1: UnitTypeCollection;
    }
  
  }

}
