// app.js — Main application bootstrap and orchestration
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlochSphere } from './bloch-sphere.js';
import { AmbientParticles, GateBurstParticles } from './particles.js';
import { QuantumRace } from './race.js';
import { ShorsFactoring } from './shors.js';
import { QuantumOptimization } from './optimization.js';
import { QuantumQKD } from './qkd.js';
import { ARMode } from './ar.js';
import * as Qubit from './qubit.js';

// ——— State ———
let renderer, scene, camera, controls;
let blochSphere, ambientParticles, burstParticles, race, shors, optimization, qkd, arMode;
let composer = null;
let qubitState = Qubit.initialState();
let activePanel = 'hero';
let autoRotate = true;
let easyMode = false;
let gateQueue = [];
let processingGate = false;

// Camera targets per panel — demo panels push camera UP so 3D sits in upper half
const cameraPoses = {
  hero: new THREE.Vector3(0, 0.3, 3.5),
  bridge: new THREE.Vector3(0, 0.3, 3.5),
  'qubit-intro': new THREE.Vector3(0, 0.2, 3),
  playground: new THREE.Vector3(0, 0.4, 3),
  circuits: new THREE.Vector3(0, 0.3, 3.5),
  race: new THREE.Vector3(0, 0.8, 4),
  shors: new THREE.Vector3(0, 0.6, 4),
  optimization: new THREE.Vector3(0, 0.6, 4),
  qkd: new THREE.Vector3(0, 0.5, 4),
  next: new THREE.Vector3(0, 0.2, 3.5)
};

// Expanded gate explanations — normal and easy mode
const GATE_EXPLANATIONS = {
  H: '<strong style="color:#ffd700">Hadamard (H)</strong> — The most important single-qubit gate. Creates equal superposition from |0⟩. No classical equivalent. On the Bloch sphere: 180° rotation around an axis between X and Z.',
  X: '<strong style="color:#ff4444">Pauli-X</strong> — The quantum NOT gate. Flips |0⟩ to |1⟩ and vice versa, just like classical NOT. On the Bloch sphere: 180° rotation around X. Try it after H to see something interesting.',
  Y: '<strong style="color:#44ff44">Pauli-Y</strong> — Combines a bit flip with a phase flip. 180° rotation around the Y-axis. Less common alone, but essential in combinations.',
  Z: '<strong style="color:#4488ff">Pauli-Z</strong> — Phase flip. Leaves |0⟩ alone, flips the sign of |1⟩. If you\'re in superposition (H first), Z changes the phase without changing probabilities.',
  S: '<strong style="color:#aa44ff">S-Gate</strong> — Quarter-turn around Z (90° of phase). Applying S twice gives Z. Like rotating the "phase dial" a quarter turn.',
  T: '<strong style="color:#44ffdd">T-Gate</strong> — Eighth-turn around Z (45° of phase). T twice = S. The T gate + H + CNOT form a <em>universal gate set</em> — any quantum computation can be built from these three.'
};
const GATE_EASY = {
  H: '<strong style="color:#ffd700">H gate</strong> — Makes the qubit "both 0 and 1 at the same time." Like flipping a coin into the air instead of laying it flat.',
  X: '<strong style="color:#ff4444">X gate</strong> — Flips 0 to 1 and 1 to 0. Just like pressing a light switch.',
  Y: '<strong style="color:#44ff44">Y gate</strong> — Flips AND rotates. Like the X gate but with a twist.',
  Z: '<strong style="color:#4488ff">Z gate</strong> — Doesn\'t change 0 or 1, but changes the "hidden angle." Think of it like changing the direction a spinning top wobbles.',
  S: '<strong style="color:#aa44ff">S gate</strong> — A small twist of that hidden angle. Do it twice and you get Z.',
  T: '<strong style="color:#44ffdd">T gate</strong> — An even smaller twist. These tiny twists are building blocks for everything in quantum computing.'
};

