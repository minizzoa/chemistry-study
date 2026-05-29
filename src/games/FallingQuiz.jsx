import { useState, useRef, useCallback } from 'react';
import { QUIZ_ELEMENTS } from '../data/quizElements';
import {
  playCorrect, playCombo, playWrong, playTimeout,
  playGameOver, playLevelUp, isMuted, toggleMute,
} from '../utils/sound';
import './FallingQuiz.css';

const TOTAL_LIVES = 3;

// 타이핑 방식이므로 기본 낙하 시간을 더 여유 있게
function getFallDuration(level) {
  return Math.max(2200, 6500 - (level - 1) * 350);
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
  const [level, setLevel]             = useState(1);
  const [question, setQuestion]       = useState(null);   // { el, id }
  const [tileOn, setTileOn]           = useState(false);
  const [inputValue, setInputValue]   = useState('');
  const [inputStatus, setInputStatus] = useState(null);   // null | 'correct' | 'wrong'
  const [toast, setToast]             = useState(null);

  const doneRef  = useRef(false);
  const elemRef  = useRef(null);
  const livesRef = useRef(TOTAL_LIVES);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const strRef   = useRef(0);
  const inputRef = useRef(null);

  /* ─── 다음 문제 ─────────────────────────────── */
  const askNext = useCallback(() => {
    setTimeout(() => {
      if (livesRef.current <= 0) return;
      const el = QUIZ_ELEMENTS[Math.floor(Math.random() * QUIZ_ELEMENTS.length)];
      elemRef.current = el;
      doneRef.current = false;
      setInputValue('');
      setInputStatus(null);
      setToast(null);
      setQuestion({ el, id: Date.now() });
      setTileOn(true);
      // 입력창 포커스 유지
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 950);
  }, []);

  /* ─── 라운드 결과 처리 ──────────────────────── */
  const endRound = useCallback((isCorrect) => {
    setTileOn(false);

    if (isCorrect) {
      const str = strRef.current + 1;
      const lvl = levelRef.current;
      const pts = calcPoints(lvl, str);
      strRef.current = str;
      setStreak(str);

      const newScore = scoreRef.current + pts;
      scoreRef.current = newScore;
      setScore(newScore);

      const oldLevel = levelRef.current;
      const newLevel = Math.floor(newScore / 100) + 1;
      levelRef.current = newLevel;
      setLevel(newLevel);

      if (newLevel > oldLevel) playLevelUp();
      else if (str >= 3)       playCombo();
      else                     playCorrect();

      setToast({ text: `+${pts}${str >= 3 ? ` 🔥×${str}` : ''}`, type: 'correct' });
      askNext();

    } else {
      strRef.current = 0;
      setStreak(0);
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);

      playWrong();
      setToast({ text: `정답: ${elemRef.current?.name}`, type: 'wrong' });

      if (newLives <= 0) {
        setTimeout(() => { playGameOver(); setPhase('over'); }, 950);
      } else {
        askNext();
      }
    }
  }, [askNext]);

  /* ─── 답 제출 ───────────────────────────────── */
  const handleSubmit = useCallback(() => {
    if (doneRef.current) return;
    const answer = inputValue.trim();
    if (!answer) return;

    doneRef.current = true;
    const isCorrect = answer === elemRef.current?.name;
    setInputStatus(isCorrect ? 'correct' : 'wrong');
    endRound(isCorrect);
  }, [inputValue, endRound]);

  /* ─── 시간 초과 ─────────────────────────────── */
  const handleTileEnd = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    strRef.current = 0;
    setStreak(0);
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    playTimeout();
    setInputStatus('wrong');
    setToast({ text: `⏰ 정답: ${elemRef.current?.name}`, type: 'timeout' });
    setTileOn(false);

    if (newLives <= 0) {
      setTimeout(() => { playGameOver(); setPhase('over'); }, 950);
    } else {
      askNext();
    }
  }, [askNext]);

  /* ─── 시작 / 재시작 ─────────────────────────── */
  const startGame = () => {
    scoreRef.current = 0;          setScore(0);
    livesRef.current = TOTAL_LIVES; setLives(TOTAL_LIVES);
    strRef.current = 0;            setStreak(0);
    levelRef.current = 1;          setLevel(1);

    const el = QUIZ_ELEMENTS[Math.floor(Math.random() * QUIZ_ELEMENTS.length)];
    elemRef.current = el;
    doneRef.current = false;
    setInputValue('');
    setInputStatus(null);
    setToast(null);
    setQuestion({ el, id: Date.now() });
    setTileOn(true);
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const fallDur = getFallDuration(level);

  /* ─── 스플래시 ───────────────────────────────── */
  if (phase === 'splash') return (
    <div className="fq-splash">
      <div className="fq-card">
        <div className="fq-splash-icon">🔬</div>
        <h1>원소 퀴즈</h1>
        <p>내려오는 원소 기호를 보고<br />한글 이름을 입력하세요!</p>
        <ul className="fq-rules">
          <li>⬇️ 원소 기호 타일이 아래로 내려와요</li>
          <li>⌨️ 한글 이름을 입력하고 확인</li>
          <li>❤️ 3번 틀리거나 시간 초과 시 종료</li>
          <li>🔥 연속 정답으로 콤보 보너스!</li>
        </ul>
        <button className="fq-btn-primary" onClick={startGame}>시작하기</button>
        <button className="fq-btn-back"    onClick={onBack}>← 뒤로</button>
      </div>
    </div>
  );

  /* ─── 게임 오버 ──────────────────────────────── */
  if (phase === 'over') {
    const rank = score >= 300 ? '🏆 원소 박사'
               : score >= 150 ? '🥇 원소 전문가'
               : score >= 60  ? '🥈 원소 학생'
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

  /* ─── 플레이 화면 ────────────────────────────── */
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
        {question && tileOn && (
          <div
            key={question.id}
            className="fq-tile"
            style={{ '--fdur': `${fallDur}ms`, '--col': question.el.color }}
            onAnimationEnd={handleTileEnd}
          >
            <span className="fq-tile-atomic">{question.el.atomicNum}</span>
            <span className="fq-tile-sym">{question.el.symbol}</span>
          </div>
        )}
        <div className="fq-danger-line" />
      </div>

      {/* 토스트 */}
      <div className="fq-toast-row">
        {toast && (
          <span key={toast.text + toast.type} className={`fq-toast fq-toast-${toast.type}`}>
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
