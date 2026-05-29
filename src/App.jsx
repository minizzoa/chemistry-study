import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateGrid, getSelectionAtoms,
  findMatchingCompound, atomsToFormula, placeCompoundAndRefill,
} from './utils/gameUtils';
import GameBoard from './components/GameBoard';
import HUD from './components/HUD';
import FallingQuiz from './games/FallingQuiz';
import PeriodicQuiz from './games/PeriodicQuiz';
import MoleculeQuiz from './games/MoleculeQuiz';
import {
  playCompound, playInvalid, playTick,
  isMuted, toggleMute,
} from './utils/sound';
import './App.css';

const ROWS = 7;
const COLS = 5;
const GAME_DURATION = 180;

/* ── 게임 선택 화면 ──────────────────────────────────── */
function GameSelector({ onSelect }) {
  return (
    <div className="gs-wrap">
      <div className="gs-header">
        <span className="gs-logo">⚗️</span>
        <h1>화학 게임</h1>
        <p>플레이할 게임을 선택하세요</p>
      </div>
      <div className="gs-grid">
        <button className="gs-card" onClick={() => onSelect('puzzle')}>
          <span className="gs-card-icon">🧩</span>
          <span className="gs-card-title">화학 퍼즐</span>
          <span className="gs-card-desc">원소 타일을 조합해<br />화합물을 완성하세요</span>
        </button>
        <button className="gs-card" onClick={() => onSelect('quiz')}>
          <span className="gs-card-icon">⬇️</span>
          <span className="gs-card-title">원소 퀴즈</span>
          <span className="gs-card-desc">떨어지는 원소 기호를 보고<br />한글 이름을 맞추세요</span>
        </button>
        <button className="gs-card" onClick={() => onSelect('periodic')}>
          <span className="gs-card-icon">🗺️</span>
          <span className="gs-card-title">주기율표 퀴즈</span>
          <span className="gs-card-desc">주기율표에서 원소의<br />위치를 찾아보세요</span>
        </button>
        <button className="gs-card" onClick={() => onSelect('molecule')}>
          <span className="gs-card-icon">🧪</span>
          <span className="gs-card-title">분자 퀴즈</span>
          <span className="gs-card-desc">내려오는 분자식을 보고<br />이름을 맞춰보세요</span>
        </button>
      </div>
    </div>
  );
}

/* ── 메인 앱 ─────────────────────────────────────────── */
export default function App() {
  const [selectedGame, setSelectedGame] = useState(null);

  if (selectedGame === 'quiz')      return <FallingQuiz  onBack={() => setSelectedGame(null)} />;
  if (selectedGame === 'periodic')  return <PeriodicQuiz onBack={() => setSelectedGame(null)} />;
  if (selectedGame === 'molecule')  return <MoleculeQuiz onBack={() => setSelectedGame(null)} />;
  if (selectedGame === null)        return <GameSelector onSelect={setSelectedGame} />;
  return <PuzzleGame onBack={() => setSelectedGame(null)} />;
}

