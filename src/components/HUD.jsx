export default function HUD({ score, timeLeft, foundCount, muted, onMuteToggle }) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLow = timeLeft <= 30;

  return (
    <div className="hud">
      <div className="hud-score">
        <span className="hud-num">{score}</span>
        <span className="hud-label">점수</span>
      </div>

      <div className={`hud-timer${isLow ? ' low' : ''}`}>
        {mins}:{String(secs).padStart(2, '0')}
      </div>

      <div className="hud-right-group">
        <div className="hud-score">
          <span className="hud-num">{foundCount}</span>
          <span className="hud-label">발견</span>
        </div>
        {onMuteToggle && (
          <button className="hud-mute-btn" onClick={onMuteToggle} aria-label={muted ? '소리 켜기' : '소리 끄기'}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </div>
  );
}
