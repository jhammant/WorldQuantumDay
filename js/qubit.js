// qubit.js — Pure math module for quantum state management
// No Three.js dependency — all complex amplitude math and gate matrices

const SQRT2_INV = 1 / Math.sqrt(2);

// Complex number helpers
export const complex = (re, im = 0) => ({ re, im });
export const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const cnorm2 = (a) => a.re * a.re + a.im * a.im;
export const cabs = (a) => Math.sqrt(cnorm2(a));
export const cphase = (a) => Math.atan2(a.im, a.re);

// Standard gate matrices (2x2)
export const GATES = {
  H: {
    name: 'Hadamard',
    symbol: 'H',
    color: '#ffd700',
    matrix: [
      [complex(SQRT2_INV), complex(SQRT2_INV)],
      [complex(SQRT2_INV), complex(-SQRT2_INV)]
    ],
    description: 'Creates superposition — puts the qubit in an equal mix of |0⟩ and |1⟩'
  },
  X: {
    name: 'Pauli-X',
    symbol: 'X',
    color: '#ff4444',
    matrix: [
      [complex(0), complex(1)],
      [complex(1), complex(0)]
    ],
    description: 'Quantum NOT gate — flips |0⟩ to |1⟩ and vice versa'
  },
  Y: {
    name: 'Pauli-Y',
    symbol: 'Y',
    color: '#44ff44',
    matrix: [
      [complex(0), complex(0, -1)],
      [complex(0, 1), complex(0)]
    ],
    description: 'Rotates around the Y-axis — combines bit flip with phase flip'
  },
  Z: {
    name: 'Pauli-Z',
    symbol: 'Z',
    color: '#4488ff',
    matrix: [
      [complex(1), complex(0)],
      [complex(0), complex(-1)]
    ],
    description: 'Phase flip — leaves |0⟩ unchanged, flips the sign of |1⟩'
  },
  S: {
    name: 'S-Gate',
    symbol: 'S',
    color: '#aa44ff',
    matrix: [
      [complex(1), complex(0)],
      [complex(0), complex(0, 1)]
    ],
    description: 'Quarter turn — adds a 90° phase to |1⟩'
  },
  T: {
    name: 'T-Gate',
    symbol: 'T',
    color: '#44ffdd',
    matrix: [
      [complex(1), complex(0)],
      [complex(0), complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]
    ],
    description: 'Eighth turn — adds a 45° phase to |1⟩. Key for universal quantum computing'
  }
};

// Initial |0⟩ state
export function initialState() {
  return [complex(1), complex(0)];
}

// Apply a 2x2 gate matrix to a qubit state [alpha, beta]
export function applyGate(state, gateName) {
  const gate = GATES[gateName];
  if (!gate) throw new Error(`Unknown gate: ${gateName}`);
  const [[a, b], [c, d]] = gate.matrix;
  const [alpha, beta] = state;
  return [
    cadd(cmul(a, alpha), cmul(b, beta)),
    cadd(cmul(c, alpha), cmul(d, beta))
  ];
}

// Convert state to Bloch sphere coordinates (x, y, z)
export function stateToBloch(state) {
  const [alpha, beta] = state;

  // theta = 2 * acos(|alpha|)
  const alphaAbs = cabs(alpha);
  const theta = 2 * Math.acos(Math.min(1, Math.max(0, alphaAbs)));

  // phi = arg(beta) - arg(alpha)
  let phi = 0;
  if (cabs(beta) > 1e-10) {
    phi = cphase(beta) - cphase(alpha);
  }

  return {
    x: Math.sin(theta) * Math.cos(phi),
    y: Math.sin(theta) * Math.sin(phi),
    z: Math.cos(theta)
  };
}

// Format state as ket notation string
export function stateToNotation(state) {
  const [alpha, beta] = state;

  const formatComplex = (c) => {
    const r = Math.round(c.re * 1000) / 1000;
    const i = Math.round(c.im * 1000) / 1000;
    if (Math.abs(i) < 0.001) return `${r}`;
    if (Math.abs(r) < 0.001) return `${i}i`;
    return `${r}${i >= 0 ? '+' : ''}${i}i`;
  };

  const aStr = formatComplex(alpha);
  const bStr = formatComplex(beta);

  // Clean up common cases
  if (Math.abs(cnorm2(beta)) < 0.001) return '|0⟩';
  if (Math.abs(cnorm2(alpha)) < 0.001) return '|1⟩';

  return `${aStr}|0⟩ + ${bStr}|1⟩`;
}

// Probability of measuring |0⟩ and |1⟩
export function probabilities(state) {
  return {
    p0: cnorm2(state[0]),
    p1: cnorm2(state[1])
  };
}