// ——— Init ———
async function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.copy(cameraPoses.hero);

  try {
    const { WebGPURenderer } = await import('three/addons/renderers/webgpu/WebGPURenderer.js');
    renderer = new WebGPURenderer({ antialias: true, alpha: true });
    await renderer.init();
  } catch (e) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x060612, 1);
  renderer.xr.enabled = false;
  document.getElementById('three-canvas').appendChild(renderer.domElement);

  if (renderer.isWebGLRenderer) {
    try {
      const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
      const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.2));
      composer.addPass(new OutputPass());
    } catch (e) { console.warn('Post-processing not available:', e); }
  }

  // OrbitControls for Bloch sphere interaction
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enabled = false; // enabled only in playground/qubit-intro

  // Scene objects
  blochSphere = new BlochSphere();
  scene.add(blochSphere.group);

  ambientParticles = new AmbientParticles(350);
  scene.add(ambientParticles.points);

  burstParticles = new GateBurstParticles();
  scene.add(burstParticles.points);

  race = new QuantumRace();
  race.group.scale.set(0.7, 0.7, 0.7);
  race.group.position.y = 0.6;
  scene.add(race.group);

  shors = new ShorsFactoring();
  shors.group.scale.set(0.65, 0.65, 0.65);
  shors.group.position.y = 0.5;
  scene.add(shors.group);

  optimization = new QuantumOptimization();
  optimization.group.scale.set(0.6, 0.6, 0.6);
  optimization.group.position.y = 0.5;
  scene.add(optimization.group);

  qkd = new QuantumQKD();
  qkd.group.scale.set(0.6, 0.6, 0.6);
  qkd.group.position.y = 0.4;
  scene.add(qkd.group);

  arMode = new ARMode(renderer, scene, blochSphere.group);
  setupARButton();

  // Event listeners
  window.addEventListener('resize', onResize);
  setupNavTabs();
  setupStepNav();
  setupGateButtons();
  setupTryHButton();
  setupRaceUI();
  setupShorsUI();
  setupOptimizationUI();
  setupQKDUI();
  setupEasyMode();
  updateStateDisplay();

  // Animation loop
  function animate(time) {
    if (arMode.isActive()) {
      renderer.setAnimationLoop((timestamp, frame) => {
        arMode.updateHitTest(renderer, frame);
        blochSphere.update(timestamp);
        burstParticles.update();
        renderer.render(scene, camera);
      });
      return;
    }

    const t = time || performance.now();

    if (autoRotate && !controls.enabled) {
      blochSphere.group.rotation.y += 0.003;
      blochSphere.group.rotation.x = Math.sin(t * 0.0003) * 0.1;
    }

    if (controls.enabled) {
      controls.update();
    } else {
      const target = cameraPoses[activePanel] || cameraPoses.hero;
      camera.position.lerp(target, 0.04);
    }

    blochSphere.update(t);
    ambientParticles.update(t);
    burstParticles.update();
    race.update(t);
    shors.update(t);
    optimization.update(t);
    qkd.update(t);
    updateDemoStats();

    if (composer) { composer.render(); } else { renderer.render(scene, camera); }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ——— All visualizations ———
const allVizGroups = () => [race, shors, optimization, qkd];

function hideAllViz() {
  allVizGroups().forEach(v => { if (v) v.group.visible = false; });
}

// ——— Tab navigation ———
function setupNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.panel;
      if (panel) switchPanel(panel);
    });
  });
}

function setupStepNav() {
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) switchPanel(target);
    });
  });
}

