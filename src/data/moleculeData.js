// 분자 퀴즈용 분자 목록 (formula는 숫자를 일반 숫자로, formatFormula로 첨자 변환)
export const MOLECULES = [
  { formula: 'H2O',      name: '물',            color: '#DBEAFE' },
  { formula: 'CO2',      name: '이산화탄소',     color: '#E2E8F0' },
  { formula: 'O2',       name: '산소',           color: '#DCFCE7' },
  { formula: 'N2',       name: '질소',           color: '#EDE9FE' },
  { formula: 'H2',       name: '수소',           color: '#DBEAFE' },
  { formula: 'Cl2',      name: '염소',           color: '#DCFCE7' },
  { formula: 'F2',       name: '플루오린',       color: '#ECFDF5' },
  { formula: 'CO',       name: '일산화탄소',     color: '#E2E8F0' },
  { formula: 'HCl',      name: '염화수소',       color: '#DCFCE7' },
  { formula: 'HF',       name: '플루오린화수소', color: '#ECFDF5' },
  { formula: 'NH3',      name: '암모니아',       color: '#FEF9C3' },
  { formula: 'CH4',      name: '메테인',         color: '#FED7AA' },
  { formula: 'SO2',      name: '이산화황',       color: '#FEF3C7' },
  { formula: 'NO2',      name: '이산화질소',     color: '#FCE7F3' },
  { formula: 'N2O',      name: '아산화질소',     color: '#EDE9FE' },
  { formula: 'MgO',      name: '산화마그네슘',   color: '#E2E8F0' },
  { formula: 'NaCl',     name: '염화나트륨',     color: '#FEF9C3' },
  { formula: 'NaOH',     name: '수산화나트륨',   color: '#FEF9C3' },
  { formula: 'HNO3',     name: '질산',           color: '#FEF3C7' },
  { formula: 'H2SO4',    name: '황산',           color: '#FEF3C7' },
  { formula: 'Fe2O3',    name: '산화철',         color: '#FED7AA' },
  { formula: 'Al2O3',    name: '산화알루미늄',   color: '#E2E8F0' },
  { formula: 'CuSO4',    name: '황산구리',       color: '#DBEAFE' },
  { formula: 'CaCO3',    name: '탄산칼슘',       color: '#F8FAFC' },
  { formula: 'Na2CO3',   name: '탄산나트륨',     color: '#FEF9C3' },
  { formula: 'CH3OH',    name: '메탄올',         color: '#FED7AA' },
  { formula: 'C3H8',     name: '프로페인',       color: '#FED7AA' },
  { formula: 'Ca(OH)2',  name: '수산화칼슘',     color: '#FEF9C3' },
  { formula: 'C2H5OH',   name: '에탄올',         color: '#FED7AA' },
  { formula: 'C6H12O6',  name: '포도당',         color: '#FEF9C3' },
];

// 숫자 → 아래첨자 유니코드 변환 (H2O → H₂O)
export function formatFormula(formula) {
  const map = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄',
                '5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
  return formula.replace(/\d/g, d => map[d]);
}

// 타일 너비(64px) 기준 폰트 크기 결정
export function formulaFontSize(formula) {
  const n = formula.length;
  if (n <= 3) return '20px';
  if (n <= 4) return '18px';
  if (n <= 5) return '15px';
  if (n <= 6) return '13px';
  return '11px';
}

// 정답 1개 + 오답 3개 선택지 생성
export function pickMolChoices(correct, all) {
  const pool = all.filter(m => m.formula !== correct.formula);
  const wrong = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return [...wrong, correct].sort(() => Math.random() - 0.5);
}
