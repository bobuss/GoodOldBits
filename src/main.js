import { createApp } from 'vue'
import Player from './Player.vue'
import { NodePlayer } from './nodePlayer.js'

const app = createApp(Player)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const player = new NodePlayer(audioContext)
await player.loadWorkletProcessor('sc68')
await player.loadWorkletProcessor('openmpt')
await player.loadWorkletProcessor('ahx')
await player.loadWorkletProcessor('pt')
await player.loadWorkletProcessor('ft2')
await player.loadWorkletProcessor('st3')

app.config.globalProperties.player = player
app.mount('#app')
