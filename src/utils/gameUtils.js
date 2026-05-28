import COMPOUNDS from '../data/compounds.js';

export const ELEMENTS = [
  { symbol: 'H',  weight: 30, atomicNum: 1,  color: '#555555', shadow: '#b0b0b0', name: '수소' },
  { symbol: 'O',  weight: 20, atomicNum: 8,  color: '#1565c0', shadow: '#90caf9', name: '산소' },
  { symbol: 'C',  weight: 12, atomicNum: 6,  color: '#212121', shadow: '#9e9e9e', name: '탄소' },
  { symbol: 'N',  weight: 12, atomicNum: 7,  color: '#2e7d32', shadow: '#a5d6a7', name: '질소' },
  { symbol: 'Cl', weight: 8,  atomicNum: 17, color: '#558b2f', shadow: '#c5e1a5', name: '염소' },
  { symbol: 'Na', weight: 5,  atomicNum: 11, color: '#bf360c', shadow: '#ffab91', name: '나트륨' },
  { symbol: 'K',  weight: 4,  atomicNum: 19, color: '#4527a0', shadow: '#ce93d8', name: '칼륨' },
  { symbol: 'S',  weight: 4,  atomicNum: 16, color: '#e65100', shadow: '#ffe082', name: '황' },
  { symbol: 'Ca', weight: 3,  atomicNum: 20, color: '#4e342e', shadow: '#bcaaa4', name: '칼슘' },
  { symbol: 'Mg', weight: 2,  atomicNum: 12, color: '#00695c', shadow: '#80cbc4', name: '마그네슘' },
];

const ELEMENT_MAP = Object.fromEntries(ELEMENTS.map(e => [e.symbol, e]));
const TOTAL_WEIGHT = ELEMENTS.reduce((s, e) => s + e.weight, 0);

export function getElementStyle(symbol) {
  return ELEMENT_MAP[symbol] || { color: '#555', shadow: '#ccc', name: '', atomicNum: 0 };
}

export function randomElement() {
  const rand = Math.random() * TOTAL_WEIGHT;
  let cum = 0;
  for (const elem of ELEMENTS) {
    cum += elem.weight;
    if (rand < cum) return elem.symbol;
  }
  return 'H';
}

let tileSeq = 0;

function newElementTile(row, col) {
  const elem = randomElement();
  return {
    id: ++tileSeq,
    type: 'element',
    element: elem,
    atomicNum: ELEMENT_MAP[elem].atomicNum,
    row,
    col,
  };
}

export function generateGrid(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(newElementTile(r, c));
    }
    grid.push(row);
  }
  return grid;
}

export function isAdjacent(pos1, pos2) {
  return (
    Math.abs(pos1.row - pos2.row) <= 1 &&
    Math.abs(pos1.col - pos2.col) <= 1 &&
    !(pos1.row === pos2.row && pos1.col === pos2.col)
  );
}

export function getSelectionAtoms(selection, grid) {
  const atoms = {};
  for (const { row, col } of selection) {
    const tile = grid[row][col];
    if (tile.type !== 'element') continue;
    atoms[tile.element] = (atoms[tile.element] || 0) + 1;
  }
  return atoms;
}

export function findMatchingCompound(atoms) {
  for (const compound of COMPOUNDS) {
    if (atomsEqual(atoms, compound.atoms)) return compound;
  }
  return null;
}

function atomsEqual(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if ((a[key] || 0) !== (b[key] || 0)) return false;
  }
  for (const key of keysB) {
    if ((a[key] || 0) !== (b[key] || 0)) return false;
  }
  return true;
}

export function atomsToFormula(atoms) {
  const toSub = n => n > 1 ? String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('') : '';
  const ORDER = ['H', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'Na', 'K', 'Ca', 'Mg'];
  let formula = '';
  for (const elem of ORDER) {
    if (atoms[elem]) formula += elem + toSub(atoms[elem]);
  }
  for (const [elem, count] of Object.entries(atoms)) {
    if (!ORDER.includes(elem)) formula += elem + toSub(count);
  }
  return formula || '...';
}

// Clears selected tiles, places a compound tile at a random cleared position
// in the first selected tile's column, and refills the rest from the top.
export function placeCompoundAndRefill(grid, selection, compound, rows, cols) {
  const compoundCol = selection[0].col;
  const clearSet = new Set(selection.map(({ row, col }) => `${row}-${col}`));
  const newGrid = grid.map(row => [...row]);

  for (let c = 0; c < cols; c++) {
    const remaining = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (!clearSet.has(`${r}-${c}`)) remaining.push(newGrid[r][c]);
    }
    const needed = rows - remaining.length;
    if (needed === 0) continue;

    let newTiles;
    if (c === compoundCol) {
      // Place compound at a random slot among the new tiles
      const compoundSlot = Math.floor(Math.random() * needed);
      newTiles = Array.from({ length: needed }, (_, i) =>
        i === compoundSlot
          ? { id: ++tileSeq, type: 'compound', formula: compound.formula, name: compound.name, color: compound.color, score: compound.score, state: compound.state }
          : { id: ++tileSeq, type: 'element', element: randomElement() }
      );
      // Set atomicNum for element tiles
      newTiles = newTiles.map(t =>
        t.type === 'element' ? { ...t, atomicNum: ELEMENT_MAP[t.element].atomicNum } : t
      );
    } else {
      newTiles = Array.from({ length: needed }, () => {
        const elem = randomElement();
        return { id: ++tileSeq, type: 'element', element: elem, atomicNum: ELEMENT_MAP[elem].atomicNum };
      });
    }

    const fullCol = [...newTiles, ...remaining];
    for (let r = 0; r < rows; r++) {
      newGrid[r][c] = { ...fullCol[r], row: r, col: c };
    }
  }

  return newGrid;
}
