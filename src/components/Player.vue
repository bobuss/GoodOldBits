<script>

export default {
  name: 'Player',
  props: {
    composer: {
      type: String,
      required: false,
      default: null
    },
    playlist: {
      type: Array,
      required: false,
      default: []
    },
    song: {
      type: String,
      required: false,
      default: null
    },
    track: {
      type: Number,
      required: false,
      default: 0
    },
    songInfo: {
      type: Object,
      default: {
        numberOfTracks: 1
      }
    },
    playing: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  methods: {
    play() {
      this.$emit('playSong', this.composer, this.song, this.track)
    },
    pause() {
      this.$emit('pauseSong')
    },
    nextSong() {
      this.$emit('nextSong')
    },
    previousSong() {
      this.$emit('previousSong')
    },
    nextTrack() {
      this.$emit('nextTrack')
    },
    previousTrack() {
      this.$emit('previousTrack')
    },
    changeVolume(v) {
      console.log(v);
      this.$emit('changeVolume', v);
    }
  }
}
</script>


<template>
  <section class="current-track" ref="currentTrack">
    <section class="playing" ref="playing">
      <div v-if="song" class="playing__song">
        <a class="playing__song__name">{{ song.replaceAll('_', ' ').replace('.sndh', '') }}</a>
        <a class="playing__song__artist">{{ composer.replaceAll('_', ' ') }}</a>
      </div>
    </section>
    <div class="current-track__player">
      <div class="current-track__actions">

        <a>
          <i class="material-icons">shuffle</i>
        </a>

        <a @click.prevent="previousSong()">
          <i class="material-icons">skip_previous</i>
        </a>

        <a v-if="playing" @click.prevent="pause()">
          <i class="material-icons">pause_circle_filled</i>
        </a>
        <a v-else @click.prevent="play()">
          <i class="material-icons">play_circle_filled</i>
        </a>

        <a @click.prevent="nextSong()">
          <i class="material-icons">skip_next</i>
        </a>

        <a>
          <i class="material-icons">repeat</i>
        </a>
      </div>


    </div>

    <div class="current-track__options">
      <span class="controls">
        <a @click.prevent="previousTrack()">
          <i class="material-icons">navigate_before</i>
        </a>
        <a class="control devices">Track: {{track + 1}}/{{songInfo.numberOfTracks}}</a>
        <a @click.prevent="nextTrack()">
          <i class="material-icons">navigate_next</i>
        </a>

        <a class="control volume">
            <i class="material-icons">volume_up</i>
          <div id="song-volume">
            <input type="range" min="0" max="1" value="1" step="0.1" @change="changeVolume($event.target.value)">
          </div>
        </a>
      </span>
    </div>
  </section>
</template>