/* ── 화학 퍼즐 게임 (기존 코드) ─────────────────────── */
function PuzzleGame({ onBack }) {
  const [grid, setGrid] = useState(() => generateGrid(ROWS, COLS));
  const [selection, setSelection] = useState([]);
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(isMuted());
  const [foundCount, setFoundCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState(null);
  const [shakeBar, setShakeBar] = useState(false);
  const msgTimerRef = useRef(null);
  const lastTileRef = useRef({ key: '', time: 0 });

  useEffect(() => {
    if (!started || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameOver(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, gameOver]);

  const showMessage = useCallback((text, type) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    setMessage({ text, type, key: Date.now() });
    msgTimerRef.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  const handleTileClick = useCallback((row, col) => {
    if (!started || gameOver) return;
    if (grid[row][col].type === 'compound') return;

    const now = Date.now();
    const key = `${row}-${col}`;
    if (lastTileRef.current.key === key && now - lastTileRef.current.time < 200) return;
    lastTileRef.current = { key, time: now };

    playTick();
    setSelection(prev => {
      const existingIdx = prev.findIndex(p => p.row === row && p.col === col);
      if (existingIdx !== -1) {
        return prev.filter((_, i) => i !== existingIdx);
      }
      return [...prev, { row, col }];
    });
  }, [started, gameOver, grid]);

  const handleSubmit = useCallback(() => {
    if (selection.length === 0) return;
    if (selection.length < 2) {
      showMessage('2개 이상의 원소를 선택하세요', 'error');
      setSelection([]);
      return;
    }

    const atoms = getSelectionAtoms(selection, grid);
    const compound = findMatchingCompound(atoms);

    if (compound) {
      playCompound();
      setScore(s => s + compound.score);
      setFoundCount(c => c + 1);
      showMessage(`${compound.formula}  ${compound.name}  +${compound.score}점`, 'success');
      setGrid(prev => placeCompoundAndRefill(prev, selection, compound, ROWS, COLS));
    } else {
      playInvalid();
      const formula = atomsToFormula(atoms);
      showMessage(`${formula} — 유효하지 않은 화합물`, 'error');
      setShakeBar(true);
      setTimeout(() => setShakeBar(false), 500);
    }
    setSelection([]);
  }, [selection, grid, showMessage]);

  const handleReset = () => {
    setGrid(generateGrid(ROWS, COLS));
    setSelection([]);
    setScore(0);
    setFoundCount(0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setMessage(null);
    setStarted(false);
  };

  const currentAtoms = selection.length > 0 ? getSelectionAtoms(selection, grid) : null;
  const currentFormula = currentAtoms ? atomsToFormula(currentAtoms) : null;

  /* 시작 전 스플래시 */
  if (!started) {
    return (
      <div className="splash">
        <div className="splash-content">
          <div className="splash-icon">⚗️</div>
          <h1>화학 퍼즐</h1>
          <p>원소 타일을 선택해서<br />화합물을 완성하세요!</p>
          <div className="rules">
            <div className="rule-item">🔗 원소 타일을 순서대로 클릭</div>
            <div className="rule-item">🧪 유효한 화합물이면 점수 획득</div>
            <div className="rule-item">⏱️ 3분 안에 최대한 많이!</div>
          </div>
          <button className="start-btn" onClick={() => setStarted(true)}>
            게임 시작
          </button>
          <button className="gs-back-link" onClick={onBack}>← 게임 선택</button>
        </div>
      </div>
    );
  }

  /* 게임 오버 */
  if (gameOver) {
    const rank = score >= 300 ? '🏆 화학 박사' : score >= 150 ? '🥇 화학 전문가' : score >= 60 ? '🥈 화학 학생' : '🥉 초보 연구원';
    return (
      <div className="splash">
        <div className="splash-content">
          <div className="splash-icon">🎉</div>
          <h1>게임 종료!</h1>
          <div className="result-rank">{rank}</div>
          <div className="result-stats">
            <div className="stat"><span className="stat-label">최종 점수</span><span className="stat-value">{score}점</span></div>
            <div className="stat"><span className="stat-label">발견 화합물</span><span className="stat-value">{foundCount}개</span></div>
          </div>
          <button className="start-btn" onClick={handleReset}>
            다시 하기
          </button>
          <button className="gs-back-link" onClick={onBack}>← 게임 선택</button>
        </div>
      </div>
    );
  }

  /* 게임 플레이 */
  return (
    <div className="game-wrap">
      <HUD score={score} timeLeft={timeLeft} foundCount={foundCount}
           muted={muted} onMuteToggle={() => setMuted(toggleMute())} />

      {message && (
        <div key={message.key} className={`msg msg-${message.type}`}>
          {message.text}
        </div>
      )}

      <GameBoard grid={grid} selection={selection} onTileClick={handleTileClick} />

      <div className={`formula-bar${shakeBar ? ' shake' : ''}`}>
        <span className={`formula-text${currentFormula ? '' : ' placeholder'}`}>
          {currentFormula ?? '원소를 선택하세요'}
        </span>
        <div className="bar-actions">
          <button
            className="btn-cancel"
            onClick={() => setSelection([])}
            disabled={selection.length === 0}
          >
            취소
          </button>
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={selection.length < 2}
          >
            제출
          </button>
        </div>
      </div>
    </div>
  );
}
