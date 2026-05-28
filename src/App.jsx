import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateGrid, getSelectionAtoms,
  findMatchingCompound, atomsToFormula, placeCompoundAndRefill,
} from './utils/gameUtils';
import GameBoard from './components/GameBoard';
import HUD from './components/HUD';
import './App.css';

const ROWS = 7;
const COLS = 5;
const GAME_DURATION = 180;

export default function App() {
  const [grid, setGrid] = useState(() => generateGrid(ROWS, COLS));
  const [selection, setSelection] = useState([]);
  const [score, setScore] = useState(0);
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

    // Debounce: same tile tapped twice within 200 ms → ignore (prevents accidental double-tap deselect)
    const now = Date.now();
    const key = `${row}-${col}`;
    if (lastTileRef.current.key === key && now - lastTileRef.current.time < 200) return;
    lastTileRef.current = { key, time: now };

    setSelection(prev => {
      const existingIdx = prev.findIndex(p => p.row === row && p.col === col);
      if (existingIdx !== -1) {
        // 이미 선택된 타일: 해당 타일만 토글 해제 (나머지 선택은 유지)
        return prev.filter((_, i) => i !== existingIdx);
      }
      // 거리 제한 없음: 어디든 선택 가능
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
      setScore(s => s + compound.score);
      setFoundCount(c => c + 1);
      showMessage(`${compound.formula}  ${compound.name}  +${compound.score}점`, 'success');
      setGrid(prev => placeCompoundAndRefill(prev, selection, compound, ROWS, COLS));
    } else {
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
  };

  const currentAtoms = selection.length > 0 ? getSelectionAtoms(selection, grid) : null;
  const currentFormula = currentAtoms ? atomsToFormula(currentAtoms) : null;

  if (!started) {
    return (
      <div className="splash">
        <div className="splash-content">
          <div className="splash-icon">⚗️</div>
          <h1>화학 퍼즐</h1>
          <p>인접한 원소 타일을 선택해서<br />화합물을 완성하세요!</p>
          <div className="rules">
            <div className="rule-item">🔗 인접한 타일을 순서대로 클릭</div>
            <div className="rule-item">🧪 유효한 화합물이면 점수 획득</div>
            <div className="rule-item">⏱️ 3분 안에 최대한 많이!</div>
          </div>
          <button className="start-btn" onClick={() => setStarted(true)}>
            게임 시작
          </button>
        </div>
      </div>
    );
  }

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
        </div>
      </div>
    );
  }

  return (
    <div className="game-wrap">
      <HUD score={score} timeLeft={timeLeft} foundCount={foundCount} />

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
