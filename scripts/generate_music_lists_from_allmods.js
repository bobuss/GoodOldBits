const events = require('events');
const fs = require('fs');
const readline = require('readline');
const path = require('path');



(async function processLineByLine() {

  let trackers = {};

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

        if (!(tracker in trackers)) {
          trackers[tracker] = {}
        }

        try {
          trackers[tracker][composer].push(song)
        } catch {
          trackers[tracker][composer] = [song]
        }

      } else {

        console.error('Problem with:')
        console.error(' . ' + line)

      }

    });

    await events.once(rl, 'close');

    console.log('Read about ' + cpt + ' lines')

    for (const tracker in trackers) {

      // sort songs
      const sorted_songs = Object.keys(trackers[tracker]).sort().reduce(
        (obj, key) => {
          obj[key] = trackers[tracker][key];
          return obj;
        },
        {}
      );

      fs.writeFileSync(path.resolve(__dirname, '../src/json/allmods/' + tracker + '.json'), JSON.stringify(sorted_songs, null, '  '));
      console.log('JSON generated for ' + tracker + ' collection');

    }

    console.log('Reading file line by line with readline done.');
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
  } catch (err) {
    console.error(err);
  }
})();
