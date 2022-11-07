<script>
export default {
  name: 'Playlist',
  props: {
    format: {
      type: String
    },
    playlist: {
      type: Array,
      default: []
    },
    playerPath: {
      type: String
    },
    songInfo: {
      type: Object,
      default: {
        numberOfTracks: 1
      }
    },
    playerTrack: {
      type: Number
    },
    playing: {
      type: Boolean,
      required: false,
      default: false
    },
    songInfo: {
      type: Object,
      default: {
        numberOfTracks: 1
      }
    }
  },
  data() {
    return {
      hover: null,
      selectedSong: null
    }
  },
  computed: {
    listOfSongs() {
      return this.playlist.map( function(path) {
        var arr = path.split('/')
        return {
          'path': path,
          'composer': arr[0],
          'title': arr.slice(1).join('/')
        }
      })
    }
  },
  methods: {
    onSelectSong(song) {
      this.selectedSong = song
    },
    play(path) {
      this.$emit('playSong', path)
    },
    pause() {
      console.log('pause')
      this.$emit('pauseSong')
    },
    removeFromPlaylist(path) {
      this.$emit('onRemoveFromPlaylist', path)
    }
  }
}
</script>

<template>

  <div class="artist__content">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="artist-overview">
        <div class="overview">

          <div class="overview__albums">
            <div class="overview__albums__head">
              <h1>Playlist</h1>
            </div>
            <div class="album">
              <div class="album__tracks">

                <div class="tracks">
                  <div class="tracks__heading">
                    <div class="tracks__heading__number">#</div>
                    <div class="tracks__heading__title">Song</div>
                  </div>
                  <div class="tracks">


                    <a v-for="(s, index) in listOfSongs"
                       href="#"
                       :key="s.path"
                       class="track"
                       v-bind:class="{ track__selected: s.path == selectedSong }"
                       @click.prevent="onSelectSong(s.path)"
                       @dblclick.prevent="play(s.path)"
                       @mouseover="hover = s.path"
                       @mouseleave="hover = null">

                      <div v-if="s.path != selectedSong"
                          class="track__number">
                        <span v-if="hover==s.path">
                          <a @click.prevent="play(s.path)">
                            <i class="material-icons">play_arrow</i>
                          </a>
                        </span>
                        <span v-else>{{ index + 1 }}</span>
                      </div>
                      <div v-else class="track__number">

                        <a v-if="playing && (selectedSong == playerPath)" class="ion-ios-pause" @click.prevent="pause()">
                          <i class="material-icons">pause</i>
                        </a>
                        <a v-else @click.prevent="play(s.path)">
                          <i class="material-icons">play_arrow</i>
                        </a>

                      </div>

                      <div :class="{ playing__song: s.path == playerPath }" class="track__title">
                        <span class="title">{{ s.title.replaceAll('_', ' ').replace(`.${format}`, '') }}</span>
                        <span class="composer">{{ s.composer.replaceAll('_', ' ') }}</span>
                      </div>

                      <div class="track__added">
                        <a @click.prevent="removeFromPlaylist(s.path)">
                          <i class="material-icons">remove</i>
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

