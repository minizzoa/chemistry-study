import { useState, useRef, useCallback, useEffect } from 'react';
import { QUIZ_ELEMENTS, pickChoices } from '../data/quizElements';
import {
  playCorrect, playCombo, playWrong, playTimeout,
  playGameOver, playLevelUp, isMuted, toggleMute,
} from '../utils/sound';
import './FallingQuiz.css';

const TOTAL_LIVES = 5;
const MAX_TILES   = 5;
const SPEED_TICK  = 7000;

function getFallDuration(speed) {
  return Math.max(2200, 7200 - speed * 260);
}

function getSpawnInterval(speed) {
  return Math.max(1100, 2800 - speed * 180);
}

function calcPoints(level, streak) {
  const base  = 10 + (level - 1) * 3;
  const combo = streak >= 3 ? Math.floor(streak / 3) * 5 : 0;
  return base + combo;
}

export default function FallingQuiz({ onBack }) {
  const [phase,        setPhase]        = useState('splash');
  const [muted,        setMuted]        = useState(isMuted());
  const [lives,        setLives]        = useState(TOTAL_LIVES);
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [speed,        setSpeed]        = useState(0);
  const [tiles,        setTiles]        = useState([]);
  const [choices,      setChoices]      = useState([]);     // 보기 4개
  const [targetId,     setTargetId]     = useState(null);   // 현재 보기가 가리키는 타일 id
  const [choiceStatus, setChoiceStatus] = useState(null);   // {type:'correct'|'wrong', symbol}
  const [toast,        setToast]        = useState(null);

  const livesRef  = useRef(TOTAL_LIVES);
  const scoreRef  = useRef(0);
  const strRef    = useRef(0);
  const speedRef  = useRef(0);
  const activeRef = useRef(false);

  const tilesRef = useRef([]);
  tilesRef.current = tiles;

  /* ─── 보기 자동 갱신 ────────────────────────
     항상 가장 오래된 타일(= 가장 바닥에 가까운)을
     기준으로 4개 보기를 생성
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return;

    if (tiles.length === 0) {
      setTargetId(null);
      setChoices([]);
      return;
    }

    // 정답 맞힌 직후 애니메이션 중에는 보기 교체 대기
    if (choiceStatus?.type === 'correct') return;

    const oldest = tiles.reduce((a, b) => (a.id < b.id ? a : b));
    if (oldest.id !== targetId) {
      setTargetId(oldest.id);
      setChoices(pickChoices(oldest.el, QUIZ_ELEMENTS));
      setChoiceStatus(null);
    }
  }, [tiles, targetId, phase, choiceStatus]);

  /* ─── 타일 생성 ─────────────────────────── */
  const spawnTile = useCallback(() => {
    if (!activeRef.current) return;

    const existing = new Set(tilesRef.current.map(t => t.el.symbol));
    const pool   = QUIZ_ELEMENTS.filter(e => !existing.has(e.symbol));
    const source = pool.length > 0 ? pool : QUIZ_ELEMENTS;
    const el     = source[Math.floor(Math.random() * source.length)];

    const dur = getFallDuration(speedRef.current);
    const x   = 12 + Math.random() * 68;

    setTiles(prev =>
      prev.length >= MAX_TILES
        ? prev
        : [...prev, { el, id: performance.now() + Math.random(), dur, x }]
    );
  }, []);

  /* ─── 스폰 타이머 ────────────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return;
    spawnTile();
    let tid;
    function schedule() {
      tid = setTimeout(() => { spawnTile(); schedule(); }, getSpawnInterval(speedRef.current));
    }
    schedule();
    return () => clearTimeout(tid);
  }, [phase, spawnTile]);

  /* ─── 속도 증가 타이머 ───────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setSpeed(s => { const ns = s + 1; speedRef.current = ns; return ns; });
    }, SPEED_TICK);
    return () => clearInterval(t);
  }, [phase]);

  /* ─── 타일 바닥 도달 → 생명 감소 ─────────── */
  const handleTileEnd = useCallback((tileId, el) => {
    if (!activeRef.current) return;

    setTiles(prev => prev.filter(t => t.id !== tileId));
    strRef.current = 0;
    setStreak(0);

    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    playTimeout();
    setToast({ text: `${el.symbol} = ${el.name}`, type: 'timeout', key: Date.now() });

    if (newLives <= 0) {
      activeRef.current = false;
      setTiles([]);
      setTimeout(() => { playGameOver(); setPhase('over'); }, 500);
    }
  }, []);

  /* ─── 보기 버튼 클릭 ─────────────────────── */
  const handleChoiceClick = useCallback((choice) => {
    if (!activeRef.current || choiceStatus) return;

    const target = tilesRef.current.find(t => t.id === targetId);
    if (!target) return;

    if (choice.name === target.el.name) {
      // ✅ 정답
      setTiles(prev => prev.filter(t => t.id !== target.id));

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

      if (newLevel > oldLevel) playLevelUp();
      else if (str >= 3)       playCombo();
      else                     playCorrect();

      setChoiceStatus({ type: 'correct', symbol: choice.symbol });
      setToast({ text: `+${pts}${str >= 3 ? ` 🔥×${str}` : ''}`, type: 'correct', key: Date.now() });
      setTimeout(() => setChoiceStatus(null), 420);

    } else {
      // ❌ 오답 — 생명 소모 없음
      playWrong();
      strRef.current = 0;
      setStreak(0);
      setChoiceStatus({ type: 'wrong', symbol: choice.symbol });
      setTimeout(() => setChoiceStatus(null), 380);
    }
  }, [targetId, choiceStatus]);

  /* ─── 시작 / 재시작 ─────────────────────── */
  const startGame = () => {
    livesRef.current = TOTAL_LIVES; setLives(TOTAL_LIVES);
    scoreRef.current = 0;           setScore(0);
    strRef.current   = 0;           setStreak(0);
    speedRef.current = 0;           setSpeed(0);
    setTiles([]);
    setChoices([]);
    setTargetId(null);
    setChoiceStatus(null);
    setToast(null);
    activeRef.current = true;
    setPhase('playing');
  };

  const level = Math.floor(score / 100) + 1;

  /* ─── 스플래시 ──────────────────────────── */
  if (phase === 'splash') return (
    <div className="fq-splash">
      <div className="fq-card">
        <div className="fq-splash-icon">🔬</div>
        <h1>원소 퀴즈</h1>
        <p>내려오는 원소 기호를 보고<br />보기 4개 중 이름을 맞춰보세요!</p>
        <ul className="fq-rules">
          <li>⬇️ 여러 원소 타일이 동시에 내려와요</li>
          <li>🔲 보기 4개 중 해당 원소 이름을 탭</li>
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
            className={`fq-tile${tile.id === targetId ? ' fq-tile-target' : ''}`}
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

      {/* 보기 4개 */}
      <div className="fq-choices">
        {choices.length > 0
          ? choices.map(c => {
              const st = choiceStatus?.symbol === c.symbol ? choiceStatus.type : null;
              return (
                <button
                  key={c.symbol}
                  className={`fq-choice-btn${st ? ` fq-choice-${st}` : ''}`}
                  onClick={() => handleChoiceClick(c)}
                  disabled={!!choiceStatus}
                >
                  {c.name}
                </button>
              );
            })
          : Array.from({ length: 4 }).map((_, i) => (
              <button key={i} className="fq-choice-btn fq-choice-empty" disabled>—</button>
            ))
        }
      </div>
    </div>
  );
}
