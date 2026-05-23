/**
 * Bubble sound effects — synthesized via Web Audio API.
 * No audio files needed. Works entirely in-browser.
 */

type AudioContextType = typeof AudioContext

let ctx: InstanceType<AudioContextType> | null = null

function getCtx(): InstanceType<AudioContextType> | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextType }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

/** Short water-bubble pop — for button taps & message send */
export function playBubblePop(volume = 0.25) {
  const c = getCtx()
  if (!c) return

  const osc = c.createOscillator()
  const gain = c.createGain()
  const filter = c.createBiquadFilter()

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)

  // Frequency glides down like a rising bubble popping
  osc.type = 'sine'
  osc.frequency.setValueAtTime(720, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.14)

  // Bandpass for bubbly resonance
  filter.type = 'bandpass'
  filter.frequency.value = 500
  filter.Q.value = 6

  // Sharp attack, quick fade
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)

  osc.start(c.currentTime)
  osc.stop(c.currentTime + 0.2)
}

/** Deeper, more satisfying pop — for confirm / success */
export function playBubbleConfirm() {
  const c = getCtx()
  if (!c) return

  // Layer two slightly offset pops for richness
  playBubblePop(0.22)
  setTimeout(() => playBubblePop(0.14), 60)

  const osc2 = c.createOscillator()
  const gain2 = c.createGain()
  const filter2 = c.createBiquadFilter()

  osc2.connect(filter2)
  filter2.connect(gain2)
  gain2.connect(c.destination)

  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(420, c.currentTime + 0.04)
  osc2.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.28)

  filter2.type = 'bandpass'
  filter2.frequency.value = 300
  filter2.Q.value = 5

  gain2.gain.setValueAtTime(0, c.currentTime + 0.04)
  gain2.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.055)
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.32)

  osc2.start(c.currentTime + 0.04)
  osc2.stop(c.currentTime + 0.35)
}

/** Very subtle tap — for quick action chips */
export function playBubbleTap() {
  playBubblePop(0.10)
}
