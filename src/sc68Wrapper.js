
function getPlayer() {

  const player = ScriptNodePlayer.getInstance();

  if (!(player._backendAdapter instanceof SC68BackendAdapter)) {
    player._backendAdapter = new SC68BackendAdapter();
	  player._backendAdapter.setObserver(player);
  }

  return player;
}


function loadMusicFromURL(url, options, onCompletion, onFail, onProgress) {
  return getPlayer().loadMusicFromURL(url, options, onCompletion, onFail, onProgress)
}

function pause() {
  return getPlayer().pause()
}

function resume() {
  return getPlayer().resume();
}

function setVolume(value) {
  return getPlayer().setVolume(value)
}

function getSongInfo() {
  return getPlayer().getSongInfo()
}




export default {
  loadMusicFromURL: loadMusicFromURL,
  pause: pause,
  resume: resume,
  getSongInfo: getSongInfo,
  setVolume: setVolume
}
