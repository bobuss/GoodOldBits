const events = require('events');
const fs = require('fs');
const readline = require('readline');
const path = require('path');



(async function processLineByLine() {

  const trackers = {};

  try {
    let cpt = 0
    const rl = readline.createInterface({
      input: fs.createReadStream(path.resolve(__dirname, 'allmods.txt')),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      cpt++;

      const items = line.split('\t')

      if (items.length == 2) {

        const tokens = items[1].split('/')
        const tracker = tokens.shift()
        const composer = tokens.shift()
        const song = tokens.join('/')

        if (trackers[tracker] == undefined) {
          trackers[tracker] = []
        }

        trackers[tracker].push({
          'tracker': tracker,
          'composer': composer,
          'song': song,
          'size': items[0]
        })

      } else {

        console.error('Problem with:')
        console.error(' . ' + line)

      }

    });

    await events.once(rl, 'close');

    console.log('Read about ' + cpt + ' lines')

    for (let tracker in trackers) {

      fs.writeFileSync(path.resolve(__dirname, '../src/json/allmods/' + tracker + '.json'), JSON.stringify(trackers[tracker], null, '  '));
      console.log('JSON generated for ' + tracker + ' collection');

    }

    //Write a big json for playing with crossfilter
    const collection = Object.values(trackers).reduce((acc, key) => {return acc.concat(key)}, [])
    fs.writeFileSync(path.resolve(__dirname, '../src/json/allmods.json'), JSON.stringify(collection, null, '  '));
    console.log('JSON generated for the whoe collection');


    console.log('Reading file line by line with readline done.');
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
  } catch (err) {
    console.error(err);
  }
})();
