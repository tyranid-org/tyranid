/**
 *
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 *
 * Generated by `tyranid-tdgen@0.6.0-alpha.0`: https://github.com/tyranid-org/tyranid-tdgen
 * date: Tue Feb 18 2020 17:17:44 GMT-0600 (CST)
 */
  
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { Tyr as Isomorphic } from 'tyranid/isomorphic';

declare module 'tyranid' {

  namespace Tyr {
    export type CollectionName = Isomorphic.CollectionName;
    export type CollectionId = Isomorphic.CollectionId;

    

    /**
     * Server base document definition for MediaTypeCollection.
     */
    interface BaseMediaType
      extends Isomorphic.BaseMediaType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for MediaTypeCollection,
     * extends isomorphic base interface BaseMediaType.
     */
    interface MediaType
      extends Inserted<MediaTypeId>,
              BaseMediaType {}
    

    /**
     * Server base document definition for TyrExchangeRateCollection.
     */
    interface BaseTyrExchangeRate
      extends Isomorphic.BaseTyrExchangeRate<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrExchangeRateCollection,
     * extends isomorphic base interface BaseTyrExchangeRate.
     */
    interface TyrExchangeRate
      extends Inserted<string>,
              BaseTyrExchangeRate {}
    

    /**
     * Server base document definition for TyrInstanceCollection.
     */
    interface BaseTyrInstance
      extends Isomorphic.BaseTyrInstance<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrInstanceCollection,
     * extends isomorphic base interface BaseTyrInstance.
     */
    interface TyrInstance
      extends Inserted<string>,
              BaseTyrInstance {}
    

    /**
     * Server base document definition for TyrLogCollection.
     */
    interface BaseTyrLog
      extends Isomorphic.BaseTyrLog<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrLogCollection,
     * extends isomorphic base interface BaseTyrLog.
     */
    interface TyrLog
      extends Inserted<ObjIdType>,
              BaseTyrLog {}
    

    /**
     * Server base document definition for TyrLogEventCollection.
     */
    interface BaseTyrLogEvent
      extends Isomorphic.BaseTyrLogEvent<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrLogEventCollection,
     * extends isomorphic base interface BaseTyrLogEvent.
     */
    interface TyrLogEvent
      extends Inserted<TyrLogEventId>,
              BaseTyrLogEvent {}
    

    /**
     * Server base document definition for TyrLogLevelCollection.
     */
    interface BaseTyrLogLevel
      extends Isomorphic.BaseTyrLogLevel<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrLogLevelCollection,
     * extends isomorphic base interface BaseTyrLogLevel.
     */
    interface TyrLogLevel
      extends Inserted<TyrLogLevelId>,
              BaseTyrLogLevel {}
    

    /**
     * Server base document definition for TyrMarkupTypeCollection.
     */
    interface BaseTyrMarkupType
      extends Isomorphic.BaseTyrMarkupType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrMarkupTypeCollection,
     * extends isomorphic base interface BaseTyrMarkupType.
     */
    interface TyrMarkupType
      extends Inserted<TyrMarkupTypeId>,
              BaseTyrMarkupType {}
    

    /**
     * Server base document definition for TyrMigrationStatusCollection.
     */
    interface BaseTyrMigrationStatus
      extends Isomorphic.BaseTyrMigrationStatus<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrMigrationStatusCollection,
     * extends isomorphic base interface BaseTyrMigrationStatus.
     */
    interface TyrMigrationStatus
      extends Inserted<string>,
              BaseTyrMigrationStatus {}
    

    /**
     * Server base document definition for TyrPageCollection.
     */
    interface BaseTyrPage
      extends Isomorphic.BaseTyrPage<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrPageCollection,
     * extends isomorphic base interface BaseTyrPage.
     */
    interface TyrPage
      extends Inserted<ObjIdType>,
              BaseTyrPage {}
    

    /**
     * Server base document definition for TyrSchemaCollection.
     */
    interface BaseTyrSchema
      extends Isomorphic.BaseTyrSchema<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrSchemaCollection,
     * extends isomorphic base interface BaseTyrSchema.
     */
    interface TyrSchema
      extends Inserted<ObjIdType>,
              BaseTyrSchema {}
    

    /**
     * Server base document definition for TyrSchemaTypeCollection.
     */
    interface BaseTyrSchemaType
      extends Isomorphic.BaseTyrSchemaType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrSchemaTypeCollection,
     * extends isomorphic base interface BaseTyrSchemaType.
     */
    interface TyrSchemaType
      extends Inserted<TyrSchemaTypeId>,
              BaseTyrSchemaType {}
    

    /**
     * Server base document definition for TyrSubscriptionCollection.
     */
    interface BaseTyrSubscription
      extends Isomorphic.BaseTyrSubscription<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrSubscriptionCollection,
     * extends isomorphic base interface BaseTyrSubscription.
     */
    interface TyrSubscription
      extends Inserted<ObjIdType>,
              BaseTyrSubscription {}
    

