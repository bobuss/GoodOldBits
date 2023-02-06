<script>
import { LegacyPlayer } from './legacy-player.js'

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const MODLAND_AVAILABLE_FORMATS = [
    "Protracker",
    "Screamtracker 3",
    "Fasttracker 2",
    "Impulsetracker",
    "OpenMPT MPTM",
    "Composer 669",
    "Asylum",
    "Extreme Tracker",
    "Digibooster Pro",
    "Digibooster",
    "X-Tracker",
    "Digital Sound Interface Kit",
    "Digital Symphony",
    "Digital Tracker DTM",
    "Farandole Composer",
    "FM Tracker",
    "General DigiMusic",
    "Imago Orpheus",
    "Digitrakker",
    "OctaMED MMD0",
    "OctaMED MMD1",
    "OctaMED MMD2",
    "OctaMED MMD3",
    "OctaMED MMDC",
    "MO3",
    "Mad Tracker 2",
    "Multitracker",
    "Oktalyzer",
    "Epic Megagames MASI",
    "Disorder Tracker 2",
    "ProTracker 3.6 IFF",
    "Polytracker",
    "MultiMedia Sound",
    "SoundFX",
    "Screamtracker 2",
    "Soundtracker Pro II",
    "Symphonie",
    "Ultratracker",
    "SNDH",
    "SC68",
    "AHX"
]

const LOCAL_AVAILABLE_FORMATS = [
    "sndh",
    "sc68",
    "ahx"
]


