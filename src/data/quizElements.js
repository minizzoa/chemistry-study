// 원소 퀴즈용 원소 목록
export const QUIZ_ELEMENTS = [
  { symbol: 'H',  atomicNum: 1,  name: '수소',     color: '#DBEAFE' },
  { symbol: 'He', atomicNum: 2,  name: '헬륨',     color: '#EDE9FE' },
  { symbol: 'Li', atomicNum: 3,  name: '리튬',     color: '#FEF9C3' },
  { symbol: 'Be', atomicNum: 4,  name: '베릴륨',   color: '#FEF9C3' },
  { symbol: 'B',  atomicNum: 5,  name: '붕소',     color: '#F5D0FE' },
  { symbol: 'C',  atomicNum: 6,  name: '탄소',     color: '#E2E8F0' },
  { symbol: 'N',  atomicNum: 7,  name: '질소',     color: '#DCFCE7' },
  { symbol: 'O',  atomicNum: 8,  name: '산소',     color: '#DBEAFE' },
  { symbol: 'F',  atomicNum: 9,  name: '플루오린', color: '#DCFCE7' },
  { symbol: 'Ne', atomicNum: 10, name: '네온',     color: '#EDE9FE' },
  { symbol: 'Na', atomicNum: 11, name: '나트륨',   color: '#FEF9C3' },
  { symbol: 'Mg', atomicNum: 12, name: '마그네슘', color: '#FEF9C3' },
  { symbol: 'Al', atomicNum: 13, name: '알루미늄', color: '#E2E8F0' },
  { symbol: 'Si', atomicNum: 14, name: '규소',     color: '#E2E8F0' },
  { symbol: 'P',  atomicNum: 15, name: '인',       color: '#FCE7F3' },
  { symbol: 'S',  atomicNum: 16, name: '황',       color: '#FEF3C7' },
  { symbol: 'Cl', atomicNum: 17, name: '염소',     color: '#DCFCE7' },
  { symbol: 'Ar', atomicNum: 18, name: '아르곤',   color: '#EDE9FE' },
  { symbol: 'K',  atomicNum: 19, name: '칼륨',     color: '#FEF9C3' },
  { symbol: 'Ca', atomicNum: 20, name: '칼슘',     color: '#FEF9C3' },
  { symbol: 'Fe', atomicNum: 26, name: '철',       color: '#E2E8F0' },
  { symbol: 'Co', atomicNum: 27, name: '코발트',   color: '#DBEAFE' },
  { symbol: 'Ni', atomicNum: 28, name: '니켈',     color: '#E2E8F0' },
  { symbol: 'Cu', atomicNum: 29, name: '구리',     color: '#FED7AA' },
  { symbol: 'Zn', atomicNum: 30, name: '아연',     color: '#E2E8F0' },
  { symbol: 'Br', atomicNum: 35, name: '브로민',   color: '#FCE7F3' },
  { symbol: 'Kr', atomicNum: 36, name: '크립톤',   color: '#EDE9FE' },
  { symbol: 'Ag', atomicNum: 47, name: '은',       color: '#E2E8F0' },
  { symbol: 'I',  atomicNum: 53, name: '아이오딘', color: '#EDE9FE' },
  { symbol: 'Au', atomicNum: 79, name: '금',       color: '#FEF9C3' },
  { symbol: 'Hg', atomicNum: 80, name: '수은',     color: '#DBEAFE' },
  { symbol: 'Pb', atomicNum: 82, name: '납',       color: '#E2E8F0' },
];

// 정답 1개 + 오답 3개 선택지 생성
export function pickChoices(correct, all) {
  const pool = all.filter(e => e.symbol !== correct.symbol);
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return [...shuffled, correct].sort(() => Math.random() - 0.5);
}
