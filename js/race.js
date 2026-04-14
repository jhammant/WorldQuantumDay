// race.js — Grover's Algorithm vs Classical Search race visualization
import * as THREE from 'three';

export class QuantumRace {
  constructor() {
    this.group = new THREE.Group();
    this.running = false;
    this.databaseSize = 256;
    this.gridSize = 16; // 16x16 = 256
    this.classicalCubes = [];
    this.quantumCubes = [];
    this.targetIndex = 0;
    this.classicalStep = 0;
    this.quantumIteration = 0;
    this.maxQuantumIterations = 0;
    this.classicalFound = false;
    this.quantumFound = false;
    this.stepInterval = 0;
    this.lastStepTime = 0;
    this.quantumPhase = 0; // For wave animation
    this.onComplete = null;
    this.paused = false;

    this._buildScene();
    this.group.visible = false;
  }

  _buildScene() {
    // Clear existing
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.classicalCubes = [];
    this.quantumCubes = [];

    const cubeSize = 0.08;
    const gap = 0.02;
    const stride = cubeSize + gap;

    // Title labels
    this._addLabel('Classical Search', -1.2, 1.2, 0, '#ff8844');
    this._addLabel('Grover\'s Quantum Search', 1.2, 1.2, 0, '#44aaff');

    // Classical grid (left side)
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x333344,
          transparent: true,
          opacity: 0.6
        });
        const cube = new THREE.Mesh(geo, mat);
        const x = -1.2 + (j - this.gridSize / 2) * stride;
        const y = (i - this.gridSize / 2) * stride;
        cube.position.set(x, -y, 0);
        this.group.add(cube);
        this.classicalCubes.push(cube);
      }
    }

    // Quantum grid (right side)
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x333344,
          transparent: true,
          opacity: 0.6
        });
        const cube = new THREE.Mesh(geo, mat);
        const x = 1.2 + (j - this.gridSize / 2) * stride;
        const y = (i - this.gridSize / 2) * stride;
        cube.position.set(x, -y, 0);
        this.group.add(cube);
        this.quantumCubes.push(cube);
      }
    }
  }

  _addLabel(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.5, 0.2, 1);
    this.group.add(sprite);
  }

  setDatabaseSize(size) {
    this.gridSize = Math.round(Math.sqrt(size));
    this.databaseSize = this.gridSize * this.gridSize;
    this._buildScene();
  }

  start(onComplete = null) {
    this.onComplete = onComplete;
    this.running = true;
    this.paused = false;
    this.classicalFound = false;
    this.quantumFound = false;
    this.classicalStep = 0;
    this.quantumIteration = 0;
    this.quantumPhase = 0;
    this.maxQuantumIterations = Math.round(Math.PI / 4 * Math.sqrt(this.databaseSize));
    this.targetIndex = Math.floor(Math.random() * this.databaseSize);
    this.lastStepTime = performance.now();
    // Classical checks one per step; quantum does one iteration per step
    // Speed: one step every 30ms
    this.stepInterval = 30;

    // Reset all cubes
    [...this.classicalCubes, ...this.quantumCubes].forEach(c => {
      c.material.color.set(0x333344);
      c.material.opacity = 0.6;
      c.scale.set(1, 1, 1);
    });
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.classicalStep = 0;
    this.quantumIteration = 0;
    [...this.classicalCubes, ...this.quantumCubes].forEach(c => {
      c.material.color.set(0x333344);
      c.material.opacity = 0.6;
      c.scale.set(1, 1, 1);
    });
  }

  update(time) {
    if (!this.running || this.paused) return;

    const now = time;
    if (now - this.lastStepTime < this.stepInterval) return;
    this.lastStepTime = now;

    // Classical: check next item
    if (!this.classicalFound && this.classicalStep < this.databaseSize) {
      const cube = this.classicalCubes[this.classicalStep];
      if (this.classicalStep === this.targetIndex) {
        cube.material.color.set(0xffdd00);
        cube.material.opacity = 1;
        cube.scale.set(1.5, 1.5, 1.5);
        this.classicalFound = true;
      } else {
        cube.material.color.set(0xff6633);
        cube.material.opacity = 0.8;
      }
      this.classicalStep++;
    }

    // Quantum: amplitude amplification wave
    if (!this.quantumFound && this.quantumIteration < this.maxQuantumIterations) {
      this.quantumIteration++;
      this.quantumPhase = this.quantumIteration / this.maxQuantumIterations;

      // Visualize wave: all cubes pulse, target gets brighter
      const targetProb = Math.sin((this.quantumIteration / this.maxQuantumIterations) * Math.PI / 2) ** 2;

      for (let i = 0; i < this.quantumCubes.length; i++) {
        const cube = this.quantumCubes[i];
        if (i === this.targetIndex) {
          const brightness = 0.3 + targetProb * 0.7;
          cube.material.color.setHSL(0.6, 0.9, brightness);
          cube.material.opacity = 0.5 + targetProb * 0.5;
          cube.scale.setScalar(1 + targetProb * 0.5);
        } else {
          // Non-target cubes dim as target amplifies
          const wave = Math.sin(time * 0.005 + i * 0.3) * 0.2;
          const nonTargetProb = (1 - targetProb) / (this.databaseSize - 1);
          cube.material.color.setHSL(0.6 + wave * 0.05, 0.7, 0.2 + nonTargetProb * 5);
          cube.material.opacity = 0.3 + nonTargetProb * 3;
        }
      }

      if (this.quantumIteration >= this.maxQuantumIterations) {
        this.quantumFound = true;
        const target = this.quantumCubes[this.targetIndex];
        target.material.color.set(0xffdd00);
        target.material.opacity = 1;
        target.scale.set(1.5, 1.5, 1.5);

        // Dim all others
        this.quantumCubes.forEach((c, i) => {
          if (i !== this.targetIndex) {
            c.material.color.set(0x222244);
            c.material.opacity = 0.3;
            c.scale.set(1, 1, 1);
          }
        });
      }
    }

    // Check if both done
    if (this.classicalFound && this.quantumFound) {
      this.running = false;
      if (this.onComplete) this.onComplete();
    }
  }

  getStats() {
    return {
      classicalSteps: this.classicalStep,
      quantumIterations: this.quantumIteration,
      maxQuantumIterations: this.maxQuantumIterations,
      databaseSize: this.databaseSize,
      classicalFound: this.classicalFound,
      quantumFound: this.quantumFound,
      speedup: this.classicalFound && this.quantumFound
        ? Math.round(this.classicalStep / this.quantumIteration)
        : null
    };
  }
}
