let fs = require("fs"),
    path = require("path"),
    walk = require("walk");



generate_list = function(format) {

  const dir = path.join(__dirname, '../public/musics/' + format);
  let songs = [];
  let walker = walk.walk(dir);

  walker.on("file", function(root, fileStats, next) {

    let matcher = new RegExp('\.' + format + '$');

    // 0	sc68/505 - Checkpoint/Atari ST/Bla (EIL Compo 1999).sc68
    if (matcher.test(fileStats.name)) {

      let current_path = root.replace(dir, '').split('/');
      // remove trailing '/'
      current_path.shift();
      let composer = current_path.shift()
      current_path.push(fileStats.name)
      let song = current_path.join('/')

      songs.push(`${fileStats.size}\t${format}/${composer}/${song}`)

    }
    next();
  });


  walker.on("end", function() {

    let file = fs.createWriteStream(path.join(__dirname, '../public/' + format + '.txt'));
    file.on('error', function(err) { console.log('Error while writing ' + format + '.txt: ' + err) });
    songs.forEach(function(song) { file.write(song + '\n'); });
    file.end();
    console.log('Successfully generated ' + format + '.txt')

  });

}


generate_list('sndh')
generate_list('sc68')
generate_list('ahx')

