const _ = require('lodash');
const yargs = require('yargs');

const {
  INTAKE_TABLE,
  getRecordsWithStatus,
  getBulkOrder,
  getItemToNumAvailable,
} = require('../airtable');

async function main() {
  const { argv } = yargs
    .option('deliveryDate', {
      coerce: (x) => new Date(x),
      demandOption: true,
      describe: 'Date of scheduled delivery (yyyy-mm-dd format)',
    });

  // Note: we compare our bulk order against all tickets with this status,
  // rather than finding tickets based on what's in a bulk delivery route,
  // because we may run this before creating the routes.
  const intakeRecords = await getRecordsWithStatus(INTAKE_TABLE, 'Bulk Delivery Confirmed');

  console.log(`Found ${intakeRecords.length} bulk delivery confirmed tickets.`);

  const itemToNumRequested = await getBulkOrder(intakeRecords);

  const itemToNumOrdered = await getItemToNumAvailable(argv.deliveryDate);

  const allItems = _.union(_.keys(itemToNumRequested), _.keys(itemToNumOrdered));

  const getDiffForItem = (item) => {
    return [item, _.get(itemToNumOrdered, item, 0) - _.get(itemToNumRequested, item, 0)];
  };

  // item => ordered - requested
  const delta = _.fromPairs(
    _.filter(
      _.map(allItems, getDiffForItem),
      ([, diff]) => { return diff !== 0; },
    )
  );

  console.log(`Found ${_.keys(delta).length} items with mismatched quantities.`);

  if (_.keys(delta).length !== 0) {
    console.log('Mismatched Items and Differences (num ordered - num requested)');
    _.forIn(
      delta,
      (diff, item) => {
        console.log(`   - ${item}: ${diff}`);
      },
    );
  }
}

main().then(
  () => console.log('Done.')
).catch(
  (err) => console.log('Error!', { err: err })
);
