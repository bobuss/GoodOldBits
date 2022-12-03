

function getPlayer() {

  const player = ScriptNodePlayer.getInstance();

  if (!(player._backendAdapter instanceof XMPBackendAdapter)) {
    player._backendAdapter = new XMPBackendAdapter();
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

function getMaxPlaybackPosition() {
  return getPlayer().getMaxPlaybackPosition()
}

function getPlaybackPosition(){
  return getPlayer().getPlaybackPosition()
}

function seekPlaybackPosition(pos) {
  return getPlayer().seekPlaybackPosition(pos)
}




export default {
  loadMusicFromURL: loadMusicFromURL,
  pause: pause,
  resume: resume,
  getSongInfo: getSongInfo,
  setVolume: setVolume,
  getMaxPlaybackPosition: getMaxPlaybackPosition,
  getPlaybackPosition: getPlaybackPosition,
  seekPlaybackPosition: seekPlaybackPosition
}
