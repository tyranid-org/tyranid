/**
 *
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 *
 * Generated by `tyranid-tdgen@0.6.9`: https://github.com/tyranid-org/tyranid-tdgen
 * 
 */
  
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { Tyr as Isomorphic } from 'tyranid/isomorphic';

declare module 'tyranid' {

  namespace Tyr {
    export type CollectionName = Isomorphic.CollectionName;
    export type CollectionId = Isomorphic.CollectionId;

    

    /**
     * Server base document definition for ContinentCollection.
     */
    interface BaseContinent
      extends Isomorphic.BaseContinent<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for ContinentCollection,
     * extends isomorphic base interface BaseContinent.
     */
    interface Continent
      extends Inserted<number>,
              BaseContinent {}
    

    /**
     * Server base document definition for CountryCollection.
     */
    interface BaseCountry
      extends Isomorphic.BaseCountry<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for CountryCollection,
     * extends isomorphic base interface BaseCountry.
     */
    interface Country
      extends Inserted<CountryId>,
              BaseCountry {}
    

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
     * Server base document definition for ProvinceCollection.
     */
    interface BaseProvince
      extends Isomorphic.BaseProvince<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for ProvinceCollection,
     * extends isomorphic base interface BaseProvince.
     */
    interface Province
      extends Inserted<number>,
              BaseProvince {}
    

    /**
     * Server base document definition for TyrComponentConfigCollection.
     */
    interface BaseTyrComponentConfig
      extends Isomorphic.BaseTyrComponentConfig<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrComponentConfigCollection,
     * extends isomorphic base interface BaseTyrComponentConfig.
     */
    interface TyrComponentConfig
      extends Inserted<ObjIdType>,
              BaseTyrComponentConfig {}
    

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
     * Server base document definition for TyrImportCollection.
     */
    interface BaseTyrImport
      extends Isomorphic.BaseTyrImport<ObjIdType, Inserted<ObjIdType>, Inserted<number>> {}

    /**
     * Server document definition for TyrImportCollection,
     * extends isomorphic base interface BaseTyrImport.
     */
    interface TyrImport
      extends Inserted<ObjIdType>,
              BaseTyrImport {}
    

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
    interface ContinentCollection
      extends Tyr.CollectionInstance<Continent> {
    }

    /**
     * Server collection definition.
     */
    interface CountryCollection
      extends Tyr.CollectionInstance<Country>,
                Isomorphic.CountryCollectionEnumStatic<ObjIdType, Inserted<ObjIdType>, Inserted<number>>,
              CountryCollectionService {
      service: CountryCollectionService;
    }

    export interface CountryCollectionService {
      byCode(
        this: any,
        code: string): Promise<Country | undefined>;
      byFips(
        this: any,
        code: string): Promise<Country | undefined>;
    }


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
    interface ProvinceCollection
      extends Tyr.CollectionInstance<Province> {
    }

    /**
     * Server collection definition.
     */
    interface TyrComponentConfigCollection
      extends Tyr.CollectionInstance<TyrComponentConfig> {
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
    interface TyrImportCollection
      extends Tyr.CollectionInstance<TyrImport> {
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

    export type CountryId = Isomorphic.CountryId;
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
      continent: ContinentCollection;
      country: CountryCollection;
      mediaType: MediaTypeCollection;
      province: ProvinceCollection;
      tyrComponentConfig: TyrComponentConfigCollection;
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
      Continent: ContinentCollection;
      Country: CountryCollection;
      MediaType: MediaTypeCollection;
      Province: ProvinceCollection;
      TyrComponentConfig: TyrComponentConfigCollection;
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
      _g0: ContinentCollection;
      _g1: CountryCollection;
      _mt: MediaTypeCollection;
      _g2: ProvinceCollection;
      _tc: TyrComponentConfigCollection;
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
      _u4: TyrUserAgentCollection;
      _u2: UnitCollection;
      _u3: UnitFactorCollection;
      _u0: UnitSystemCollection;
      _u1: UnitTypeCollection;
    }
  
  }

}
