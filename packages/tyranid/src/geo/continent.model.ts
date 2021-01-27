import { Tyr } from 'tyranid';

const Continent = new Tyr.Collection({
  id: '_g0',
  name: 'continent',
  dbName: 'continents',
  internal: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string' },
    code: { is: 'string' },
  },
  values: [
    ['_id', 'name', 'code'],
    [4328, 'Africa', 'AF'],
    [4329, 'Antarctica', 'AN'],
    [4330, 'Asia', 'AS'],
    [4331, 'Europe', 'EU'],
    [4332, 'North America', 'NA'],
    [4333, 'Oceania', 'OC'],
    [4334, 'South America', 'SA'],
  ],
}) as Tyr.ContinentCollection;

export default Continent;

/*
ENTITY level SYSTEM STORAGE sqlStatic DDL-DATA
   HAS depth IS int,
       label IS string LABEL,
       note IS largeString,
       entityName IS string,
       defaultKeyName IS string
  [ DEPTH, LABEL,            ENTITY-NAME,           DEFAULT-KEY-NAME:
    2,     "Country Region", "place:countryRegion", "anyCode";
    1,     "Country",        "place:country",       "fips10_4";
    3,     "Province",       "place:province",      "anyCode",        NOTE "Principal subdivision of a country.  Known variously as provinces, states, cantons, and so on."
  ]

ENTITY area SYSTEM STORAGE sqlStatic DUPLICATE-LABELS
   HAS name IS name LABEL,
       subtype IS LINK dx.model:entity.areas UNINHERITABLE


// i think the following was just used for the flash maps we had ... probably safe to ignore

ENTITY countryRegion SYSTEM IS CONCRETE area STORAGE sqlStatic DDL-DATA DDL-IDS
   HAS country IS LINK country.regions,
       anyCode IS string,
       provinces IS 0..* LINK province.region
  [ ID,    NAME,                      COUNTRY, ANY-CODE:
    <4336, "East North Central",      >4306,   "E N Cen";
    <4337, "East South Central",      >4306,   "E S Cen";
    <4338, "Mid-Atlantic",            >4306,   "Mid Atl";
    <4339, "Mountain",                >4306,   "Mtn";
    <4340, "New England",             >4306,   "N Eng";
    <4341, "Pacific",                 >4306,   "Pacific";
    <4342, "South Atlantic",          >4306,   "S Atl";
    <4343, "West North Central",      >4306,   "W N Cen";
    <4344, "West South Central",      >4306,   "W S Cen";
    <4345, "England",                 >4153,   "GBR-ENG";
    <4346, "Northern Ireland",        >4153,   "GBR-NIR";
    <4347, "Scotland",                >4153,   "GBR-SCT";
    <4348, "Wales",                   >4153,   "GBR-WLS";
    <4349, "Chugoku",                 >4190,   "JPN-CGK";
    <4350, "Chubu",                   >4190,   "JPN-CHB";
    <4351, "Hokkaido",                >4190,   "JPN-HKK";
    <4352, "Kinki",                   >4190,   "JPN-KIN";
    <4353, "Kanto",                   >4190,   "JPN-KNT";
    <4354, "Kyushu",                  >4190,   "JPN-KYS";
    <4355, "Okinawa",                 >4190,   "JPN-OKN";
    <4356, "Shikoku",                 >4190,   "JPN-SHK";
    <4357, "Tohoku",                  >4190,   "JPN-THO";
    <4390, "Aegean Islands",          >4165,   "GRC-AIS";
    <4391, "Central Greece & Evvoia", >4165,   "GRC-CGE";
    <4392, "Crete",                   >4165,   "GRC-CRT";
    <4393, "Ionian Islands",          >4165,   "GRC-IIS";
    <4394, "Ipiros",                  >4165,   "GRC-IPR";
    <4395, "Macedonia",               >4165,   "GRC-MCD";
    <4396, "Peloponnisos",            >4165,   "GRC-PLP";
    <4397, "Thraki",                  >4165,   "GRC-THR";
    <4398, "Thessalia",               >4165,   "GRC-THS"
  ]

 */
