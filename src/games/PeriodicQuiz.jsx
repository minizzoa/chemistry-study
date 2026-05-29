import { useState, useRef, useCallback, useEffect } from 'react';
import { PERIODIC_TABLE } from '../data/periodicData';
import {
  playCorrect, playCombo, playWrong, playGameOver,
  isMuted, toggleMute,
} from '../utils/sound';
import './PeriodicQuiz.css';

const TOTAL_LIVES   = 5;
const GAME_DURATION = 120;
const BLANK_COUNT   = 6;
const PERIODS       = [1, 2, 3, 4, 5, 6];
const GROUPS        = Array.from({ length: 18 }, (_, i) => i + 1);

// 주기율표 위치 → 원소 빠른 조회용 맵
const GRID_MAP = {};
PERIODIC_TABLE.forEach(el => {
  if (!GRID_MAP[el.period]) GRID_MAP[el.period] = {};
  GRID_MAP[el.period][el.group] = el;
});

function calcPoints(hintLevel, streak) {
  const base  = hintLevel === 0 ? 20 : hintLevel === 1 ? 12 : 6;
  const combo = streak >= 3 ? Math.floor(streak / 3) * 5 : 0;
  return base + combo;
}

function pickBlanks() {
  return [...PERIODIC_TABLE]
    .sort(() => Math.random() - 0.5)
    .slice(0, BLANK_COUNT)
    .map(e => e.symbol);
}

