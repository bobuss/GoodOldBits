<script>
function doOnTrackEnd(){
	//if (playerControls) playerControls.playNextSong();
}
function doOnTrackReadyToPlay(){
	ScriptNodePlayer.getInstance().play();
	//songDisplay.redrawSongInfo();
}
function doOnPlayerReady() {
	//if (playerControls) playerControls.playNextSong();
}
function doOnUpdate(){} // unused

var basePath= '';		// not needed here

ScriptNodePlayer.createInstance(
  new SC68BackendAdapter(),
  basePath,
  [],
  true,
  doOnPlayerReady,
  doOnTrackReadyToPlay,
  doOnTrackEnd,
  doOnUpdate
);


export default {
  name: 'Player',
  data () {
    return {
      //song: this.song,
      //composer: this.composer,
      playing: false
    }
  },
  props: {
    composer: {
      type: String,
      required: false
    },
    song: {
      type: String,
      required: false
    }
  },
  methods: {

    play: function() {
      if (this.playing) {
        ScriptNodePlayer.getInstance().pause();
        this.playing = false
      } else {
        var p= ScriptNodePlayer.getInstance();
        if (p.isReady()) {
          p.loadMusicFromURL(
            'musics/' + this.composer + '/' + this.song,
            new Object(),
            (function(filename){}),
            (function(){}),
            (function(total, loaded){})
          );
          this.playing = true
        }
      }
    },
    pause: function() {


    },
	  setVolume: function(value) {
      ScriptNodePlayer.getInstance().setVolume(value);
    },
	  getSongInfo: function () {
      return ScriptNodePlayer.getInstance().getSongInfo();
    },
  }
}
</script>


<template>
  <section class="current-track" ref="currentTrack">
    <div class="current-track__actions">
      <a class="ion-ios-skipbackward"></a>
      <a class="ion-ios-play play" @click.prevent="play()"></a>
      <a class="ion-ios-skipforward"></a>
    </div>
    <div class="current-track__progress">
      <div class="current-track__progress__start">0:01</div>
      <div class="current-track__progress__bar">
        <div id="song-progress"></div>
      </div>
      <div class="current-track__progress__finish">3:07</div>
    </div>
    <div class="current-track__options">
      <a href="#" class="lyrics">Lyrics</a>
      <span class="controls">
        <a href="#" class="control">
          <i class="ion-navicon"></i>
        </a>
        <a href="#" class="control">
          <i class="ion-shuffle"></i>
        </a>
        <a href="#" class="control">
          <i class="fa fa-refresh"></i>
        </a>
        <a href="#" class="control devices">
          <i class="ion-iphone"></i>
          <span>Devices Available</span>
        </a>
        <a href="#" class="control volume">
          <i class="ion-volume-high"></i>
          <div id="song-volume"></div>
        </a>
      </span>
    </div>
  </section>
</template>
