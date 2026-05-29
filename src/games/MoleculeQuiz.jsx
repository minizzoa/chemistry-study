import { useState, useRef, useCallback, useEffect } from 'react';
import { MOLECULES, pickMolChoices, formatFormula, formulaFontSize } from '../data/moleculeData';
import {
  playCorrect, playCombo, playWrong, playTimeout,
  playGameOver, playLevelUp, isMuted, toggleMute,
} from '../utils/sound';
import './MoleculeQuiz.css';

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

export default function MoleculeQuiz({ onBack }) {
  const [phase,        setPhase]        = useState('splash');
  const [muted,        setMuted]        = useState(isMuted());
  const [lives,        setLives]        = useState(TOTAL_LIVES);
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [speed,        setSpeed]        = useState(0);
  const [tiles,        setTiles]        = useState([]);
  const [choices,      setChoices]      = useState([]);
  const [targetId,     setTargetId]     = useState(null);
  const [choiceStatus, setChoiceStatus] = useState(null);
  const [toast,        setToast]        = useState(null);

  const livesRef  = useRef(TOTAL_LIVES);
  const scoreRef  = useRef(0);
  const strRef    = useRef(0);
  const speedRef  = useRef(0);
  const activeRef = useRef(false);

  const tilesRef = useRef([]);
  tilesRef.current = tiles;

  /* ─── 보기 자동 갱신 ─────────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return;
    if (tiles.length === 0) { setTargetId(null); setChoices([]); return; }
    if (choiceStatus?.type === 'correct') return;

    const oldest = tiles.reduce((a, b) => (a.id < b.id ? a : b));
    if (oldest.id !== targetId) {
      setTargetId(oldest.id);
      setChoices(pickMolChoices(oldest.mol, MOLECULES));
      setChoiceStatus(null);
    }
  }, [tiles, targetId, phase, choiceStatus]);

  /* ─── 타일 생성 ─────────────────────────── */
  const spawnTile = useCallback(() => {
    if (!activeRef.current) return;

    const existing = new Set(tilesRef.current.map(t => t.mol.formula));
    const pool   = MOLECULES.filter(m => !existing.has(m.formula));
    const source = pool.length > 0 ? pool : MOLECULES;
    const mol    = source[Math.floor(Math.random() * source.length)];

    const dur = getFallDuration(speedRef.current);
    const x   = 12 + Math.random() * 68;

    setTiles(prev =>
      prev.length >= MAX_TILES
        ? prev
        : [...prev, { mol, id: performance.now() + Math.random(), dur, x }]
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
  const handleTileEnd = useCallback((tileId, mol) => {
    if (!activeRef.current) return;

    setTiles(prev => prev.filter(t => t.id !== tileId));
    strRef.current = 0;
    setStreak(0);

    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    playTimeout();
    setToast({ text: `${formatFormula(mol.formula)} = ${mol.name}`, type: 'timeout', key: Date.now() });

    if (newLives <= 0) {
      activeRef.current = false;
      setTiles([]);
      setTimeout(() => { playGameOver(); setPhase('over'); }, 500);
    }
  }, []);

  /* ─── 보기 클릭 ──────────────────────────── */
  const handleChoiceClick = useCallback((choice) => {
    if (!activeRef.current || choiceStatus) return;

    const target = tilesRef.current.find(t => t.id === targetId);
    if (!target) return;

    if (choice.name === target.mol.name) {
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

      setChoiceStatus({ type: 'correct', symbol: choice.formula });
      setToast({ text: `+${pts}${str >= 3 ? ` 🔥×${str}` : ''}`, type: 'correct', key: Date.now() });
      setTimeout(() => setChoiceStatus(null), 420);

    } else {
      // ❌ 오답
      playWrong();
      strRef.current = 0;
      setStreak(0);
      setChoiceStatus({ type: 'wrong', symbol: choice.formula });
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
    <div className="mq-splash">
      <div className="mq-card">
        <div className="mq-splash-icon">🧪</div>
        <h1>분자 퀴즈</h1>
        <p>내려오는 분자식을 보고<br />보기 4개 중 이름을 맞춰보세요!</p>
        <ul className="mq-rules">
          <li>⬇️ 여러 분자 타일이 동시에 내려와요</li>
          <li>🔲 보기 4개 중 해당 분자 이름을 탭</li>
          <li>❤️ 타일이 바닥에 닿으면 생명 감소 (5개)</li>
          <li>⚡ 시간이 지날수록 점점 빨라져요!</li>
          <li>🔥 연속 정답으로 콤보 보너스!</li>
        </ul>
        <button className="mq-btn-primary" onClick={startGame}>시작하기</button>
        <button className="mq-btn-back"    onClick={onBack}>← 뒤로</button>
      </div>
    </div>
  );

  /* ─── 게임 오버 ─────────────────────────── */
  if (phase === 'over') {
    const rank = score >= 500 ? '🏆 화학 박사'
               : score >= 250 ? '🥇 화학 전문가'
               : score >= 100 ? '🥈 화학 학생'
               :                '🥉 초보 연구원';
    return (
      <div className="mq-splash">
        <div className="mq-card">
          <div className="mq-splash-icon">🎉</div>
          <h1>게임 종료!</h1>
          <div className="mq-rank">{rank}</div>
          <div className="mq-stats">
            <div className="mq-stat"><span>최종 점수</span><strong>{score}점</strong></div>
            <div className="mq-stat"><span>도달 레벨</span><strong>Lv.{level}</strong></div>
          </div>
          <button className="mq-btn-primary" onClick={startGame}>다시 하기</button>
          <button className="mq-btn-back"    onClick={onBack}>← 메뉴</button>
        </div>
      </div>
    );
  }

  /* ─── 플레이 화면 ───────────────────────── */
  return (
    <div className="mq-game">

      {/* HUD */}
      <div className="mq-hud">
        <div className="mq-hud-score">
          <span className="mq-hud-val">{score}</span>
          <span className="mq-hud-lbl">점수</span>
        </div>
        <div className="mq-hud-mid">
          <span className="mq-badge-lv">Lv.{level}</span>
          {streak >= 3 && <span className="mq-badge-streak">🔥×{streak}</span>}
        </div>
        <div className="mq-hud-right">
          <div className="mq-hud-lives">
            {'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, TOTAL_LIVES - lives))}
          </div>
          <button
            className="mq-mute-btn"
            onClick={() => setMuted(toggleMute())}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 낙하 영역 */}
      <div className="mq-fall-area">
        {tiles.map(tile => (
          <div
            key={tile.id}
            className={`mq-tile${tile.id === targetId ? ' mq-tile-target' : ''}`}
            style={{
              '--fdur': `${tile.dur}ms`,
              '--col':  tile.mol.color,
              '--x':    `${tile.x}%`,
              '--fsize': formulaFontSize(tile.mol.formula),
            }}
            onAnimationEnd={() => handleTileEnd(tile.id, tile.mol)}
          >
            <span className="mq-tile-formula">
              {formatFormula(tile.mol.formula)}
            </span>
          </div>
        ))}
        <div className="mq-danger-line" />
      </div>

      {/* 토스트 */}
      <div className="mq-toast-row">
        {toast && (
          <span key={toast.key} className={`mq-toast mq-toast-${toast.type}`}>
            {toast.text}
          </span>
        )}
      </div>

      {/* 보기 4개 */}
      <div className="mq-choices">
        {choices.length > 0
          ? choices.map(c => {
              const st = choiceStatus?.symbol === c.formula ? choiceStatus.type : null;
              return (
                <button
                  key={c.formula}
                  className={`mq-choice-btn${st ? ` mq-choice-${st}` : ''}`}
                  onClick={() => handleChoiceClick(c)}
                  disabled={!!choiceStatus}
                >
                  {c.name}
                </button>
              );
            })
          : Array.from({ length: 4 }).map((_, i) => (
              <button key={i} className="mq-choice-btn mq-choice-empty" disabled>—</button>
            ))
        }
      </div>
    </div>
  );
}
