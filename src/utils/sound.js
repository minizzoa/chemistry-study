// Web Audio API 기반 게임 효과음
// 음원 파일 없이 사인파/사각파 합성으로 생성

let _ctx = null;
let _muted = localStorage.getItem('chem_muted') === 'true';

/* ── 컨텍스트 ─────────────────────────────────── */
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

/* ── 음소거 ───────────────────────────────────── */
export function isMuted() { return _muted; }
export function toggleMute() {
  _muted = !_muted;
  localStorage.setItem('chem_muted', String(_muted));
  return _muted;
}

/* ── 음 하나 재생 ─────────────────────────────── */
function note(freq, startSec, durSec, type = 'sine', vol = 0.22) {
  if (_muted) return;
  const c = getCtx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.value = freq;

  const t = c.currentTime + startSec;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durSec);

  osc.start(t);
  osc.stop(t + durSec + 0.02);
}

/* ── 효과음 ───────────────────────────────────── */

/** 정답 (짧은 상승 아르페지오) */
export function playCorrect() {
  note(523, 0,    0.12); // C5
  note(659, 0.07, 0.12); // E5
  note(784, 0.14, 0.18); // G5
}

/** 콤보 3연속+ (더 화려하게) */
export function playCombo() {
  note(523,  0,    0.09);
  note(659,  0.05, 0.09);
  note(784,  0.10, 0.09);
  note(1047, 0.15, 0.22, 'sine', 0.28);
}

/** 레벨업 */
export function playLevelUp() {
  note(523,  0,    0.09, 'sine', 0.26);
  note(659,  0.08, 0.09, 'sine', 0.26);
  note(784,  0.16, 0.09, 'sine', 0.26);
  note(1047, 0.24, 0.09, 'sine', 0.26);
  note(1319, 0.32, 0.26, 'sine', 0.30);
}

/** 오답 (낮은 짧은 버저) */
export function playWrong() {
  note(280, 0,    0.08, 'square', 0.14);
  note(200, 0.08, 0.14, 'square', 0.10);
}

/** 시간 초과 (하강하는 3음) */
export function playTimeout() {
  note(440, 0,   0.10, 'sine', 0.20);
  note(330, 0.10,0.10, 'sine', 0.18);
  note(220, 0.20,0.18, 'sine', 0.14);
}

/** 게임 오버 (슬픈 하강) */
export function playGameOver() {
  note(392, 0,    0.22, 'sine', 0.24);
  note(349, 0.24, 0.22, 'sine', 0.22);
  note(294, 0.48, 0.22, 'sine', 0.22);
  note(196, 0.72, 0.42, 'sine', 0.26);
}

/** 화학 퍼즐: 화합물 완성 (밝은 성공음) */
export function playCompound() {
  note(523,  0,    0.10, 'sine', 0.26);
  note(659,  0.08, 0.10, 'sine', 0.26);
  note(784,  0.16, 0.10, 'sine', 0.26);
  note(1047, 0.24, 0.24, 'sine', 0.30);
}

/** 화학 퍼즐: 유효하지 않은 화합물 */
export function playInvalid() {
  note(220, 0,    0.10, 'sawtooth', 0.10);
  note(175, 0.09, 0.14, 'sawtooth', 0.08);
}

/** 타일 선택 클릭 */
export function playTick() {
  note(900, 0, 0.04, 'sine', 0.08);
}
