var fs = require("fs"),
    path = require("path"),
    walk = require("walk");



generate_json = function(format) {

  const dir = path.join(__dirname, '../public/musics/' + format);
  var songs = {};
  var walker = walk.walk(dir);

  walker.on("file", function(root, fileStats, next) {

    var matcher = new RegExp('\.' + format + '$');

    if (matcher.test(fileStats.name)) {

      var current_path = root.replace(dir, '').split('/');
      // remove trailing '/'
      current_path.shift();
      var current_composer = current_path.shift()
      current_path.push(fileStats.name)
      var current_song = current_path.join('/')

      try {
        songs[current_composer].push(current_song)
      }
      catch {
        songs[current_composer] = [current_song]
      }

    }
    next();
  });


  walker.on("end", function() {

    // sort songs
    const sorted_songs = Object.keys(songs).sort().reduce(
      (obj, key) => {
        obj[key] = songs[key];
        return obj;
      },
      {}
    );

    fs.writeFile(path.resolve(__dirname, '../src/json/' + format + '.json'), JSON.stringify(sorted_songs, null, '  '), function (err) {
        if (err) {
            throw err;
        } else {
          console.log('JSON generated for ' + format + ' collection')
        }
    });
  });

}


generate_json('ym')
generate_json('sndh')
generate_json('sc68')
generate_json('ahx')