function switchPanel(id) {
  if (activePanel === id) return;

  // Hide annotations from qubit-intro if leaving
  if (activePanel === 'qubit-intro') blochSphere.hideAnnotations();

  activePanel = id;

  // Update tab active state
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.panel === id);
  });

  // Hide all panels, show active
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${id}`);
  if (panel) panel.classList.add('active');

  // State panel visible in playground
  document.getElementById('state-panel').classList.toggle('active', id === 'playground');

  // Default: sphere visible, auto-rotate, particles on, all viz hidden
  const demoTabs = ['race', 'shors', 'optimization', 'qkd'];
  const blochVisible = !demoTabs.includes(id);
  const particlesVisible = blochVisible;
  const interactiveSphere = ['playground', 'qubit-intro'].includes(id);

  autoRotate = !interactiveSphere;
  controls.enabled = interactiveSphere;
  if (!interactiveSphere) {
    // Reset camera to target when leaving interactive mode
    camera.position.copy(cameraPoses[id] || cameraPoses.hero);
    controls.reset();
  }
  blochSphere.group.visible = blochVisible;
  if (blochVisible && !autoRotate && !interactiveSphere) blochSphere.group.rotation.set(0, 0, 0);
  ambientParticles.points.visible = particlesVisible;
  hideAllViz();

  // Panel-specific 3D
  if (id === 'qubit-intro') blochSphere.showAnnotations();
  if (id === 'race') race.group.visible = true;
  if (id === 'shors') shors.group.visible = true;
  if (id === 'optimization') optimization.group.visible = true;
  if (id === 'qkd') qkd.group.visible = true;
}

// ——— Gate buttons ———
function setupGateButtons() {
  document.querySelectorAll('.gate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gateName = btn.dataset.gate;
      if (gateName === 'RESET') { resetQubit(); return; }
      applyGateAnimated(gateName);
    });
  });
}

function setupTryHButton() {
  const btn = document.getElementById('try-h-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      resetQubit();
      setTimeout(() => {
        applyGateAnimated('H');
        switchPanel('playground');
      }, 100);
    });
  }
}

function applyGateAnimated(gateName) {
  if (processingGate) { gateQueue.push(gateName); return; }
  processingGate = true;

  const gate = Qubit.GATES[gateName];
  const newState = Qubit.applyGate(qubitState, gateName);
  const newBloch = Qubit.stateToBloch(newState);

  burstParticles.burst(blochSphere.currentBloch, gate.color);
  showGateInfo(gateName);

  blochSphere.animateTo(newBloch, gate.color, () => {
    qubitState = newState;
    updateStateDisplay();
    processingGate = false;
    if (gateQueue.length > 0) applyGateAnimated(gateQueue.shift());
  });
  updateStateDisplay(newState);
}

function resetQubit() {
  qubitState = Qubit.initialState();
  blochSphere.animateTo(Qubit.stateToBloch(qubitState), '#00ffcc');
  updateStateDisplay();
  const info = document.getElementById('gate-info');
  if (info) info.innerHTML = 'Reset to |0⟩. Click a gate to see what it does.';
}

function updateStateDisplay(state = null) {
  const s = state || qubitState;
  const notation = document.getElementById('state-notation');
  if (notation) notation.textContent = `|ψ⟩ = ${Qubit.stateToNotation(s)}`;
  const p = Qubit.probabilities(s);
  const bar0 = document.getElementById('prob-bar-0');
  const bar1 = document.getElementById('prob-bar-1');
  const pct0 = document.getElementById('prob-pct-0');
  const pct1 = document.getElementById('prob-pct-1');
  if (bar0) bar0.style.width = `${p.p0 * 100}%`;
  if (bar1) bar1.style.width = `${p.p1 * 100}%`;
  if (pct0) pct0.textContent = `${Math.round(p.p0 * 100)}%`;
  if (pct1) pct1.textContent = `${Math.round(p.p1 * 100)}%`;
}

function showGateInfo(gateName) {
  const info = document.getElementById('gate-info');
  if (!info) return;
  const src = easyMode ? GATE_EASY : GATE_EXPLANATIONS;
  if (src[gateName]) info.innerHTML = src[gateName];
}

// ——— Easy Mode ———
function setupEasyMode() {
  const toggle = document.getElementById('easy-mode-toggle');
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    easyMode = toggle.checked;
    document.body.classList.toggle('easy-mode', easyMode);
  });
}

// ——— Demo UI helpers ———
function setupDemoUI(prefix, viz, onComplete) {
  const startBtn = document.getElementById(`${prefix}-start`);
  const resetBtn = document.getElementById(`${prefix}-reset`);
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      viz.start(() => {
        if (onComplete) onComplete(viz.getStats());
      });
      const resultEl = document.getElementById(`${prefix}-result`);
      if (resultEl) resultEl.style.opacity = '0';
      const narration = document.getElementById(`${prefix}-narration`);
      if (narration) narration.textContent = '';
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      viz.reset();
      const resultEl = document.getElementById(`${prefix}-result`);
      if (resultEl) resultEl.style.opacity = '0';
      const narration = document.getElementById(`${prefix}-narration`);
      if (narration) narration.textContent = '';
      const classicalEl = document.getElementById(`${prefix}-classical-count`);
      const quantumEl = document.getElementById(`${prefix}-quantum-count`);
      if (classicalEl) classicalEl.textContent = classicalEl.dataset.default || '';
      if (quantumEl) quantumEl.textContent = quantumEl.dataset.default || '';
    });
  }
}

// ——— Race UI ———
function setupRaceUI() {
  const sizeSelect = document.getElementById('race-size');
  const startBtn = document.getElementById('race-start');
  const resetBtn = document.getElementById('race-reset');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (sizeSelect) race.setDatabaseSize(parseInt(sizeSelect.value));
      race.start(() => {
        const stats = race.getStats();
        const resultEl = document.getElementById('race-result');
        if (resultEl) {
          resultEl.textContent = `Quantum found it ${stats.speedup}× faster! (${stats.quantumIterations} vs ${stats.classicalSteps} steps). Quadratic speedup — applies to any unstructured search.`;
          resultEl.style.opacity = '1';
        }
      });
      const resultEl = document.getElementById('race-result');
      if (resultEl) resultEl.style.opacity = '0';
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      race.reset();
      const el = document.getElementById('race-result');
      if (el) el.style.opacity = '0';
      const n = document.getElementById('race-narration');
      if (n) n.textContent = '';
    });
  }
}

// ——— Shor's UI ———
function setupShorsUI() {
  setupDemoUI('shors', shors, (stats) => {
    const el = document.getElementById('shors-result');
    if (el) {
      el.textContent = `Lock broken! Exponential speedup — classical factoring time grows exponentially with key size; Shor's grows polynomially.`;
      el.style.opacity = '1';
    }
  });
}