export default {
    name: 'Player',
    data() {
        return {
            player: null,
            route: '/',
            init: false,
            selectedComposer: '',
            playerComposer: null,
            playerSong: null,
            playerFormat: null,
            playerTrack: 1,
            songInfo: { numberOfTracks: 1 },
            search: '',
            playing: false,
            queue: [],
            hover: null,
            selectedSong: null,
            sbActive: false,
            sbVisible: false,
            vVisible: false,
            volume: 0.5,
            modland_enabled_formats: ['SNDH', 'Impulsetracker', 'Fasttracker 2', "Protracker", "Screamtracker 3"],
            local_enabled_formats: ['ahx', 'sc68'],
            composerSongs: {},
            flatSongs: [],
            scrollElements: 76,
            delta: 29,
            scrollFactor: 0
        }
    },
    watch: {
        volume() {
            this.setVolume()
        },

        queue: {
            deep: true,
            handler(newQueue) {
                localStorage.queue = newQueue
            }
        }
    },
    computed: {

        searches() {
            return this.search.toLowerCase().split(' ');
        },

        filteredSongs() {
            const filteredSongs = []

            this.flatSongs.forEach(song => {
                let res = true

                this.searches.forEach(search => {
                    if (song.toLowerCase().indexOf(search) != -1) {
                        res = res && true
                    } else {
                        res = res && false
                    }
                })

                if (res) {
                    filteredSongs.push(song)
                }
            })
            return filteredSongs
        },

        facetedComposers() {
            // count the number of matching songs and group by author
            const groupByComposer = {}

            this.filteredSongs.forEach(song => {
                const category = song.split('/').slice(0, 2).join('/')
                groupByComposer[category] = groupByComposer[category] ?? 0;
                groupByComposer[category]++
            })

            return groupByComposer
        },

        facetedComposersCount() {
            return Object.keys(this.facetedComposers).length
        },

        filteredComposerSongs() {
            const searches = this.search.toLowerCase().split(' ');

            return this.flatComposerSongs.filter(song => {
                return searches.map(search => song.toLowerCase().includes(search)).reduce((acc, key) => {
                    return acc && key
                }, true)
            }).map(song => song.substring(this.selectedComposer.length + 1))
        },

        playerPath() {
            return this.playerComposer + '/' + this.playerSong;
        },

        musicPath() {

            if (LOCAL_AVAILABLE_FORMATS.indexOf(this.playerFormat) != -1)
                return 'musics/' + encodeURIComponent(this.playerPath)
            else
                return 'https://modland.com/pub/modules/' + encodeURIComponent(this.playerPath)

        },

        flatComposerSongs() {
            if (this.selectedComposer in this.composerSongs) {
                return this.composerSongs[this.selectedComposer].map(song => this.selectedComposer + '/' + song)
            }
            return []
        },

        listOfSongsInQueue() {
            return this.queue.map(function (path) {
                var arr = path.split('/')
                return {
                    'path': path,
                    'composer': arr.slice(0, 2).join('/'),
                    'title': arr.slice(2).join('/')
                }
            })
        },

        rowHeight() {
            return 31
        },

        realRowNr() {
            return 76
        },

        startIdx() {
            return Math.max(0, Math.min(Math.floor(this.scrollFactor / this.delta) * this.delta, this.facetedComposersCount - this.scrollElements))
        },

        endIdx() {
            let x = this.startIdx + this.scrollElements
            if (x < this.facetedComposersCount)
                return x
            else
                return this.facetedComposersCount
        },

        topFiller() {
            return this.startIdx * this.rowHeight
        },

        bottomFiller() {
            return (this.facetedComposersCount - this.endIdx) * this.rowHeight;
        },

        sliceOfFacetedComposers() {

            if (this.facetedComposers) {
                //return this.facetedComposers
                const res = {}
                for (let x of Object.keys(this.facetedComposers).slice(this.startIdx, this.endIdx)) {
                    res[x] = this.facetedComposers[x]
                }
                return res
            } else
                return {}
        }
    },


    updated() {
        this.initDisplay();
    },

    async mounted() {

        this.player = new LegacyPlayer(audioContext)

        if (this.modland_enabled_formats.length >= 0) {
            await this.buildSongListFromFile('modland', this.modland_enabled_formats)
        }

        for (const format of this.local_enabled_formats) {
            await this.buildSongListFromFile(format, [format])
        };

        // sort the list by author
        this.flatSongs.sort(function (a, b) {
            return a.split('/')[1].toLowerCase() < b.split('/')[1].toLowerCase() ? -1 : 1
        })


        // Set Hooks
        const self = this
        // onTrackEnd
        this.player.onTrackEnd = function () {
            console.log('Player.vue onTrackEnd')
            self.nextSong()
        };

        // onSongInfoUpdated
        this.player.onSongInfoUpdated = function () {
            self.songInfo = this.songInfo
        };

        // this.player.reset() ?
        if (localStorage.queue) {
            let potential_songs = localStorage.queue.split(',')
            this.queue = this.flatSongs.filter(x => potential_songs.includes(x));
            localStorage.queue = this.queue
        }
        this.setupEvents();
        this.updateHeight();
        this.applyRoute(window.location.hash, true);
        this.initDisplay();
    },

    beforeDestroy() {
        console.log('beforeDestroy')
        this.player.pause();
        this.player = null;
    },

    methods: {

        async buildSongListFromFile(filename, enabled_formats) {

            await fetch(`${filename}.txt`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(response.status);
                    }
                    return response.text();
                })
                .then(lines => {

                    const start = Date.now()

                    const stats = {}

                    lines.split('\n').forEach(line => {
                        const s = line.split('\t')
                        const size = s[0]
                        const path = s[1]
                        if (path !== undefined) {
                            const arr = path.split('/')
                            const format = arr[0]
                            const composer = arr.slice(0, 2).join('/')
                            const song = arr.slice(2).join('/')

                            if (stats[format] === undefined) {
                                stats[format] = 1
                            } else {
                                stats[format]++
                            }

                            if (enabled_formats.indexOf(format) != -1) {

                                this.flatSongs.push(s[1]);
                                if (composer in this.composerSongs) {
                                    this.composerSongs[composer].push(song)
                                } else {
                                    this.composerSongs[composer] = [song]
                                }
                            }
                        }
                    });

                    console.log(`buildSongsList(${filename}.txt): ${Date.now() - start} ms`);
                });
        },

        onSelectSong(song) {
            this.selectedSong = song
        },

        onSelectComposer(composer, scroll = false) {
            this.toggleQueue(false)
            this.selectedComposer = composer
            const element = document.getElementById("nav_c_" + composer);
            if (scroll && element) element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        },

        play: function (composer_song, track = 1) {

            var arr = composer_song.split('/')
            var format = arr[0]
            var composer = arr.slice(0, 2).join('/')
            var song = arr.slice(2).join('/')

            if (composer && song) {

                if ((this.playerFormat == format) && (this.playerComposer == composer) && (this.playerSong == song) && (this.playerTrack == track)) {
                    this.player.play();
                    this.playing = true
                } else {
                    // different song, let's reset the track number
                    if ((this.playerFormat != format) || (this.playerComposer != composer) || (this.playerSong != song)) {
                        track = 1;
                    }

                    this.setRoute(composer + '/' + song + '/' + track);

                }
            }
        },

        pause: function () {
            this.player.pause();
            this.playing = false;
        },

        resume: function () {
            if ((this.playerComposer) && (this.playerSong) && (this.playerTrack)) {
                this.player.resume();
                this.playing = true;
            }
        },

        togglePlay() {
            if (this.playing) {
                this.pause()
            } else {
                this.resume()
            }
        },

        setVolume: function () {
            this.player.setVolume(this.volume);
        },

        isSongInQueue(song) {
            return this.queue.indexOf(this.selectedComposer + '/' + song) > -1
        },

        nextSong: function () {
            if (this.playerSong) {
                let index = this.queue.indexOf(this.playerPath);
                if (index != -1 && index < this.queue.length - 1) {
                    this.play(this.queue[++index]);
                }
            }
        },

        previousSong: function () {
            if (this.playerSong) {
                let index = this.queue.indexOf(this.playerPath);
                if (index != -1 && index > 0) {
                    this.play(this.queue[--index]);
                }
            }
        },

        nextTrack: function () {
            if (this.playerTrack < this.songInfo.numberOfTracks) {
                this.play(this.playerPath, this.playerTrack + 1);
            }
        },

        previousTrack: function () {
            if (this.playerTrack > 1) {
                this.play(this.playerPath, this.playerTrack - 1);
            }
        },

        clearSearch() {
            this.search = '';
        },

        addToQueue(song) {
            this.queue.push(song)
            // if it was the 1st element, then load the player
            if (this.queue.length == 1) {
                var arr = song.split('/')
                this.playerComposer = arr.slice(0, 2).join('/');
                this.playerSong = arr.slice(2).join('/');
                this.playerTrack = 0
            }
        },

        removeFromQueue(song) {
            const index = this.queue.indexOf(song);
            if (index > -1) {
                this.queue.splice(index, 1);
            }
        },

        isLoadedInPlayer(composer, song) {
            return (this.playerComposer == composer) && (this.playerSong == song);
        },

        setCssHeight(elm, height) {
            elm.style.setProperty('--height', `${height}px`);
        },

        setupEvents() {
            document.addEventListener('visibilitychange', e => { this.visible = (document.visibilityState === 'visible') });
            window.addEventListener('hashchange', e => this.applyRoute(window.location.hash));
            window.addEventListener('keydown', this.onKeyboard);
            document.addEventListener('click', this.handleVolumeDisplay);
            document.querySelector('#scrollArea').addEventListener('scroll', this.scrollEv);
        },

        setRoute(route) {
            route = '/' + String(route || '').replace(/^[\#\/]+|[\/]+$/g, '').trim();
            window.location.hash = route;
            this.route = route;
        },

        async applyRoute(route, init = false) {

            function isPositiveInteger(str) {
                if (typeof str !== 'string') {
                    return false;
                }
                const num = Number(str);
                if (Number.isInteger(num) && num > 0) {
                    return true;
                }
                return false;
            }

            const data = String(route || '').replace(/^[\#\/]+|[\/]+$/g, '').trim().split('/');

            if (data.length >= 4) {
                // save to compare
                const oldMusicPath = this.musicPath;
                this.playerFormat = decodeURIComponent(data[0])
                this.playerComposer = decodeURIComponent(data.slice(0, 2).join('/'))
                const oldPlayerTrack = this.playerTrack;
                this.playerTrack = data.pop()
                if (isPositiveInteger(this.playerTrack)) {
                    this.playerTrack = parseInt(this.playerTrack)
                } else {
                    this.playerTrack = 1;
                }
                this.playerSong = decodeURIComponent(data.slice(2).join('/'))


                // pause current player if needed
                if (this.player) this.player.pause()
                this.setVolume();

                if (oldMusicPath == this.musicPath && oldPlayerTrack != this.playerTrack) {
                    // just a track change
                    this.player.setTrack(this.playerTrack)
                    this.player.play()
                } else {
                    try {
                        // That's where we acutally load the music
                        await this.player.load(this.musicPath, { 'track': this.playerTrack })
                        this.player.play()
                    } catch (error) {
                        console.error(error)
                    }
                }

                if (init) {
                    this.onSelectComposer(this.playerComposer, true)
                    this.playing = false
                } else {
                    this.playing = true
                }

                if (this.queue.indexOf(this.playerPath) == -1)
                    this.queue.unshift(this.playerPath);

            }
        },

        // on keyboard events
        onKeyboard(e) {
            if (e.target.nodeName == 'INPUT') {
                return
            }
            const k = e.key || '';
            if (k === ' ') {
                e.preventDefault();
                return this.togglePlay();
            }
            // if ( k === 'Enter' ) return this.toggleQueue( true );
            // if ( k === 'Escape' ) return this.toggleQueue( false );
        },

        updateHeight() {
            let root = document.querySelector(':root');
            this.setCssHeight(root, window.innerHeight);
            window.addEventListener('resize', e => this.setCssHeight(root, window.innerHeight));
        },

        initDisplay() {
            setTimeout(() => {
                document.querySelector('#player-wrap').style.opacity = '1';
                this.init = true;
            }, 100);
        },

        toggleQueue(state) {
            const currentstate = typeof state == 'boolean' ? state : !this.sbActive;
            if (currentstate) {
                this.sbActive = true;
                this.sbVisible = true;
            } else {
                this.sbVisible = false;
                setTimeout(() => { this.sbActive = false; }, 500);
            }
        },

        toggleVolumeBar(state) {
            const nextState = typeof state == 'boolean' ? state : !this.vVisible;
            this.vVisible = nextState
        },

        handleVolumeDisplay(event) {
            event.preventDefault();
            const box = document.querySelector('.volume');
            if (this.vVisible && !box.contains(event.target)) {
                this.vVisible = false;
            }
        },

        displaySong(song) {
            //var re = new RegExp(this.formats.map(x => `.${x}`).join("|"), 'gi');
            //return song.replace(re, matched => '').replaceAll('_', ' ');
            return song
        },

        displayComposer(composer) {
            const comp_format = composer.split('/').reverse().map(x => x.replaceAll('_', ' '))
            return comp_format[0] + ' [' + comp_format[1] + ']'
        },

        scrollEv(e) {
            let maxHeight = this.facetedComposersCount * this.rowHeight;
            this.scrollFactor = e.target.scrollTop * (this.facetedComposersCount - this.scrollElements) / (maxHeight - this.scrollElements * this.rowHeight)
        }

    }
}
</script>


<template>

    <main id="player-wrap" class="player-wrap" style="opacity: 0;">

        <section class="player-layout">

            <header class="header">
                <div class="search">
                    <input name="search" type="text" required placeholder="Search" v-model.lazy="search" />
                    <i class="material-icons clear-icon" @click.lazy="clearSearch()">clear</i>
                </div>

                <div>
                    <span>{{ facetedComposersCount }} composers, {{ filteredSongs.length }} songs</span>
                </div>

                <div class="user">
                    <a href="https://github.com/bobuss/atari_player" target="_blank">
                        <img src="@/assets/github.png" />
                    </a>
                </div>

            </header>
            <main class="content">

                <div class="content__middle">
                    <!-- COMPOSER LIST -->
                    <section class="navigation" id="scrollArea">

                        <div class="navigation__list">
                            <a class="scrollFiller" :style="{ height: topFiller + 'px' }"></a>

                            <a v-for="(count, composer) in sliceOfFacetedComposers" :id="'nav_c_' + composer"
                                :ref="composer" :key="composer" href="#" class="navigation__list__item"
                                :class="{ navigation__list__item__selected: composer == selectedComposer }"
                                @click.prevent="onSelectComposer(composer)">

                                <span :class="{ playing: composer == playerComposer }">{{ displayComposer(composer) }}
                                    ({{
                                        count
                                    }})</span>
                            </a>

                            <a class="scrollFiller" :style="{ height: bottomFiller + 'px' }"></a>
                        </div>
                    </section>
                    <!-- END COMPOSER LIST -->
                </div>

                <div class="content__right">

                    <!-- SONG LIST -->
                    <div class="artist" ref="artist">

                        <div class="artist__header">
                            <div class="artist__info__name">{{ displayComposer(selectedComposer) }}</div>
                        </div>

                        <div class="artist__content">

                            <div class="overview">

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
                                                <a v-for="(s, index) in filteredComposerSongs" href="#" :key="s"
                                                    class="track"
                                                    :class="{ track__selected: s == selectedSong && selectedComposer == playerComposer }"
                                                    @click.prevent="onSelectSong(s)"
                                                    @dblclick.prevent="play(selectedComposer + '/' + s, playerTrack, true)"
                                                    @mouseover="hover = s" @mouseleave="hover = null">

                                                    <div v-if="s != selectedSong || selectedComposer != playerComposer"
                                                        class="track__number">
                                                        <span v-if="hover == s">

                                                            <a v-if="playing && (s == playerSong)"
                                                                @click.prevent="pause()">
                                                                <i class="material-icons">pause_arrow</i>
                                                            </a>

                                                            <a v-else
                                                                @click.prevent="play(selectedComposer + '/' + s, playerTrack)">
                                                                <i class="material-icons">play_arrow</i>
                                                            </a>

                                                        </span>

                                                        <span v-else>{{ index + 1 }}</span>

                                                    </div>
                                                    <div v-else class="track__number">

                                                        <a v-if="playing && (s == playerSong)" class="ion-ios-pause"
                                                            @click.prevent="pause()">
                                                            <i class="material-icons">pause</i>
                                                        </a>
                                                        <a v-else
                                                            @click.prevent="play(selectedComposer + '/' + s, playerTrack)">
                                                            <i class="material-icons">play_arrow</i>
                                                        </a>

                                                    </div>
                                                    <div :class="{ playing: s == playerSong && selectedComposer == playerComposer }"
                                                        class="track__title">{{
                                                            displaySong(s)
                                                        }}</div>

                                                    <div class="track__added">
                                                        <a v-if="isSongInQueue(s)"
                                                            @click.prevent="removeFromQueue(selectedComposer + '/' + s)">
                                                            <i class="material-icons">remove_from_queue</i>
                                                        </a>
                                                        <a v-else
                                                            @click.prevent="addToQueue(selectedComposer + '/' + s)">
                                                            <i class="material-icons">add_to_queue</i>
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
                    <!-- END SONG LIST -->


                    <!-- QUEUE -->
                    <div class="queue" :class="{ 'active': sbActive, 'visible': sbVisible }">

                        <aside class="artist__content">

                            <div class="overview">

                                <div class="overview__albums">
                                    <div class="overview__albums__head">
                                        <h1>Queue</h1>
                                    </div>
                                    <div class="album">
                                        <div class="album__tracks">

                                            <div class="tracks">
                                                <div class="tracks__heading">
                                                    <div class="tracks__heading__number">#</div>
                                                    <div class="tracks__heading__title">Song</div>
                                                </div>
                                                <div class="tracks">


                                                    <a v-for="(s, index) in listOfSongsInQueue" href="#" :key="s.path"
                                                        class="track"
                                                        :class="{ track__selected: s.path == selectedSong }"
                                                        @click.prevent="onSelectSong(s.path)"
                                                        @dblclick.prevent="play(s.path)" @mouseover="hover = s.path"
                                                        @mouseleave="hover = null">

                                                        <div v-if="s.path != selectedSong" class="track__number">
                                                            <span v-if="hover == s.path">

                                                                <a v-if="playing && (s.path == playerPath)"
                                                                    @click.prevent="pause()">
                                                                    <i class="material-icons">pause_arrow</i>
                                                                </a>
                                                                <a v-else @click.prevent="play(s.path)">
                                                                    <i class="material-icons">play_arrow</i>
                                                                </a>

                                                            </span>

                                                            <span v-else>{{ index + 1 }}</span>

                                                        </div>
                                                        <div v-else class="track__number">
                                                            <a v-if="playing && (s.path == playerPath)"
                                                                class="ion-ios-pause" @click.prevent="pause()">
                                                                <i class="material-icons">pause</i>
                                                            </a>
                                                            <a v-else @click.prevent="play(s.path)">
                                                                <i class="material-icons">play_arrow</i>
                                                            </a>

                                                        </div>

                                                        <div :class="{ playing: s.path == playerPath }"
                                                            class="track__title">
                                                            <span class="title">{{ displaySong(s.title) }}</span>
                                                            <a class="composer"
                                                                @click.prevent="onSelectComposer(s.composer, true)">{{
                                                                    displayComposer(s.composer)
                                                                }}</a>
                                                        </div>
                                                        <div class="track__added">
                                                            <a @click.prevent="removeFromQueue(s.path)">
                                                                <i class="material-icons">remove_from_queue</i>
                                                            </a>
                                                        </div>

                                                    </a>

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                    <!-- END Queue -->

                </div>



            </main>


            <footer class="current-track">
                <!-- PLAYER -->
                <section class="playing" ref="playing">
                    <div v-if="playerSong" class="playing__song">
                        <a class="playing__song__name">{{ displaySong(playerSong) }}</a>
                        <a class="playing__song__artist" @click.prevent="onSelectComposer(playerComposer, true)">{{
                            displayComposer(playerComposer)
                        }}</a>
                    </div>
                </section>

                <div class="current-track__player">

                    <!-- <a>
            <i class="material-icons">shuffle</i>
          </a> -->

                    <div>

                        <a @click.prevent="previousSong()">
                            <i class="material-icons">skip_previous</i>
                        </a>

                        <a v-if="playing" @click.prevent="pause()">
                            <i class="material-icons">pause_circle_filled</i>
                        </a>
                        <a v-else @click.prevent="play(playerComposer + '/' + playerSong, playerTrack)">
                            <i class="material-icons">play_circle_filled</i>
                        </a>

                        <a @click.prevent="nextSong()">
                            <i class="material-icons">skip_next</i>
                        </a>

                        <!-- <a>
              <i class="material-icons">repeat</i>
            </a> -->

                        <a @click.prevent="toggleQueue()">
                            <i class="material-icons" :class="{ Queue_mode: sbVisible }">queue_music</i>
                        </a>

                    </div>

                    <div v-if="songInfo.numberOfTracks > 1">
                        <a @click.prevent="previousTrack()">
                            <i class="material-icons">navigate_before</i>
                        </a>
                        <a class="devices">Track: {{ playerTrack }}/{{ songInfo.numberOfTracks }}</a>
                        <a @click.prevent="nextTrack()">
                            <i class="material-icons">navigate_next</i>
                        </a>
                    </div>
                    <div>
                        <a class="volume">
                            <i class="material-icons" @click.prevent="toggleVolumeBar()">volume_up</i>
                            <div class="volume_range" :style="{ display: vVisible ? 'block' : 'none' }">

                                <input type="range" orient="vertical" min="0" max="1" step="0.05" v-model="volume" />

                            </div>
                        </a>
                    </div>

                </div>
                <!-- END PLAYER -->
            </footer>

        </section>
    </main>

</template>


<style lang="scss">
@import '@/assets/global.scss'
</style>
