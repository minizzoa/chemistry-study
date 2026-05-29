import { useState, useRef, useCallback } from 'react';
import { QUIZ_ELEMENTS, pickChoices } from '../data/quizElements';
import './FallingQuiz.css';

const TOTAL_LIVES = 3;

// 레벨에 따라 낙하 속도 계산 (ms)
function getFallDuration(level) {
  return Math.max(1500, 4800 - (level - 1) * 280);
}

// 점수 계산: 레벨 + 콤보 보너스
function calcPoints(level, streak) {
  const base  = 10 + (level - 1) * 3;
  const combo = streak >= 3 ? Math.floor(streak / 3) * 5 : 0;
  return base + combo;
}

export default function FallingQuiz({ onBack }) {
  const [phase, setPhase]         = useState('splash'); // splash | playing | over
  const [lives, setLives]         = useState(TOTAL_LIVES);
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [level, setLevel]         = useState(1);
  const [question, setQuestion]   = useState(null);   // { el, ch, id }
  const [tileOn, setTileOn]       = useState(false);
  const [choiceState, setChoiceState] = useState({}); // { sym: 'correct'|'wrong'|'reveal' }
  const [toast, setToast]         = useState(null);   // { text, type }

  // refs — stale closure 방지
  const doneRef  = useRef(false);
  const elemRef  = useRef(null);
  const livesRef = useRef(TOTAL_LIVES);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const strRef   = useRef(0);

  /* ─── 다음 문제 시작 ─────────────────────────────── */
  const askNext = useCallback(() => {
    setTimeout(() => {
      if (livesRef.current <= 0) return;
      const el = QUIZ_ELEMENTS[Math.floor(Math.random() * QUIZ_ELEMENTS.length)];
      const ch = pickChoices(el, QUIZ_ELEMENTS);
      elemRef.current = el;
      doneRef.current = false;
      setChoiceState({});
      setToast(null);
      setQuestion({ el, ch, id: Date.now() });
      setTileOn(true);
    }, 950);
  }, []);

  /* ─── 라운드 결과 처리 ───────────────────────────── */
  const endRound = useCallback((isCorrect, wrongSym) => {
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

      const newLevel = Math.floor(newScore / 100) + 1;
      levelRef.current = newLevel;
      setLevel(newLevel);

      setChoiceState({ [elemRef.current.symbol]: 'correct' });
      setToast({ text: `+${pts}${str >= 3 ? ` 🔥×${str}` : ''}`, type: 'correct' });
      askNext();

    } else {
      strRef.current = 0;
      setStreak(0);

      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);

      const cs = {};
      if (wrongSym) cs[wrongSym] = 'wrong';
      cs[elemRef.current.symbol] = 'reveal';
      setChoiceState(cs);
      setToast({ text: `${elemRef.current.symbol} — ${elemRef.current.name}`, type: 'wrong' });

      if (newLives <= 0) {
        setTimeout(() => setPhase('over'), 950);
      } else {
        askNext();
      }
    }
  }, [askNext]);

  /* ─── 선택지 클릭 ────────────────────────────────── */
  const handleChoice = useCallback((sym) => {
    if (doneRef.current) return;
    doneRef.current = true;
    endRound(sym === elemRef.current.symbol, sym);
  }, [endRound]);

  /* ─── 타일 바닥 도달 (시간 초과) ────────────────── */
  const handleTileEnd = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    strRef.current = 0;
    setStreak(0);
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    setChoiceState({ [elemRef.current.symbol]: 'reveal' });
    setToast({ text: '⏰ 시간 초과!', type: 'timeout' });
    setTileOn(false);

    if (newLives <= 0) {
      setTimeout(() => setPhase('over'), 950);
    } else {
      askNext();
    }
  }, [askNext]);

  /* ─── 게임 시작 / 재시작 ─────────────────────────── */
  const startGame = () => {
    scoreRef.current = 0;  setScore(0);
    livesRef.current = TOTAL_LIVES; setLives(TOTAL_LIVES);
    strRef.current = 0;    setStreak(0);
    levelRef.current = 1;  setLevel(1);

    const el = QUIZ_ELEMENTS[Math.floor(Math.random() * QUIZ_ELEMENTS.length)];
    const ch = pickChoices(el, QUIZ_ELEMENTS);
    elemRef.current = el;
    doneRef.current = false;
    setChoiceState({});
    setToast(null);
    setQuestion({ el, ch, id: Date.now() });
    setTileOn(true);
    setPhase('playing');
  };

  /* ─── 낙하 시간 ──────────────────────────────────── */
  const fallDur = getFallDuration(level);

  /* ─── 스플래시 ───────────────────────────────────── */
  if (phase === 'splash') return (
    <div className="fq-splash">
      <div className="fq-card">
        <div className="fq-splash-icon">🔬</div>
        <h1>원소 퀴즈</h1>
        <p>내려오는 원소 기호를 보고<br />한글 이름을 맞추세요!</p>
        <ul className="fq-rules">
          <li>⬇️ 원소 기호 타일이 아래로 내려와요</li>
          <li>🔤 4개 보기 중 한글 이름을 선택</li>
          <li>❤️ 3번 틀리거나 시간 초과 시 종료</li>
          <li>🔥 연속 정답으로 콤보 보너스!</li>
        </ul>
        <button className="fq-btn-primary" onClick={startGame}>시작하기</button>
        <button className="fq-btn-back"    onClick={onBack}>← 뒤로</button>
      </div>
    </div>
  );

  /* ─── 게임 오버 ──────────────────────────────────── */
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

  /* ─── 플레이 화면 ─────────────────────────────────── */
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
        <div className="fq-hud-lives">
          {'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, TOTAL_LIVES - lives))}
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

      {/* 토스트 메시지 */}
      <div className="fq-toast-row">
        {toast && (
          <span key={toast.text + toast.type} className={`fq-toast fq-toast-${toast.type}`}>
            {toast.text}
          </span>
        )}
      </div>

      {/* 선택지 4개 */}
      <div className="fq-choices">
        {question?.ch.map(c => {
          const st = choiceState[c.symbol];
          return (
            <button
              key={c.symbol}
              className={`fq-choice${st ? ' fq-choice-' + st : ''}`}
              style={{ '--col': c.color }}
              onClick={() => handleChoice(c.symbol)}
              onTouchStart={(e) => { e.preventDefault(); handleChoice(c.symbol); }}
            >
              <span className="fq-ch-korean">{c.name}</span>
              <span className="fq-ch-hint">{c.symbol}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
