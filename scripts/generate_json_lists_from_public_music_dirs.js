var fs = require("fs"),
    path = require("path"),
    walk = require("walk");



generate_json = function(format) {

  const dir = path.join(__dirname, '../public/musics/' + format);
  var songs = [];
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

      songs.push({
        'tracker': format,
        'composer': current_composer,
        'song': current_song,
        'size': fileStats.size
      })

    }
    next();
  });


  walker.on("end", function() {

    fs.writeFile(path.resolve(__dirname, '../src/json/local/' + format + '.json'), JSON.stringify(songs, null, '  '), function (err) {
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

