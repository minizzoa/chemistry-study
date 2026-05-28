import { useRef } from 'react';
import { getElementStyle } from '../utils/gameUtils';

export default function Tile({ tile, isSelected, selectionIndex, onClick }) {
  // touchstart fires immediately; the browser also fires a synthetic click 300ms later.
  // We track whether touch already handled this interaction to skip the duplicate click.
  const touchFiredRef = useRef(false);

  const handleTouchStart = (e) => {
    e.preventDefault(); // prevent scroll-jitter and the delayed synthetic click
    touchFiredRef.current = true;
    onClick();
  };

  const handleClick = () => {
    if (touchFiredRef.current) {
      touchFiredRef.current = false; // consume the duplicate, do nothing
      return;
    }
    onClick(); // real mouse click on desktop
  };

  if (tile.type === 'compound') {
    const stateClass = tile.state === 'liquid' ? ' tile-liquid'
                     : tile.state === 'gas'    ? ' tile-gas'
                     : ' tile-solid';
    return (
      <button
        className={`tile tile-compound${stateClass}`}
        style={{ '--compound-bg': tile.color }}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        data-row={tile.row}
        data-col={tile.col}
      >
        <span className="tile-value">{tile.score}</span>
        <span className="tile-formula">{tile.formula}</span>
        <span className="tile-compound-name">{tile.name}</span>
      </button>
    );
  }

  const style = getElementStyle(tile.element);
  return (
    <button
      className={`tile${isSelected ? ' selected' : ''}`}
      style={{
        '--sym-color': style.color,
        '--key-shadow': isSelected ? '#1976d2' : style.shadow,
      }}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      data-row={tile.row}
      data-col={tile.col}
    >
      <span className="tile-value">{tile.atomicNum}</span>
      <span className="tile-symbol">{tile.element}</span>
      <span className="tile-name">{style.name}</span>
      {isSelected && <span className="tile-order">{selectionIndex + 1}</span>}
    </button>
  );
}
