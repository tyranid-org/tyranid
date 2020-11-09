import { Tyr } from 'tyranid';

import 'tyranid/builtin/server';

export const Country = new Tyr.Collection({
  id: '_g1',
  name: 'country',
  dbName: 'countries',
  enum: true,
  internal: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true, width: 100 },

    code: {
      is: 'string',
      labelField: 'alternate',
      description:
        'AKA iso166_1_a2 ...  Top-level internet domain names also use this code.',
    },
    iso3166_1_a3: {
      is: 'string',
      description: 'ISO 3166-1.  Three-letter country code.',
    },

    iso3166_1_num: {
      is: 'integer',
      description: 'ISO 3166-1.  Numeric country code.',
    },

    fips10_4: {
      is: 'string',
      description: 'FIPS 10-4.   Two-letter country code.',
    },

    anyCode: { is: 'string' },

    aliases: { is: 'string' },
    notes: { is: 'string' },

    continent: { link: 'continent' },
  },
  values: [
    /* eslint-disable quotes */
    ['_id', 'name', 'code', 'iso3166_1_a3', 'fips10_4', 'continent'],
    [4184, 'Iran, Islamic Republic of', 'IR', 'IRN', 'IR', 4330],
    [4185, 'Iceland', 'IS', 'ISL', 'IC', 4331],
    [4186, 'Italy', 'IT', 'ITA', 'IT', 4331],
    [4187, 'Jersey', 'JE', 'JEY', 'JE', 4331],
    [4188, 'Jamaica', 'JM', 'JAM', 'JM', 4332],
    [4189, 'Jordan', 'JO', 'JOR', 'JO', 4330],
    [4190, 'Japan', 'JP', 'JPN', 'JA', 4330],
    [4191, 'Kenya', 'KE', 'KEN', 'KE', 4328],
    [4192, 'Kyrgyzstan', 'KG', 'KGZ', 'KG', 4330],
    [4193, 'Cambodia', 'KH', 'KHM', 'CB', 4330],
    [4194, 'Kiribati', 'KI', 'KIR', 'KR', 4333],
    [4195, 'Comoros', 'KM', 'COM', 'CN', 4328],
    [4196, 'Saint Kitts and Nevis', 'KN', 'KNA', 'SC', 4334],
    [
      4197,
      'North Korea',
      'KP',
      'PRK',
      'KN',
      4330,
      { aliases: 'Democratic Peoples Republic of Korea' },
    ],
    [
      4198,
      'South Korea',
      'KR',
      'KOR',
      'KS',
      4330,
      { aliases: 'Republic of Korea' },
    ],
    [4199, 'Kuwait', 'KW', 'KWT', 'KU', 4330],
    [4200, 'Cayman Islands', 'KY', 'CYM', 'CJ', 4334],
    [4201, 'Kazakhstan', 'KZ', 'KAZ', 'KZ', 4330],
    [
      4202,
      'Lao Peoples Democratic Republic',
      'LA',
      'LAO',
      'LA',
      4330,
      { aliases: 'Laos' },
    ],
    [4203, 'Lebanon', 'LB', 'LBN', 'LE', 4330],
    [4204, 'Saint Lucia', 'LC', 'LCA', 'ST', 4334],
    [4205, 'Liechtenstein', 'LI', 'LIE', 'LS', 4331],
    [4206, 'Sri Lanka', 'LK', 'LKA', 'CE', 4330],
    [4207, 'Liberia', 'LR', 'LBR', 'LI', 4328],
    [4208, 'Lesotho', 'LS', 'LSO', 'LT', 4328],
    [4209, 'Lithuania', 'LT', 'LTU', 'LH', 4331],
    [4210, 'Luxembourg', 'LU', 'LUX', 'LU', 4331],
    [4211, 'Latvia', 'LV', 'LVA', 'LG', 4331],
    [4212, 'Libyan Arab Jamahiriya', 'LY', 'LBY', 'null', 4328],
    [4213, 'Morocco', 'MA', 'MAR', 'MO', 4328],
    [4214, 'Monaco', 'MC', 'MCO', 'MN', 4331],
    [4215, 'Moldova, Republic of', 'MD', 'MDA', 'MD', 4331],
    [4216, 'Montenegro', 'ME', 'MNE', 'MW', 4331],
    [4217, 'Madagascar', 'MG', 'MDG', 'MA', 4328],
    [4218, 'Marshall Islands', 'MH', 'MHL', 'RM', 4333],
    [4219, 'Macedonia', 'MK', 'MKD', 'MK', 4331],
    [4220, 'Mali', 'ML', 'MLI', 'ML', 4328],
    [4221, 'Myanmar', 'MM', 'MMR', 'BM', 4330, { aliases: 'Burma' }],
    [4222, 'Mongolia', 'MN', 'MNG', 'MG', 4330],
    [4223, 'Macao', 'MO', 'MAC', 'MC', 4330],
    [4224, 'Northern Mariana Islands', 'MP', 'MNP', 'CQ', 4333],
    [4225, 'Martinique', 'MQ', 'MTQ', 'MB', 4334],
    [4226, 'Mauritania', 'MR', 'MRT', 'MR', 4328],
    [4227, 'Montserrat', 'MS', 'MSR', 'MH', 4334],
    [4228, 'Malta', 'MT', 'MLT', 'MT', 4331],
    [4229, 'Mauritius', 'MU', 'MUS', 'MP', 4328],
    [4230, 'Maldives', 'MV', 'MDV', 'MV', 4330],
    [4231, 'Malawi', 'MW', 'MWI', 'MI', 4328],
    [4232, 'Mexico', 'MX', 'MEX', 'MX', 4332],
    [4233, 'Malaysia', 'MY', 'MYS', 'MY', 4330],
    [4234, 'Mozambique', 'MZ', 'MOZ', 'MZ', 4328],
    [4235, 'Namibia', 'NA', 'NAM', 'WA', 4328],
    [4236, 'New Caledonia', 'NC', 'NCL', 'NC', 4333],
    [4237, 'Niger', 'NE', 'NER', 'NG', 4328],
    [4238, 'Norfolk Island', 'NF', 'NFK', 'NF', 4333],
    [4239, 'Nigeria', 'NG', 'NGA', 'NI', 4328],
    [4240, 'Nicaragua', 'NI', 'NIC', 'NU', 4332],
    [4241, 'Netherlands', 'NL', 'NLD', 'NL', 4331],
    [4242, 'Norway', 'NO', 'NOR', 'NO', 4331],
    [4243, 'Nepal', 'NP', 'NPL', 'NP', 4330],
    [4244, 'Nauru', 'NR', 'NRU', 'NR', 4333],
    [4245, 'Niue', 'NU', 'NIU', 'NE', 4333],
    [4246, 'New Zealand', 'NZ', 'NZL', 'NZ', 4333],
    [4247, 'Oman', 'OM', 'OMN', 'MU', 4330],
    [4248, 'Panama', 'PA', 'PAN', 'PM', 4332],
    [4249, 'Peru', 'PE', 'PER', 'PE', 4334],
    [4250, 'French Polynesia', 'PF', 'PYF', 'FP', 4333],
    [4251, 'Papua New Guinea', 'PG', 'PNG', 'PP', 4333],
    [4252, 'Philippines', 'PH', 'PHL', 'RP', 4330],
    [4253, 'Pakistan', 'PK', 'PAK', 'PK', 4330],
    [4254, 'Poland', 'PL', 'POL', 'PL', 4331],
    [4255, 'Saint Pierre and Miquelon', 'PM', 'SPM', 'SB', 4334],
    [4256, 'Pitcairn', 'PN', 'PCN', 'PC', 4333],
    [4257, 'Puerto Rico', 'PR', 'PRI', 'RQ', 4334],
    [4258, 'Palestinian Territory', 'PS', 'PSE', 'null', 4330],
    [4259, 'Portugal', 'PT', 'PRT', 'PO', 4331],
    [4260, 'Palau', 'PW', 'PLW', 'PS', 4333],
    [4261, 'Paraguay', 'PY', 'PRY', 'PA', 4334],
    [4262, 'Qatar', 'QA', 'QAT', 'QA', 4330],
    [4263, 'Reunion', 'RE', 'REU', 'RE', 4328],
    [4264, 'Romania', 'RO', 'ROU', 'RO', 4331],
    [4265, 'Serbia', 'RS', 'SRB', 'RI', 4331],
    [4266, 'Russian Federation', 'RU', 'RUS', 'RS', 4330],
    [4267, 'Rwanda', 'RW', 'RWA', 'RW', 4328],
    [4268, 'Saudi Arabia', 'SA', 'SAU', 'SA', 4330],
    [4269, 'Solomon Islands', 'SB', 'SLB', 'BP', 4333],
    [4270, 'Seychelles', 'SC', 'SYC', 'SE', 4328],
    [4271, 'Sudan', 'SD', 'SDN', 'SU', 4328],
    [4272, 'Sweden', 'SE', 'SWE', 'SW', 4331],
    [4273, 'Singapore', 'SG', 'SGP', 'SN', 4330],
    [4274, 'Saint Helena', 'SH', 'SHN', 'SH', 4328],
    [4275, 'Slovenia', 'SI', 'SVN', 'SI', 4331],
    [4276, 'Svalbard and Jan Mayen', 'SJ', 'SJM', 'SV', 4331],
    [4277, 'Slovakia', 'SK', 'SVK', 'LO', 4331],
    [4278, 'Sierra Leone', 'SL', 'SLE', 'SL', 4328],
    [4279, 'San Marino', 'SM', 'SMR', 'SM', 4331],
    [4280, 'Senegal', 'SN', 'SEN', 'SG', 4328],
    [4281, 'Somalia', 'SO', 'SOM', 'SO', 4328],
    [4282, 'Suriname', 'SR', 'SUR', 'NS', 4334],
    [4283, 'Sao Tome and Principe', 'ST', 'STP', 'TP', 4328],
    [4284, 'El Salvador', 'SV', 'SLV', 'ES', 4334],
    [
      4285,
      'Syria',
      'SY',
      'SYR',
      'SY',
      4330,
      { aliases: 'Syrian Arab Republic' },
    ],
    [4286, 'Swaziland', 'SZ', 'SWZ', 'WZ', 4328],
    [4287, 'Turks and Caicos Islands', 'TC', 'TCA', 'TK', 4334],
    [4288, 'Chad', 'TD', 'TCD', 'CD', 4328],
    [4289, 'French Southern Territories', 'TF', 'ATF', 'FS', 4328],
    [4290, 'Togo', 'TG', 'TGO', 'TO', 4328],
    [4291, 'Thailand', 'TH', 'THA', 'TH', 4330],
    [4292, 'Tajikistan', 'TJ', 'TJK', 'TI', 4330],
    [4293, 'Tokelau', 'TK', 'TKL', 'TL', 4333],
    [4294, 'Timor-Leste', 'TL', 'TLS', 'TT', 4330],
    [4295, 'Turkmenistan', 'TM', 'TKM', 'TX', 4330],
    [4296, 'Tunisia', 'TN', 'TUN', 'TS', 4328],
    [4297, 'Tonga', 'TO', 'TON', 'TN', 4333],
    [4298, 'Turkey', 'TR', 'TUR', 'TU', 4330],
    [4299, 'Trinidad and Tobago', 'TT', 'TTO', 'TD', 4334],
    [4300, 'Tuvalu', 'TV', 'TUV', 'TV', 4333],
    [4301, 'Taiwan', 'TW', 'TWN', 'TW', 4330],
    [4302, 'Tanzania, United Republic of', 'TZ', 'TZA', 'TZ', 4328],
    [4303, 'Ukraine', 'UA', 'UKR', 'UP', 4331],
    [4304, 'Uganda', 'UG', 'UGA', 'UG', 4328],
    [4305, 'United States Minor Outlying Islands', 'UM', 'UMI', 'null', 4333],
    [4306, 'United States', 'US', 'USA', 'US', 4332],
    [4307, 'Uruguay', 'UY', 'URY', 'UY', 4334],
    [4308, 'Uzbekistan', 'UZ', 'UZB', 'UZ', 4330],
    [4309, 'Holy See (Vatican City State)', 'VA', 'VAT', 'VT', 4331],
    [4310, 'Saint Vincent and the Grenadines', 'VC', 'VCT', 'VC', 4334],
    [4311, 'Venezuela', 'VE', 'VEN', 'VE', 4334],
    [4312, 'Virgin Islands, British', 'VG', 'VGB', 'VI', 4334],
    [4313, 'Virgin Islands, U.S.', 'VI', 'VIR', 'VQ', 4334],
    [4314, 'Vietnam', 'VN', 'VNM', 'VM', 4330],
    [4315, 'Vanuatu', 'VU', 'VUT', 'NH', 4333],
    [4316, 'Wallis and Futuna', 'WF', 'WLF', 'WF', 4333],
    [4317, 'Samoa', 'WS', 'WSM', 'WS', 4333],
    [4318, 'Yemen', 'YE', 'YEM', 'YM', 4330],
    [4319, 'Mayotte', 'YT', 'MYT', 'MF', 4328],
    [4320, 'South Africa', 'ZA', 'ZAF', 'SF', 4328],
    [4321, 'Zambia', 'ZM', 'ZMB', 'ZA', 4328],
    [4322, 'Zimbabwe', 'ZW', 'ZWE', 'ZI', 4328],
    [4323, 'Metropolitan France', 'FX', '', 'null', 4331],
    [4324, 'Timor-Leste (East Timor)', 'TP', '', 'TT', 4330],
    [4325, 'Yugoslavia', 'YU', '', 'YU', 4331],
    [4326, 'Congo (Zaire)', 'ZR', '', 'CG', 4328],
    [4327, 'Unknown', 'O1', '', 'null', 0],
    [4075, 'Anonymous Proxy', 'A1', '', 'null', 0],
    [4076, 'Satellite Provider', 'A2', '', 'null', 0],
    [4077, 'Andorra', 'AD', 'AND', 'AN', 4331],
    [4078, 'United Arab Emirates', 'AE', 'ARE', 'AE', 4330],
    [4079, 'Afghanistan', 'AF', 'AFG', 'AF', 4330],
    [4080, 'Antigua and Barbuda', 'AG', 'ATG', 'AC', 4334],
    [4081, 'Anguilla', 'AI', 'AIA', 'AV', 4334],
    [4082, 'Albania', 'AL', 'ALB', 'AL', 4331],
    [4083, 'Armenia', 'AM', 'ARM', 'AM', 4330],
    [4084, 'Netherlands Antilles', 'AN', '', 'NT', 4334],
    [4085, 'Angola', 'AO', 'AGO', 'AO', 4328],
    [4088, 'Argentina', 'AR', 'ARG', 'AR', 4334],
    [4089, 'American Samoa', 'AS', 'ASM', 'AQ', 4333],
    [4090, 'Austria', 'AT', 'AUT', 'AU', 4331],
    [4091, 'Australia', 'AU', 'AUS', 'AS', 4333],
    [4092, 'Aruba', 'AW', 'ABW', 'AA', 4334],
    [4093, 'Aland Islands', 'AX', 'ALA', 'null', 4331],
    [4094, 'Azerbaijan', 'AZ', 'AZE', 'AJ', 4330],
    [4095, 'Bosnia and Herzegovina', 'BA', 'BIH', 'BK', 4331],
    [4096, 'Barbados', 'BB', 'BRB', 'BB', 4334],
    [4097, 'Bangladesh', 'BD', 'BGD', 'BG', 4330],
    [4098, 'Belgium', 'BE', 'BEL', 'BE', 4331],
    [4099, 'Burkina Faso', 'BF', 'BFA', 'UV', 4328],
    [4100, 'Bulgaria', 'BG', 'BGR', 'BU', 4331],
    [4101, 'Bahrain', 'BH', 'BHR', 'BA', 4330],
    [4102, 'Burundi', 'BI', 'BDI', 'BY', 4328],
    [4103, 'Benin', 'BJ', 'BEN', 'BN', 4328],
    [4104, 'Bermuda', 'BM', 'BMU', 'BD', 4334],
    [4105, 'Brunei Darussalam', 'BN', 'BRN', 'BX', 4330],
    [4106, 'Bolivia', 'BO', 'BOL', 'BL', 4334],
    [4107, 'Brazil', 'BR', 'BRA', 'BR', 4334],
    [4108, 'Bahamas', 'BS', 'BHS', 'BF', 4334],
    [4109, 'Bhutan', 'BT', 'BTN', 'BT', 4330],
    [4110, 'Bouvet Island', 'BV', 'BVT', 'BV', 4328],
    [4111, 'Botswana', 'BW', 'BWA', 'BC', 4328],
    [4112, 'Belarus', 'BY', 'BLR', 'BO', 4331, { aliases: 'Byelarus' }],
    [4113, 'Belize', 'BZ', 'BLZ', 'BH', 4332],
    [4114, 'Canada', 'CA', 'CAN', 'CA', 4332],
    [4115, 'Cocos (Keeling) Islands', 'CC', 'CCK', 'CK', 4330],
    [
      4116,
      'Congo, Democratic Republic of the',
      'CD',
      'COD',
      'CG',
      4328,
      { aliases: 'Zaire, Democratic Republic of Congo' },
    ],
    [4117, 'Central African Republic', 'CF', 'CAF', 'CT', 4328],
    [
      4118,
      'Congo',
      'CG',
      'COG',
      'CF',
      4328,
      { aliases: 'Republic of the Congo' },
    ],
    [4119, 'Switzerland', 'CH', 'CHE', 'SZ', 4331],
    [
      4120,
      'Cote dIvoire',
      'CI',
      'CIV',
      'IV',
      4328,
      { aliases: 'Ivory Coast, Cote dIvoire' },
    ],
    [4121, 'Cook Islands', 'CK', 'COK', 'CW', 4333],
    [4122, 'Chile', 'CL', 'CHL', 'CI', 4334],
    [4123, 'Cameroon', 'CM', 'CMR', 'CM', 4328],
    [4124, 'China', 'CN', 'CHN', 'CH', 4330],
    [4125, 'Colombia', 'CO', 'COL', 'CO', 4334],
    [4126, 'Costa Rica', 'CR', 'CRI', 'CS', 4332],
    [4127, 'Cuba', 'CU', 'CUB', 'CU', 4332],
    [4128, 'Cape Verde', 'CV', 'CPV', 'CV', 4328],
    [4129, 'Christmas Island', 'CX', 'CXR', 'KT', 4330],
    [4130, 'Cyprus', 'CY', 'CYP', 'CY', 4330],
    [4131, 'Czech Republic', 'CZ', 'CZE', 'EZ', 4331],
    [4132, 'Germany', 'DE', 'DEU', 'GM', 4331],
    [4133, 'Djibouti', 'DJ', 'DJI', 'DJ', 4328],
    [4134, 'Denmark', 'DK', 'DNK', 'DA', 4331],
    [4135, 'Dominica', 'DM', 'DMA', 'DO', 4334],
    [4136, 'Dominican Republic', 'DO', 'DOM', 'DR', 4334],
    [4137, 'Algeria', 'DZ', 'DZA', 'AG', 4328],
    [4138, 'Ecuador', 'EC', 'ECU', 'EC', 4334],
    [4139, 'Estonia', 'EE', 'EST', 'EN', 4331],
    [4140, 'Egypt', 'EG', 'EGY', 'EG', 4328],
    [4141, 'Western Sahara', 'EH', 'ESH', 'WI', 4328],
    [4142, 'Eritrea', 'ER', 'ERI', 'ER', 4328],
    [4143, 'Spain', 'ES', 'ESP', 'SP', 4331],
    [4144, 'Ethiopia', 'ET', 'ETH', 'ET', 4328],
    [4146, 'Finland', 'FI', 'FIN', 'FI', 4331],
    [4147, 'Fiji', 'FJ', 'FJI', 'FJ', 4333],
    [4148, 'Falkland Islands (Malvinas)', 'FK', 'FLK', 'FK', 4334],
    [4149, 'Micronesia, Federated States of', 'FM', 'FSM', 'FM', 4333],
    [4150, 'Faroe Islands', 'FO', 'FRO', 'FO', 4331],
    [4151, 'France', 'FR', 'FRA', 'FR', 4331],
    [4152, 'Gabon', 'GA', 'GAB', 'GB', 4328],
    [4153, 'United Kingdom', 'GB', 'GBR', 'UK', 4331],
    [4154, 'Grenada', 'GD', 'GRD', 'GJ', 4334],
    [4155, 'Georgia', 'GE', 'GEO', 'GG', 4330],
    [4156, 'French Guiana', 'GF', 'GUF', 'FG', 4334],
    [4157, 'Guernsey', 'GG', 'GGY', 'GK', 4331],
    [4158, 'Ghana', 'GH', 'GHA', 'GH', 4328],
    [4159, 'Gibraltar', 'GI', 'GIB', 'GI', 4331],
    [4160, 'Greenland', 'GL', 'GRL', 'GL', 4332],
    [4161, 'Gambia', 'GM', 'GMB', 'GA', 4328],
    [4162, 'Guinea', 'GN', 'GIN', 'GV', 4328],
    [4163, 'Guadeloupe', 'GP', 'GLP', 'GP', 4334],
    [4164, 'Equatorial Guinea', 'GQ', 'GNQ', 'EK', 4328],
    [4165, 'Greece', 'GR', 'GRC', 'GR', 4331],
    [
      4166,
      'South Georgia and the South Sandwich Islands',
      'GS',
      'SGS',
      'SX',
      4334,
    ],
    [4167, 'Guatemala', 'GT', 'GTM', 'GT', 4332],
    [4168, 'Guam', 'GU', 'GUM', 'GQ', 4333],
    [4169, 'Guinea-Bissau', 'GW', 'GNB', 'PU', 4328],
    [4170, 'Guyana', 'GY', 'GUY', 'GY', 4334],
    [4172, 'Heard Island and McDonald Islands', 'HM', 'HMD', 'HM', 4328],
    [4173, 'Honduras', 'HN', 'HND', 'HO', 4332],
    [4174, 'Croatia', 'HR', 'HRV', 'HR', 4331],
    [4175, 'Haiti', 'HT', 'HTI', 'HA', 4332],
    [4176, 'Hungary', 'HU', 'HUN', 'HU', 4331],
    [4177, 'Indonesia', 'ID', 'IDN', 'ID', 4330],
    [4178, 'Ireland', 'IE', 'IRL', 'EI', 4331],
    [4179, 'Israel', 'IL', 'ISR', 'IS', 4330],
    [4180, 'Isle of Man', 'IM', 'IMN', 'IM', 4331],
    [4181, 'India', 'IN', 'IND', 'IN', 4330],
    [4182, 'British Indian Ocean Territory', 'IO', 'IOT', 'IO', 4330],
    [4183, 'Iraq', 'IQ', 'IRQ', 'IZ', 4330],
  ],
  service: {
    byCode: {
      params: {
        code: { is: 'string', required: true },
      },
      return: { is: 'country' },
    },
    byFips: {
      params: {
        code: { is: 'string', required: true },
      },
      return: { is: 'country' },
    },
  },
}) as Tyr.CountryCollection;

// TODO:  these should be an isomorphic service
Country.service = {
  async byCode(code: string) {
    // TODO:  create a hash for this if this ends up being used a lot ?
    const countries = Country.values;

    if (code.length === 3) {
      return countries.find(country => country.iso3166_1_a3 === code);
    }

    return countries.find(country => country.code === code)!;
  },

  async byFips(fips: string) {
    // TODO:  create a hash for this if this ends up being used a lot ?
    return Country.values.find(country => country.fips10_4 === fips)!;
  },
};
