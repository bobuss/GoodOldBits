<script>
import ComposerList from './components/ComposerList.vue'
import Composer from './components/Composer.vue'
import Player from './components/Player.vue'

import musics from './json/data.json'

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
  name: 'Atarify',
  data () {
    return {
      composers: Object.keys(musics),
      composer: 'Furax',
      song: null,
      player_composer: null,
      player_song: null,
      navHeight: 617,
      artistHeight: 617,
      search: '',
      playing: false
    }
  },
  computed:{
    songs () {
      return musics[this.composer] || null
    },
    computedHeight () {
      return {
        height: this.navHeight + 'px'
      }
    }
  },
  mounted() {
    window.addEventListener('load', this.getHeight);
    window.addEventListener('resize', this.getHeight);
  },
  beforeDestroy() {
    window.removeEventListener('load', this.getHeight);
    window.removeEventListener('resize', this.getHeight);
  },
  components: {
    ComposerList,
    Composer,
    Player
  },
  methods: {
    onSelectComposer (composer) {
      this.composer = composer
      this.song = null;
    },
    onSelectSong (song) {
      this.song = song;
    },
    getHeight() {
      const totalHeight = window.innerHeight;
      const headerHeight = this.$refs.header.clientHeight;
      const footerHeight = this.$refs.player.$refs.currentTrack.clientHeight;
      const playlistHeight = 0;
      const nowPlaying = 0; //this.$refs.song.$refs.playing.clientHeight;

      this.navHeight = totalHeight - (headerHeight + footerHeight + playlistHeight + nowPlaying);
      this.artistHeight = totalHeight - (headerHeight + footerHeight);
    },
    play: function(composer, song) {
      this.player_composer = composer;
      this.player_song = song;
      if (this.playing) {
        ScriptNodePlayer.getInstance().pause();
        this.playing = false
      } else {
        var p= ScriptNodePlayer.getInstance();
        if (p.isReady()) {
          p.loadMusicFromURL(
            'musics/' + this.player_composer + '/' + this.player_song,
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
  <section class="header" ref="header">
    <div class="search">
      <input name="search" type="text" placeholder="Search" v-model="search" />
    </div>
  </section>
  <section class="content">
    <div class="content__left">

      <section class="navigation" ref="navigation" v-bind:style="computedHeight">
        <ComposerList :composers="composers"
                      :search="search"
                      @select-composer="onSelectComposer" />
      </section>

    </div>

    <div class="content__middle">

      <Composer :composer="composer"
                :songs="songs"
                @select-song="onSelectSong"
                @play-song="play"
                ref="composer"
                v-bind:style="computedHeight" />

    </div>
  </section>


  <Player :composer="player_composer"
          :song="player_song"
          @play-song="play"
          ref="player"/>


</template>


