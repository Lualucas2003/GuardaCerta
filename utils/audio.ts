// Global AudioContext to bypass mobile autoplay restrictions
export let globalAudioContext: AudioContext | null = null;

export const initAudioContext = () => {
  if (!globalAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioContext = new AudioContextClass();
    }
  }
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
    globalAudioContext.resume();
  }
};

export const playAlertSound = () => {
  // Tenta vibrar o celular (padrão de alerta SOS/Sirene)
  try {
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 800, 200, 800]);
    }
  } catch (vibrateError) {
    console.warn("Vibration failed:", vibrateError);
  }

  try {
    initAudioContext();
    if (!globalAudioContext) return;
    
    const ctx = globalAudioContext;
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    
    // Siren effect
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.4);
    osc.frequency.linearRampToValueAtTime(400, now + 0.8);
    osc.frequency.linearRampToValueAtTime(800, now + 1.2);
    osc.frequency.linearRampToValueAtTime(400, now + 1.6);
    
    // Volume mais alto para celular
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.1);
    gain.gain.setValueAtTime(1, now + 1.5);
    gain.gain.linearRampToValueAtTime(0, now + 1.6);
    
    osc.start(now);
    osc.stop(now + 1.6);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
};
