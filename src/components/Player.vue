<script>

export default {
  name: 'Player',
  props: {
    composer: {
      type: String,
      required: false,
      default: null
    },
    song: {
      type: String,
      required: false,
      default: null
    },
    playing: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  methods: {
    play() {
      this.$emit('play-song', this.composer, this.song)
    },
    pause() {
      this.$emit('pause-song')
    }
  }
}
</script>


<template>
  <section class="current-track" ref="currentTrack">
    <section class="playing" ref="playing">
      <div v-if="song" class="playing__song">
        <a class="playing__song__name">{{ song.replace('_', ' ').replace('.sndh', '') }}</a>
        <a class="playing__song__artist">{{ composer.replace('_', ' ') }}</a>
      </div>
    </section>
    <div class="current-track__player">
      <div class="current-track__actions">

        <a href="#">
          <i class="material-icons">shuffle</i>
        </a>

        <a href="#">
          <i class="material-icons">skip_previous</i>
        </a>

        <a v-if="playing" @click.prevent="pause()">
          <i class="material-icons">pause_circle_filled</i>
        </a>
        <a v-else @click.prevent="play()">
          <i class="material-icons">play_circle_filled</i>
        </a>

        <a href="#">
          <i class="material-icons">skip_next</i>
        </a>

        <a href="#">
          <i class="material-icons">repeat</i>
        </a>
      </div>


    </div>

    <div class="current-track__options">
      <span class="controls">
        <a href="#" class="control volume">
            <i class="material-icons">volume_up</i>
          <div id="song-volume"></div>
        </a>
      </span>
    </div>
  </section>
</template>
