import { Tyr } from 'tyranid-client';

const adjustedEmail = 'obiwan@kenobi.com';

function run() {
  const unregister = Tyr.byName.user.on({
    type: 'find',
    hander(event: any) {
      event.document.email = adjustedEmail;
    }
  });
  Tyr.byName.user.findAll({ query: {} }).then(docs => {
    const doc = docs[0];
    if (doc.email !== adjustedEmail)
      throw Error(`User.on() event handler did not run`);
    unregister();
  });

  const t: Tyr.SpreadsheetTemplateMappingTypeId =
    Tyr.byName.spreadsheetTemplateMappingType.TABULAR._id;
  t === 1;
}

run();
