import Tile from './Tile';

export default function GameBoard({ grid, selection, onTileClick }) {
  const selectionMap = new Map(
    selection.map(({ row, col }, idx) => [`${row}-${col}`, idx])
  );

  return (
    <div className="board">
      {grid.flat().map(tile => {
        const key = `${tile.row}-${tile.col}`;
        const idx = selectionMap.get(key);
        return (
          <Tile
            key={tile.id}
            tile={tile}
            isSelected={idx !== undefined}
            selectionIndex={idx}
            onClick={() => onTileClick(tile.row, tile.col)}
          />
        );
      })}
    </div>
  );
}
