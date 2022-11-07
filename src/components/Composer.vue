<script>
export default {
  name: 'Composer',
  props: {
    format: {
      type: String
    },
    flatComposerSongs: {
      type: Array,
      required: false
    },
    composer: {
      type: String,
      required: false
    },
    playerSong: {
      type: String,
      required: false
    },
    playlist: {
      type: Array,
      default: []
    },
    playerTrack: {
      type: Number,
      required: false
    },
    playing: {
      type: Boolean,
      required: false,
      default: false
    },
    search: {
      type: String,
      required: false,
      default: ''
    }
  },
  data() {
    return {
      hover: null,
      selectedSong: null
    }
  },
  computed: {
    filteredSongs() {

      return this.flatComposerSongs.filter(song => {
        return song.toLowerCase().includes(this.search.replaceAll(' ', '_').toLowerCase());
      }).map(song => song.substring(this.composer.length + 1) );

    }
  },
  methods: {
    onSelectSong(song) {
      this.selectedSong = song
    },
    play(song) {
      this.$emit('playSong', this.composer + '/' + song, this.playerTrack, true)
    },
    pause() {
      this.$emit('pauseSong')
    },
    addToPlaylist(song) {
      this.$emit('onAddToPlaylist', this.composer + '/' + song)
    },
    removeFromPlaylist(song) {
      this.$emit('onRemoveFromPlaylist', this.composer + '/' + song)
    },
    isSongInPlaylist(song) {
      return this.playlist.indexOf(this.composer + '/' + song) > -1
    }
  }
}

</script>


<template>
  <div class="artist is-verified" ref="artist">

    <div class="artist__header">
      <div class="artist__info__meta">
        <div class="artist__info__type">Artist</div>

        <div class="artist__info__name">{{ composer.replaceAll('_', ' ') }}</div>
      </div>
    </div>

    <div class="artist__content">
      <div class="tab-content">
        <div role="tabpanel" class="tab-pane active" id="artist-overview">
          <div class="overview">

            <div class="overview__artist">
            </div>

            <div class="overview__albums">
              <div class="overview__albums__head">

              </div>
              <div class="album">
                <div class="album__tracks">

                  <div class="tracks">
                    <div class="tracks__heading">
                      <div class="tracks__heading__number">#</div>
                      <div class="tracks__heading__title">Song</div>
                    </div>
                    <a v-for="(s, index) in filteredSongs"
                       href="#"
                       :key="s"
                       class="track"
                       v-bind:class="{ track__selected: s == selectedSong }"
                       @click.prevent="onSelectSong(s)"
                       @dblclick.prevent="play(s)"
                       @mouseover="hover = s"
                       @mouseleave="hover = null">

                      <div v-if="s != selectedSong"
                          class="track__number">
                        <span v-if="hover==s">
                          <a @click.prevent="play(s)">
                            <i class="material-icons">play_arrow</i>
                          </a>
                        </span>
                        <span v-else>{{ index + 1 }}</span>
                      </div>
                      <div v-else class="track__number">

                        <a v-if="playing && (selectedSong == playerSong)" class="ion-ios-pause" @click.prevent="pause()">
                          <i class="material-icons">pause</i>
                        </a>
                        <a v-else @click.prevent="play(s)">
                          <i class="material-icons">play_arrow</i>
                        </a>

                      </div>
                      <div :class="{ playing__song: s == playerSong }" class="track__title">{{ s.replaceAll('_', ' ').replace(`.${format}`, '') }}</div>

                      <div class="track__added">
                        <a v-if="isSongInPlaylist(s)" @click.prevent="removeFromPlaylist(s)">
                          <i class="material-icons">remove</i>
                        </a>
                        <a v-else @click.prevent="addToPlaylist(s)">
                          <i class="material-icons">add</i>
                        </a>
                      </div>

                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