    /**
     * Server base document definition for TyrTableConfigCollection.
     */
    interface BaseTyrTableConfig
      extends Isomorphic.BaseTyrTableConfig<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrTableConfigCollection,
     * extends isomorphic base interface BaseTyrTableConfig.
     */
    interface TyrTableConfig
      extends Inserted<ObjIdType>,
              BaseTyrTableConfig {}
    

    /**
     * Server base document definition for TyrUserAgentCollection.
     */
    interface BaseTyrUserAgent
      extends Isomorphic.BaseTyrUserAgent<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrUserAgentCollection,
     * extends isomorphic base interface BaseTyrUserAgent.
     */
    interface TyrUserAgent
      extends Inserted<ObjIdType>,
              BaseTyrUserAgent {}
    

    /**
     * Server base document definition for UnitCollection.
     */
    interface BaseUnit
      extends Isomorphic.BaseUnit<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for UnitCollection,
     * extends isomorphic base interface BaseUnit.
     */
    interface Unit
      extends Inserted<UnitId>,
              BaseUnit {}
    

    /**
     * Server base document definition for UnitFactorCollection.
     */
    interface BaseUnitFactor
      extends Isomorphic.BaseUnitFactor<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for UnitFactorCollection,
     * extends isomorphic base interface BaseUnitFactor.
     */
    interface UnitFactor
      extends Inserted<UnitFactorId>,
              BaseUnitFactor {}
    

    /**
     * Server base document definition for UnitSystemCollection.
     */
    interface BaseUnitSystem
      extends Isomorphic.BaseUnitSystem<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for UnitSystemCollection,
     * extends isomorphic base interface BaseUnitSystem.
     */
    interface UnitSystem
      extends Inserted<UnitSystemId>,
              BaseUnitSystem {}
    

    /**
     * Server base document definition for UnitTypeCollection.
     */
    interface BaseUnitType
      extends Isomorphic.BaseUnitType<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for UnitTypeCollection,
     * extends isomorphic base interface BaseUnitType.
     */
    interface UnitType
      extends Inserted<UnitTypeId>,
              BaseUnitType {}

    /**
     * Server collection definition.
     */
    interface MediaTypeCollection
      extends Tyr.CollectionInstance<MediaType>,
                Isomorphic.MediaTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface TyrExchangeRateCollection
      extends Tyr.CollectionInstance<TyrExchangeRate> {
    }

    /**
     * Server collection definition.
     */
    interface TyrInstanceCollection
      extends Tyr.CollectionInstance<TyrInstance> {
    }

    /**
     * Server collection definition.
     */
    interface TyrLogCollection
      extends Tyr.CollectionInstance<TyrLog> {
    }

    /**
     * Server collection definition.
     */
    interface TyrLogEventCollection
      extends Tyr.CollectionInstance<TyrLogEvent>,
                Isomorphic.TyrLogEventCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface TyrLogLevelCollection
      extends Tyr.CollectionInstance<TyrLogLevel>,
                Isomorphic.TyrLogLevelCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface TyrMarkupTypeCollection
      extends Tyr.CollectionInstance<TyrMarkupType>,
                Isomorphic.TyrMarkupTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface TyrMigrationStatusCollection
      extends Tyr.CollectionInstance<TyrMigrationStatus> {
    }

    /**
     * Server collection definition.
     */
    interface TyrPageCollection
      extends Tyr.CollectionInstance<TyrPage> {
    }

    /**
     * Server collection definition.
     */
    interface TyrSchemaCollection
      extends Tyr.CollectionInstance<TyrSchema> {
    }

    /**
     * Server collection definition.
     */
    interface TyrSchemaTypeCollection
      extends Tyr.CollectionInstance<TyrSchemaType>,
                Isomorphic.TyrSchemaTypeCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface TyrSubscriptionCollection
      extends Tyr.CollectionInstance<TyrSubscription> {
    }

    /**
     * Server collection definition.
     */
    interface TyrTableConfigCollection
      extends Tyr.CollectionInstance<TyrTableConfig> {
    }

    /**
     * Server collection definition.
     */
    interface TyrUserAgentCollection
      extends Tyr.CollectionInstance<TyrUserAgent> {
    }

    /**
     * Server collection definition.
     */
    interface UnitCollection
      extends Tyr.CollectionInstance<Unit>,
                Isomorphic.UnitCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface UnitFactorCollection
      extends Tyr.CollectionInstance<UnitFactor>,
                Isomorphic.UnitFactorCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface UnitSystemCollection
      extends Tyr.CollectionInstance<UnitSystem>,
                Isomorphic.UnitSystemCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {
    }

    /**
     * Server collection definition.
     */
    interface UnitTypeCollection
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
    interface CollectionsByName {
      mediaType: MediaTypeCollection;
      tyrExchangeRate: TyrExchangeRateCollection;
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
    interface CollectionsByClassName {
      MediaType: MediaTypeCollection;
      TyrExchangeRate: TyrExchangeRateCollection;
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
    interface CollectionsById {
      _mt: MediaTypeCollection;
      _u5: TyrExchangeRateCollection;
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