export default function PeriodicQuiz({ onBack }) {
  const [phase,       setPhase]       = useState('splash');
  const [muted,       setMuted]       = useState(isMuted());
  const [score,       setScore]       = useState(0);
  const [lives,       setLives]       = useState(TOTAL_LIVES);
  const [streak,      setStreak]      = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(GAME_DURATION);
  const [blanks,      setBlanks]      = useState(new Set());   // 이번 라운드 전체 빈칸
  const [solvedSet,   setSolvedSet]   = useState(new Set());   // 맞힌 빈칸
  const [currentEl,   setCurrentEl]   = useState(null);
  const [hintLevel,   setHintLevel]   = useState(0);           // 0=없음 1=주기 2=족
  const [flash,       setFlash]       = useState(null);        // {symbol, type}
  const [toast,       setToast]       = useState(null);

  const scoreRef  = useRef(0);
  const livesRef  = useRef(TOTAL_LIVES);
  const streakRef = useRef(0);
  const activeRef = useRef(false);
  const queueRef  = useRef([]);

  /* ─── 타이머 ─────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return;
    let expired = false;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!expired) {
            expired = true;
            activeRef.current = false;
            setTimeout(() => { playGameOver(); setPhase('over'); }, 200);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  /* ─── 새 라운드 생성 ─────────────────────────── */
  const generateBlanks = useCallback(() => {
    const symbols = pickBlanks();
    setBlanks(new Set(symbols));
    setSolvedSet(new Set());
    queueRef.current = [...symbols];
    setCurrentEl(PERIODIC_TABLE.find(e => e.symbol === symbols[0]));
    setHintLevel(0);
  }, []);

  /* ─── 셀 클릭 ────────────────────────────────── */
  const handleCellClick = useCallback((el) => {
    if (!activeRef.current || !currentEl) return;

    if (el.symbol === currentEl.symbol) {
      // ✅ 정답
      const str = streakRef.current + 1;
      streakRef.current = str;
      setStreak(str);

      const pts      = calcPoints(hintLevel, str);
      const newScore = scoreRef.current + pts;
      scoreRef.current = newScore;
      setScore(newScore);

      if (str >= 3) playCombo();
      else          playCorrect();

      setSolvedSet(prev => new Set([...prev, el.symbol]));
      setFlash({ symbol: el.symbol, type: 'correct' });
      setToast({ text: `+${pts}${str >= 3 ? ` 🔥×${str}` : ''}`, type: 'correct', key: Date.now() });
      setTimeout(() => setFlash(null), 450);

      // 다음 원소로
      queueRef.current = queueRef.current.filter(s => s !== el.symbol);
      if (queueRef.current.length === 0) {
        setTimeout(() => generateBlanks(), 600);
      } else {
        setCurrentEl(PERIODIC_TABLE.find(e => e.symbol === queueRef.current[0]));
        setHintLevel(0);
      }

    } else {
      // ❌ 오답
      playWrong();
      streakRef.current = 0;
      setStreak(0);
      setFlash({ symbol: el.symbol, type: 'wrong' });
      setTimeout(() => setFlash(null), 400);

      const newHint = Math.min(hintLevel + 1, 2);
      setHintLevel(newHint);

      const hintMsg = newHint === 1
        ? `💡 ${currentEl.period}주기 힌트!`
        : newHint === 2
        ? `💡 ${currentEl.group}족 힌트!`
        : '틀렸어요!';
      setToast({ text: hintMsg, type: 'wrong', key: Date.now() });

      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) {
        activeRef.current = false;
        setTimeout(() => { playGameOver(); setPhase('over'); }, 500);
      }
    }
  }, [currentEl, hintLevel, generateBlanks]);

  /* ─── 시작 / 재시작 ─────────────────────────── */
  const startGame = () => {
    scoreRef.current  = 0;          setScore(0);
    livesRef.current  = TOTAL_LIVES; setLives(TOTAL_LIVES);
    streakRef.current = 0;           setStreak(0);
    setTimeLeft(GAME_DURATION);
    setFlash(null);
    setToast(null);
    activeRef.current = true;
    generateBlanks();
    setPhase('playing');
  };

  /* ─── 스플래시 ──────────────────────────────── */
  if (phase === 'splash') return (
    <div className="pq-splash">
      <div className="pq-card">
        <div className="pq-splash-icon">🗺️</div>
        <h1>주기율표 퀴즈</h1>
        <p>주기율표에서 원소의 위치를 찾아보세요!</p>
        <ul className="pq-rules">
          <li>📍 원소 이름이 주어지면 주기율표에서 위치를 탭</li>
          <li>❤️ 틀리면 생명 감소 + 힌트 추가 (5개)</li>
          <li>💡 힌트: 주기 → 족 순서로 범위를 좁혀줘요</li>
          <li>🔥 연속 정답으로 콤보 보너스!</li>
          <li>⏱️ 2분 안에 최대한 많이!</li>
        </ul>
        <button className="pq-btn-primary" onClick={startGame}>시작하기</button>
        <button className="pq-btn-back"    onClick={onBack}>← 뒤로</button>
      </div>
    </div>
  );

  /* ─── 게임 오버 ─────────────────────────────── */
  if (phase === 'over') {
    const rank = score >= 400 ? '🏆 원소 박사'
               : score >= 200 ? '🥇 원소 전문가'
               : score >= 80  ? '🥈 원소 학생'
               :                '🥉 초보 연구원';
    return (
      <div className="pq-splash">
        <div className="pq-card">
          <div className="pq-splash-icon">🎉</div>
          <h1>게임 종료!</h1>
          <div className="pq-rank">{rank}</div>
          <div className="pq-stats">
            <div className="pq-stat"><span>최종 점수</span><strong>{score}점</strong></div>
            <div className="pq-stat"><span>남은 생명</span><strong>{'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, TOTAL_LIVES - lives))}</strong></div>
          </div>
          <button className="pq-btn-primary" onClick={startGame}>다시 하기</button>
          <button className="pq-btn-back"    onClick={onBack}>← 메뉴</button>
        </div>
      </div>
    );
  }

  const mins  = Math.floor(timeLeft / 60);
  const secs  = timeLeft % 60;
  const isLow = timeLeft <= 30;

  /* ─── 플레이 화면 ───────────────────────────── */
  return (
    <div className="pq-game">

      {/* HUD */}
      <div className="pq-hud">
        <div className="pq-hud-score">
          <span className="pq-hud-val">{score}</span>
          <span className="pq-hud-lbl">점수</span>
        </div>
        <div className={`pq-timer${isLow ? ' pq-timer-low' : ''}`}>
          {mins}:{String(secs).padStart(2, '0')}
        </div>
        <div className="pq-hud-right">
          <div className="pq-hud-lives">
            {'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, TOTAL_LIVES - lives))}
          </div>
          <button
            className="pq-mute-btn"
            onClick={() => setMuted(toggleMute())}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 찾을 원소 */}
      <div className="pq-quest">
        <span className="pq-quest-label">찾아라!</span>
        <span className="pq-quest-name">{currentEl?.name}</span>
        {streak >= 3 && <span className="pq-badge-streak">🔥×{streak}</span>}
      </div>

      {/* 힌트 */}
      {hintLevel > 0 && currentEl && (
        <div className="pq-hint-bar">
          {hintLevel >= 1 && (
            <span className="pq-hint-chip pq-hint-period">💡 {currentEl.period}주기</span>
          )}
          {hintLevel >= 2 && (
            <span className="pq-hint-chip pq-hint-group">💡 {currentEl.group}족</span>
          )}
        </div>
      )}

      {/* 토스트 */}
      <div className="pq-toast-row">
        {toast && (
          <span key={toast.key} className={`pq-toast pq-toast-${toast.type}`}>
            {toast.text}
          </span>
        )}
      </div>

      {/* 주기율표 */}
      <div className="pq-table-wrap">
        <div className="pq-table">

          {/* 족(그룹) 번호 헤더 */}
          <div className="pq-row">
            <div className="pq-period-label" />
            {GROUPS.map(g => (
              <div key={g} className="pq-group-label">{g}</div>
            ))}
          </div>

          {PERIODS.map(p => (
            <div key={p} className="pq-row">
              {/* 주기 번호 */}
              <div className="pq-period-label">{p}</div>
              {GROUPS.map(g => {
                const el = GRID_MAP[p]?.[g];

                if (!el) return <div key={g} className="pq-cell pq-empty" />;

                const isBlank   = blanks.has(el.symbol) && !solvedSet.has(el.symbol);
                const isSolved  = solvedSet.has(el.symbol);
                const isCorrect = flash?.symbol === el.symbol && flash.type === 'correct';
                const isWrong   = flash?.symbol === el.symbol && flash.type === 'wrong';
                const isHintP   = hintLevel >= 1 && currentEl?.period === p && isBlank;
                const isHintG   = hintLevel >= 2 && currentEl?.group  === g && isBlank;

                const cls = [
                  'pq-cell',
                  isBlank   ? 'pq-blank'          : 'pq-filled',
                  isSolved  ? 'pq-solved'          : '',
                  isCorrect ? 'pq-flash-correct'   : '',
                  isWrong   ? 'pq-flash-wrong'     : '',
                  isHintP   ? 'pq-hint-p'          : '',
                  isHintG   ? 'pq-hint-g'          : '',
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={g}
                    className={cls}
                    style={!isBlank ? { background: el.color } : undefined}
                    onClick={() => isBlank && handleCellClick(el)}
                  >
                    <span className="pq-cell-num">{el.atomicNum}</span>
                    <span className="pq-cell-sym">{isBlank ? '?' : el.symbol}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 진행 도트 */}
      <div className="pq-progress">
        {[...blanks].map(sym => (
          <span
            key={sym}
            className={`pq-dot ${
              solvedSet.has(sym) ? 'pq-dot-done' :
              sym === currentEl?.symbol ? 'pq-dot-cur' : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
}