// ——— Optimization UI ———
function setupOptimizationUI() {
  setupDemoUI('opt', optimization, (stats) => {
    const el = document.getElementById('opt-result');
    if (el) {
      el.textContent = stats && stats.speedup
        ? `Quantum found the optimal route ${stats.speedup}× faster! Nearest-term quantum advantage — works on today's noisy hardware.`
        : `Quantum converged on the optimal route! Optimization is the nearest-term commercial quantum application.`;
      el.style.opacity = '1';
    }
  });
}

// ——— QKD UI ———
function setupQKDUI() {
  setupDemoUI('qkd', qkd, (stats) => {
    const el = document.getElementById('qkd-result');
    if (el) {
      el.textContent = `Eavesdropper detected! QKD provides provable security based on physics, not computational difficulty.`;
      el.style.opacity = '1';
    }
  });
}

// ——— Live stats/narration for all demos ———
function updateDemoStats() {
  // Grover's race
  if (race.running) {
    const s = race.getStats();
    const ce = document.getElementById('race-classical-count');
    const qe = document.getElementById('race-quantum-count');
    if (ce) ce.textContent = `Classical: ${s.classicalSteps}/${s.databaseSize}`;
    if (qe) qe.textContent = `Grover: ${s.quantumIterations}/${s.maxQuantumIterations}`;
    const n = document.getElementById('race-narration');
    if (n) {
      const pct = s.quantumIterations / s.maxQuantumIterations;
      if (pct < 0.1) n.textContent = 'All items in superposition — equal probability';
      else if (pct < 0.7) n.textContent = 'Amplitude amplification — target probability growing each round';
      else if (!s.quantumFound) n.textContent = 'Nearly there — target probability approaching 100%';
      else n.textContent = 'Target found! Measurement collapses to the answer.';
    }
  }

  // Shor's
  if (shors.running) {
    const s = shors.getStats();
    const ce = document.getElementById('shors-classical-count');
    const qe = document.getElementById('shors-quantum-count');
    if (ce) ce.textContent = `Classical: ${s.classicalSteps} divisors tested`;
    if (qe) qe.textContent = `Quantum: ${s.quantumIterations}/${s.quantumMax} iterations`;
    const n = document.getElementById('shors-narration');
    if (n) {
      const pct = s.quantumIterations / s.quantumMax;
      if (pct < 0.2) n.textContent = 'Quantum Fourier Transform — finding hidden periodicity';
      else if (pct < 0.7) n.textContent = 'Interference building — amplifying the period signal';
      else if (!s.quantumComplete) n.textContent = 'Period detected — computing factors...';
      else n.textContent = 'Factors found! Lock broken.';
    }
  }

  // Optimization
  if (optimization.running) {
    const s = optimization.getStats();
    const ce = document.getElementById('opt-classical-count');
    const qe = document.getElementById('opt-quantum-count');
    if (ce) ce.textContent = `Paths tested: ${s.classicalPathsTested}/${s.totalPermutations.toLocaleString()}`;
    if (qe) qe.textContent = `QAOA iteration: ${s.quantumIterations}/${s.maxQuantumIterations}`;
    const n = document.getElementById('opt-narration');
    if (n) {
      const pct = s.quantumIterations / s.maxQuantumIterations;
      if (pct < 0.15) n.textContent = 'All routes in superposition — exploring simultaneously';
      else if (pct < 0.6) n.textContent = 'Variational optimization — shorter routes getting amplified';
      else if (!s.quantumDone) n.textContent = 'Converging on optimal route...';
      else n.textContent = 'Optimal route found!';
    }
  }

  // QKD
  if (qkd.running) {
    const s = qkd.getStats();
    const ce = document.getElementById('qkd-classical-count');
    const qe = document.getElementById('qkd-quantum-count');
    if (ce) ce.textContent = `Classical: Eve undetected`;
    if (qe) qe.textContent = `Quantum: ${s.photonsSent}/${s.totalPhotons} photons`;
    const n = document.getElementById('qkd-narration');
    if (n) {
      if (s.phase === 'sending') n.textContent = 'Sending photons — Eve is intercepting...';
      else if (s.phase === 'detecting') n.textContent = 'Comparing measurements — error rate too high!';
      else if (s.phase === 'complete') n.textContent = 'Eavesdropper detected! Channel secured.';
    }
  }
}

// ——— AR Button ———
function setupARButton() {
  const btn = document.getElementById('ar-button');
  if (!btn) return;
  setTimeout(() => {
    if (arMode.supported) {
      btn.style.display = 'flex';
      btn.addEventListener('click', async () => {
        const started = await arMode.startSession();
        if (started) {
          document.getElementById('nav-tabs').style.display = 'none';
          document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
          document.getElementById('state-panel').classList.remove('active');
          document.getElementById('ar-overlay').style.display = 'flex';
          arMode.onSessionEnd = () => {
            document.getElementById('nav-tabs').style.display = 'flex';
            document.getElementById('ar-overlay').style.display = 'none';
            switchPanel('hero');
          };
        }
      });
    }
  }, 1000);
}

// ——— Resize ———
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

// ——— Start ———
init().catch(err => {
  console.error('Init failed:', err);
  document.getElementById('loading').innerHTML = 'Failed to initialize. Please try a modern browser.';
});
