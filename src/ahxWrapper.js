var player;
var ahxSong;

function getPlayer() {
  if (player == null) {
    player = AHXMaster()
  }
  return player;
}


function loadMusicFromURL(url, options, onCompletion, onFail, onProgress) {

  ahxSong = new AHXSong();

  ahxSong.LoadSong(url, function() {
    getPlayer().Play(ahxSong);
  });

}

function pause() {
  getPlayer().Pause()
}

function resume() {
  getPlayer().Resume();
}

function setVolume(value) {
  getPlayer().setVolume(value)
}

function getSongInfo() {
  return {
    numberOfTracks: 1
  }
}




export default {
  loadMusicFromURL: loadMusicFromURL,
  pause: pause,
  resume: resume,
  getSongInfo: getSongInfo,
  setVolume: setVolume
}
