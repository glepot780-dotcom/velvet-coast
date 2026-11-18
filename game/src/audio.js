// Sound, all procedural: no audio files, every effect is an oscillator or a
// burst of noise shaped by WebAudio. The context is created on the first user
// gesture (browsers block audio before that) and everything is a no-op until
// then, so the game never crashes on a silent machine.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine hum: a low sawtooth whose pitch follows the car's speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Police siren: two alternating tones, quiet until a chase is near.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(c.currentTime + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    const c = ensure();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = c.createGain();
    gain.gain.value = vol || 0.25;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  return {
    /** Call from any user gesture so the browser unlocks sound. */
    unlock() {
      ensure();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** Engine pitch follows speed 0..1; 0 silences it. */
    engine(speed01) {
      if (!ctx || !engineGain) return;
      engineGain.gain.setTargetAtTime(speed01 > 0.02 ? 0.05 + speed01 * 0.05 : 0, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, ctx.currentTime, 0.1);
    },
    /** Siren wails while a chase is close; the tone alternates by itself. */
    siren(on, closeness) {
      if (!ctx || !sirenGain) return;
      sirenOn = on;
      if (!on) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        return;
      }
      sirenGain.gain.setTargetAtTime(0.028 * closeness, ctx.currentTime, 0.2);
      const now = ctx.currentTime;
      sirenOsc.frequency.setTargetAtTime(660 + 240 * Math.sin(now * 4.4), now, 0.05);
    },
    sirenIsOn() {
      return sirenOn;
    },
    blip() {
      tone(880, 0.09, 'sine', 0.16);
    },
    cash() {
      tone(1320, 0.1, 'sine', 0.18);
      setTimeout(() => tone(1760, 0.14, 'sine', 0.18), 90);
    },
    jingle() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.2), i * 110));
    },
    shot() {
      noise(0.12, 0.3, 2600);
    },
    crash() {
      noise(0.3, 0.35, 500);
      tone(70, 0.25, 'sine', 0.3, 40);
    },
    horn() {
      tone(370, 0.28, 'square', 0.12);
      tone(466, 0.28, 'square', 0.1);
    },
    fail() {
      tone(220, 0.5, 'sawtooth', 0.16, 110);
    },
  };
}
