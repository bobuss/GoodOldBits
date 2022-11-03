import { createApp } from 'vue'
import Atarify from './Atarify.vue'

import './assets/global.css'

const app = createApp(Atarify).mount('#app')

function doOnTrackEnd() {
    //if (playerControls) playerControls.playNextSong();
}
function doOnTrackReadyToPlay() {
    ScriptNodePlayer.getInstance().play();
    //songDisplay.redrawSongInfo();
}
function doOnPlayerReady() {
    //if (playerControls) playerControls.playNextSong();
}
function doOnUpdate() { } // unused

ScriptNodePlayer.createInstance(
    new SC68BackendAdapter(), // backendAdapter
    '',                       // basePath, not needed here
    [],                       // requiredFiles
    true,                     // enableSpectrum
    doOnPlayerReady,          // onPlayerReady
    doOnTrackReadyToPlay,     // onTrackReadyToPlay
    doOnTrackEnd,             // onTrackEnd
    doOnUpdate                // doOnUpdate
);
