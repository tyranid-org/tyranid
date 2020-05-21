import { Tyr } from 'tyranid/client';

/*
export async function loadDynamicFields(
  collection: Tyr.CollectionInstance,
  query: Tyr.MongoQuery
) {
  const results = await collection.fieldsFor({
    custom: true,
    query,
  });

  const fields =
    (get(results, 'custom.def.fields') as {
      [key: string]: Tyr.anny;
    }) || {};

  const customKeys = Object.keys(fields);
  const selectFieldKeys = [];
  const customSelectChoices: {
    [Identifier: string]: Tyr.CustomChoice[];
  } = {};

  for (let key of customKeys) {
    const fld = fields[key];

    if (
      fld.def.link === 'customChoice' ||
      (fld.def.of && fld.def.of.link === 'customChoice')
    ) {
      selectFieldKeys.push(key);
    }
  }

  if (selectFieldKeys.length) {
    const choices = await Tyr.byName.customChoice.findAll({
      query: {
        customFieldLabel: { $in: selectFieldKeys },
      },
    });

    const groups = groupBy(choices, choice => choice.customFieldLabel);

    for (let selectFieldKey of selectFieldKeys) {
      const choices = groups[selectFieldKey];
      choices.sort((a, b) => a.order - b.order);

      customSelectChoices[selectFieldKey] = choices;
    }
  }

  return { fields, customSelectChoices };
}
*/
