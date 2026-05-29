import { useState, useRef, useCallback, useEffect } from 'react';
import { QUIZ_ELEMENTS } from '../data/quizElements';
import {
  playCorrect, playCombo, playWrong, playTimeout,
  playGameOver, playLevelUp, isMuted, toggleMute,
} from '../utils/sound';
import './FallingQuiz.css';

const TOTAL_LIVES = 5;
const MAX_TILES   = 5;            // 동시 최대 타일 수
const SPEED_TICK  = 7000;         // ms마다 속도 1단계 증가

function getFallDuration(speed) {
  // speed 0 → 7.2s, 이후 단계마다 -260ms, 최소 2.2s
  return Math.max(2200, 7200 - speed * 260);
}

function getSpawnInterval(speed) {
  // speed 0 → 2.8s, 이후 단계마다 -180ms, 최소 1.1s
  return Math.max(1100, 2800 - speed * 180);
}

function calcPoints(level, streak) {
  const base  = 10 + (level - 1) * 3;
  const combo = streak >= 3 ? Math.floor(streak / 3) * 5 : 0;
  return base + combo;
}

export default function FallingQuiz({ onBack }) {
  const [phase, setPhase]             = useState('splash');
  const [muted, setMuted]             = useState(isMuted());
  const [lives, setLives]             = useState(TOTAL_LIVES);
  const [score, setScore]             = useState(0);
  const [streak, setStreak]           = useState(0);
  const [speed, setSpeed]             = useState(0);
  const [tiles, setTiles]             = useState([]);  // 낙하 중인 타일 배열
  const [inputValue, setInputValue]   = useState('');
  const [inputStatus, setInputStatus] = useState(null); // null|'correct'|'wrong'
  const [toast, setToast]             = useState(null);

  // refs — 콜백 내 stale closure 방지
  const livesRef  = useRef(TOTAL_LIVES);
  const scoreRef  = useRef(0);
  const strRef    = useRef(0);
  const speedRef  = useRef(0);
  const activeRef = useRef(false);   // 게임 진행 중 여부
  const inputRef  = useRef(null);

  // tiles state를 ref로 동기화 (매 렌더마다 갱신)
  const tilesRef = useRef([]);
  tilesRef.current = tiles;

  /* ─── 타일 생성 ─────────────────────────── */
  const spawnTile = useCallback(() => {
    if (!activeRef.current) return;

    // 현재 화면에 있는 원소와 중복 최소화
    const existing = new Set(tilesRef.current.map(t => t.el.symbol));
    const pool = QUIZ_ELEMENTS.filter(e => !existing.has(e.symbol));
    const source = pool.length > 0 ? pool : QUIZ_ELEMENTS;
    const el  = source[Math.floor(Math.random() * source.length)];

    const dur = getFallDuration(speedRef.current);
    const x   = 12 + Math.random() * 68; // 12 % ~ 80 % (타일 너비 고려)

    setTiles(prev =>
      prev.length >= MAX_TILES
        ? prev
        : [...prev, { el, id: performance.now() + Math.random(), dur, x }]
    );
  }, []);

  /* ─── 스폰 타이머 (재귀 setTimeout) ──────── */
  useEffect(() => {
    if (phase !== 'playing') return;

    // 게임 시작 시 즉시 첫 타일 생성
    spawnTile();

    let tid;
    function schedule() {
      tid = setTimeout(() => {
        spawnTile();
        schedule();
      }, getSpawnInterval(speedRef.current));
    }
    schedule();

    return () => clearTimeout(tid);
  }, [phase, spawnTile]);

  /* ─── 속도 증가 타이머 ──────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = setInterval(() => {
      setSpeed(s => {
        const ns = s + 1;
        speedRef.current = ns;
        return ns;
      });
    }, SPEED_TICK);

    return () => clearInterval(timer);
  }, [phase]);

  /* ─── 타일이 바닥 도달 → 생명 감소 ────── */
  const handleTileEnd = useCallback((tileId, el) => {
    if (!activeRef.current) return;

    setTiles(prev => prev.filter(t => t.id !== tileId));

    strRef.current = 0;
    setStreak(0);

    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    playTimeout();

    if (newLives <= 0) {
      activeRef.current = false;
      setTiles([]);
      setTimeout(() => { playGameOver(); setPhase('over'); }, 500);
    }
  }, []);

  /* ─── 입력 제출 → 일치 타일 제거 ───────── */
  const handleSubmit = useCallback(() => {
    const answer = inputValue.trim();
    if (!answer) return;

    // 일치하는 타일 중 가장 오래된 것(= 가장 아래 있는 것) 제거
    const matchIdx = tilesRef.current.findIndex(t => t.el.name === answer);

    if (matchIdx !== -1) {
      const matched = tilesRef.current[matchIdx];
      setTiles(prev => prev.filter(t => t.id !== matched.id));

      const lvl = Math.floor(scoreRef.current / 100) + 1;
      const str = strRef.current + 1;
      const pts = calcPoints(lvl, str);

      strRef.current = str;
      setStreak(str);

      const newScore = scoreRef.current + pts;
      const oldLevel = Math.floor(scoreRef.current / 100) + 1;
      const newLevel = Math.floor(newScore / 100) + 1;
      scoreRef.current = newScore;
      setScore(newScore);

      if (newLevel > oldLevel)  playLevelUp();
      else if (str >= 3)        playCombo();
      else                      playCorrect();

      setInputStatus('correct');
      setToast({ text: `+${pts}${str >= 3 ? ` 🔥×${str}` : ''}`, type: 'correct', key: Date.now() });
      setInputValue('');
      setTimeout(() => {
        setInputStatus(null);
        inputRef.current?.focus();
      }, 380);

    } else {
      // 오답 — 생명 소모 없음, 입력창만 흔들림
      playWrong();
      setInputStatus('wrong');
      setTimeout(() => {
        setInputStatus(null);
        setInputValue('');
        inputRef.current?.focus();
      }, 380);
    }
  }, [inputValue]);

  /* ─── 시작 / 재시작 ─────────────────────── */
  const startGame = () => {
    livesRef.current = TOTAL_LIVES; setLives(TOTAL_LIVES);
    scoreRef.current = 0;           setScore(0);
    strRef.current   = 0;           setStreak(0);
    speedRef.current = 0;           setSpeed(0);
    setTiles([]);
    setInputValue('');
    setInputStatus(null);
    setToast(null);
    activeRef.current = true;
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const level = Math.floor(score / 100) + 1;

  /* ─── 스플래시 ──────────────────────────── */
  if (phase === 'splash') return (
    <div className="fq-splash">
      <div className="fq-card">
        <div className="fq-splash-icon">🔬</div>
        <h1>원소 퀴즈</h1>
        <p>내려오는 원소 기호를 보고<br />한글 이름을 입력하세요!</p>
        <ul className="fq-rules">
          <li>⬇️ 여러 원소 타일이 동시에 내려와요</li>
          <li>⌨️ 한글 이름을 입력하면 해당 타일 제거</li>
          <li>❤️ 타일이 바닥에 닿으면 생명 감소 (5개)</li>
          <li>⚡ 시간이 지날수록 점점 빨라져요!</li>
          <li>🔥 연속 정답으로 콤보 보너스!</li>
        </ul>
        <button className="fq-btn-primary" onClick={startGame}>시작하기</button>
        <button className="fq-btn-back"    onClick={onBack}>← 뒤로</button>
      </div>
    </div>
  );

  /* ─── 게임 오버 ─────────────────────────── */
  if (phase === 'over') {
    const rank = score >= 500 ? '🏆 원소 박사'
               : score >= 250 ? '🥇 원소 전문가'
               : score >= 100 ? '🥈 원소 학생'
               :                '🥉 초보 연구원';
    return (
      <div className="fq-splash">
        <div className="fq-card">
          <div className="fq-splash-icon">🎉</div>
          <h1>게임 종료!</h1>
          <div className="fq-rank">{rank}</div>
          <div className="fq-stats">
            <div className="fq-stat"><span>최종 점수</span><strong>{score}점</strong></div>
            <div className="fq-stat"><span>도달 레벨</span><strong>Lv.{level}</strong></div>
          </div>
          <button className="fq-btn-primary" onClick={startGame}>다시 하기</button>
          <button className="fq-btn-back"    onClick={onBack}>← 메뉴</button>
        </div>
      </div>
    );
  }

  /* ─── 플레이 화면 ───────────────────────── */
  return (
    <div className="fq-game">

      {/* HUD */}
      <div className="fq-hud">
        <div className="fq-hud-score">
          <span className="fq-hud-val">{score}</span>
          <span className="fq-hud-lbl">점수</span>
        </div>
        <div className="fq-hud-mid">
          <span className="fq-badge-lv">Lv.{level}</span>
          {streak >= 3 && <span className="fq-badge-streak">🔥×{streak}</span>}
        </div>
        <div className="fq-hud-right">
          <div className="fq-hud-lives">
            {'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, TOTAL_LIVES - lives))}
          </div>
          <button
            className="fq-mute-btn"
            onClick={() => setMuted(toggleMute())}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 낙하 영역 */}
      <div className="fq-fall-area">
        {tiles.map(tile => (
          <div
            key={tile.id}
            className="fq-tile"
            style={{
              '--fdur': `${tile.dur}ms`,
              '--col':  tile.el.color,
              '--x':    `${tile.x}%`,
            }}
            onAnimationEnd={() => handleTileEnd(tile.id, tile.el)}
          >
            <span className="fq-tile-atomic">{tile.el.atomicNum}</span>
            <span className="fq-tile-sym">{tile.el.symbol}</span>
          </div>
        ))}
        <div className="fq-danger-line" />
      </div>

      {/* 토스트 */}
      <div className="fq-toast-row">
        {toast && (
          <span key={toast.key} className={`fq-toast fq-toast-${toast.type}`}>
            {toast.text}
          </span>
        )}
      </div>

      {/* 입력창 */}
      <div className="fq-input-area">
        <div className="fq-input-row">
          <input
            ref={inputRef}
            className={`fq-input${inputStatus ? ' fq-input-' + inputStatus : ''}`}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="한글 이름 입력 (예: 산소)"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button
            className="fq-submit-btn"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
