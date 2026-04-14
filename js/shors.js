// shors.js — Shor's Factoring Algorithm: "Breaking the Lock" visualization
import * as THREE from 'three';

export class ShorsFactoring {
  constructor() {
    this.group = new THREE.Group();
    this.running = false;
    this.onComplete = null;
    this.paused = false;

    // Classical side state
    this.classicalStep = 0;
    this.classicalMax = 150;
    this.classicalProjectiles = [];
    this.classicalCounterSprite = null;
    this.classicalCounterCanvas = null;
    this.classicalCounterCtx = null;
    this.classicalCounterTex = null;

    // Quantum side state
    this.quantumIteration = 0;
    this.quantumMax = 20;
    this.quantumComplete = false;
    this.classicalComplete = false;

    // Lock pieces
    this.lockBody = null;
    this.lockShackle = null;
    this.lockLeftHalf = null;
    this.lockRightHalf = null;
    this.lockSplit = false;
    this.lockSplitProgress = 0;

    // Quantum wave plane
    this.wavePlane = null;
    this.interferenceStripes = [];

    // Timing
    this.stepInterval = 80; // ms per classical step
    this.quantumStepInterval = 300; // ms per quantum iteration
    this.lastClassicalStepTime = 0;
    this.lastQuantumStepTime = 0;

    this._buildScene();
    this.group.visible = false;
  }

  _buildScene() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.classicalProjectiles = [];
    this.interferenceStripes = [];

    // Title labels
    this._addLabel('Classical Trial Division', -1.4, 1.4, 0, '#ff8844');
    this._addLabel("Shor's Quantum Factoring", 1.4, 1.4, 0, '#44aaff');

    // --- Padlock (center) ---
    this._buildLock();

    // --- Classical side: counter label ---
    this._buildClassicalCounter();

    // --- Quantum side: wave plane ---
    this._buildWavePlane();

    // --- Quantum side: interference stripes ---
    this._buildInterferenceStripes();
  }

  _buildLock() {
    // Lock body — two halves so we can split them later
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.35, 0.15);

    const leftBodyMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.9 });
    this.lockLeftHalf = new THREE.Mesh(bodyGeo, leftBodyMat);
    this.lockLeftHalf.position.set(-0.1, -0.15, 0);
    this.lockLeftHalf.scale.x = 0.5;
    this.group.add(this.lockLeftHalf);

    const rightBodyMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.9 });
    this.lockRightHalf = new THREE.Mesh(bodyGeo, rightBodyMat);
    this.lockRightHalf.position.set(0.1, -0.15, 0);
    this.lockRightHalf.scale.x = 0.5;
    this.group.add(this.lockRightHalf);

    // Shackle arc (half torus)
    const shackleGeo = new THREE.TorusGeometry(0.15, 0.03, 12, 24, Math.PI);
    const shackleMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    this.lockShackle = new THREE.Mesh(shackleGeo, shackleMat);
    this.lockShackle.position.set(0, 0.02, 0);
    this.lockShackle.rotation.z = 0; // Arc opens upward
    this.group.add(this.lockShackle);

    // Keyhole indicator
    const keyholeGeo = new THREE.CircleGeometry(0.03, 16);
    const keyholeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const keyhole = new THREE.Mesh(keyholeGeo, keyholeMat);
    keyhole.position.set(0, -0.12, 0.08);
    this.group.add(keyhole);
  }

  _buildClassicalCounter() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    this.classicalCounterCanvas = canvas;
    this.classicalCounterCtx = ctx;

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    this.classicalCounterTex = tex;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.classicalCounterSprite = new THREE.Sprite(mat);
    this.classicalCounterSprite.position.set(-1.4, -0.8, 0);
    this.classicalCounterSprite.scale.set(1.4, 0.18, 1);
    this.group.add(this.classicalCounterSprite);

    this._updateClassicalCounter(0);
  }

  _updateClassicalCounter(count) {
    const ctx = this.classicalCounterCtx;
    ctx.clearRect(0, 0, 512, 64);
    ctx.fillStyle = '#ff8844';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Divisors tested: ${count}`, 256, 32);
    this.classicalCounterTex.needsUpdate = true;
  }

  _buildWavePlane() {
    const geo = new THREE.PlaneGeometry(1.2, 0.8, 60, 30);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x2266cc,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    this.wavePlane = new THREE.Mesh(geo, mat);
    this.wavePlane.position.set(1.4, -0.15, 0);
    this.group.add(this.wavePlane);
  }

  _buildInterferenceStripes() {
    // Build stripes that will fade in as quantum iterations progress
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.PlaneGeometry(0.08, 0.6);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x44aaff : 0x112244,
        transparent: true,
        opacity: 0
      });
      const stripe = new THREE.Mesh(geo, mat);
      stripe.position.set(1.0 + i * 0.09, -0.15, 0.01);
      this.group.add(stripe);
      this.interferenceStripes.push(stripe);
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

  _spawnProjectile() {
    const geo = new THREE.SphereGeometry(0.04, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6633 });
    const sphere = new THREE.Mesh(geo, mat);
    // Start from left side, fly toward center lock
    sphere.position.set(-2.0, -0.15 + (Math.random() - 0.5) * 0.3, 0);
    sphere.userData = {
      velocity: 0.04 + Math.random() * 0.02,
      bounced: false,
      age: 0
    };
    this.group.add(sphere);
    this.classicalProjectiles.push(sphere);
  }

  start(onComplete = null) {
    this.onComplete = onComplete;
    this.running = true;
    this.paused = false;
    this.classicalStep = 0;
    this.quantumIteration = 0;
    this.classicalComplete = false;
    this.quantumComplete = false;
    this.lockSplit = false;
    this.lockSplitProgress = 0;
    this.lastClassicalStepTime = performance.now();
    this.lastQuantumStepTime = performance.now();

    // Reset lock position
    this.lockLeftHalf.position.set(-0.1, -0.15, 0);
    this.lockLeftHalf.rotation.z = 0;
    this.lockLeftHalf.material.color.set(0x888888);
    this.lockRightHalf.position.set(0.1, -0.15, 0);
    this.lockRightHalf.rotation.z = 0;
    this.lockRightHalf.material.color.set(0x888888);
    this.lockShackle.position.set(0, 0.02, 0);
    this.lockShackle.rotation.z = 0;

    // Reset wave plane
    if (this.wavePlane) {
      const positions = this.wavePlane.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, 0);
      }
      positions.needsUpdate = true;
      this.wavePlane.material.opacity = 0.4;
    }

    // Reset interference stripes
    this.interferenceStripes.forEach(s => {
      s.material.opacity = 0;
    });

    // Clear old projectiles
    this.classicalProjectiles.forEach(p => this.group.remove(p));
    this.classicalProjectiles = [];

    this._updateClassicalCounter(0);
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.classicalStep = 0;
    this.quantumIteration = 0;
    this.classicalComplete = false;
    this.quantumComplete = false;
    this.lockSplit = false;
    this.lockSplitProgress = 0;

    // Reset lock
    if (this.lockLeftHalf) {
      this.lockLeftHalf.position.set(-0.1, -0.15, 0);
      this.lockLeftHalf.rotation.z = 0;
      this.lockLeftHalf.material.color.set(0x888888);
    }
    if (this.lockRightHalf) {
      this.lockRightHalf.position.set(0.1, -0.15, 0);
      this.lockRightHalf.rotation.z = 0;
      this.lockRightHalf.material.color.set(0x888888);
    }
    if (this.lockShackle) {
      this.lockShackle.position.set(0, 0.02, 0);
      this.lockShackle.rotation.z = 0;
    }

    // Reset wave
    if (this.wavePlane) {
      const positions = this.wavePlane.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, 0);
      }
      positions.needsUpdate = true;
      this.wavePlane.material.opacity = 0.4;
    }

    // Reset stripes
    this.interferenceStripes.forEach(s => {
      s.material.opacity = 0;
    });

    // Clear projectiles
    this.classicalProjectiles.forEach(p => this.group.remove(p));
    this.classicalProjectiles = [];

    this._updateClassicalCounter(0);
  }

  update(time) {
    if (!this.running || this.paused) return;

    // --- Classical side: spawn projectiles that fly at the lock and bounce ---
    if (!this.classicalComplete && time - this.lastClassicalStepTime > this.stepInterval) {
      this.lastClassicalStepTime = time;
      this.classicalStep++;
      this._spawnProjectile();
      this._updateClassicalCounter(this.classicalStep);

      if (this.classicalStep >= this.classicalMax) {
        this.classicalComplete = true;
      }
    }

    // Update projectiles
    for (let i = this.classicalProjectiles.length - 1; i >= 0; i--) {
      const p = this.classicalProjectiles[i];
      p.userData.age++;

      if (!p.userData.bounced) {
        p.position.x += p.userData.velocity;
        // Bounce when reaching the lock
        if (p.position.x >= -0.3) {
          p.userData.bounced = true;
          p.material.color.set(0x993322); // Darken on bounce
          p.userData.velocity = -0.03 - Math.random() * 0.02;
          p.userData.verticalVel = (Math.random() - 0.5) * 0.03;
        }
      } else {
        p.position.x += p.userData.velocity;
        p.position.y += (p.userData.verticalVel || 0);
        p.material.opacity = Math.max(0, 1 - p.userData.age / 60);
      }

      // Remove old projectiles
      if (p.userData.age > 60) {
        this.group.remove(p);
        this.classicalProjectiles.splice(i, 1);
      }
    }

    // --- Quantum side: animate wave plane and build interference ---
    if (this.wavePlane) {
      const positions = this.wavePlane.geometry.attributes.position;
      const progress = Math.min(this.quantumIteration / this.quantumMax, 1);
      const amplitude = 0.05 + progress * 0.1;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = Math.sin(x * 8 - time * 0.003) * amplitude *
                  Math.cos(y * 5 + time * 0.002) * (0.3 + progress * 0.7);
        positions.setZ(i, z);
      }
      positions.needsUpdate = true;
    }

    // Quantum iterations (slower than classical steps)
    if (!this.quantumComplete && time - this.lastQuantumStepTime > this.quantumStepInterval) {
      this.lastQuantumStepTime = time;
      this.quantumIteration++;

      // Fade in interference stripes progressively
      const stripeProgress = this.quantumIteration / this.quantumMax;
      this.interferenceStripes.forEach((stripe, idx) => {
        const threshold = idx / this.interferenceStripes.length;
        if (stripeProgress > threshold) {
          const localProgress = (stripeProgress - threshold) * this.interferenceStripes.length;
          stripe.material.opacity = Math.min(0.7, localProgress * 0.7);
        }
      });

      // When quantum finishes, split the lock open
      if (this.quantumIteration >= this.quantumMax) {
        this.quantumComplete = true;
        this.lockSplit = true;
      }
    }

    // --- Lock splitting animation ---
    if (this.lockSplit && this.lockSplitProgress < 1) {
      this.lockSplitProgress = Math.min(1, this.lockSplitProgress + 0.015);
      const t = this.lockSplitProgress;
      const ease = t * t * (3 - 2 * t); // smoothstep

      // Left half slides left and rotates
      this.lockLeftHalf.position.x = -0.1 - ease * 0.5;
      this.lockLeftHalf.rotation.z = ease * 0.3;
      this.lockLeftHalf.material.color.setHSL(0.1, 0.8, 0.4 + ease * 0.3);

      // Right half slides right and rotates
      this.lockRightHalf.position.x = 0.1 + ease * 0.5;
      this.lockRightHalf.rotation.z = -ease * 0.3;
      this.lockRightHalf.material.color.setHSL(0.6, 0.8, 0.4 + ease * 0.3);

      // Shackle pops up
      this.lockShackle.position.y = 0.02 + ease * 0.4;
      this.lockShackle.rotation.z = ease * 0.5;
    }

    // Check completion: quantum must be done, and lock split animation finished,
    // and classical must also be done (it will finish later)
    if (this.quantumComplete && this.classicalComplete && this.lockSplitProgress >= 1) {
      this.running = false;
      if (this.onComplete) this.onComplete();
    }
  }

  getStats() {
    return {
      classicalSteps: this.classicalStep,
      classicalMax: this.classicalMax,
      quantumIterations: this.quantumIteration,
      quantumMax: this.quantumMax,
      classicalComplete: this.classicalComplete,
      quantumComplete: this.quantumComplete,
      lockSplit: this.lockSplit,
      speedup: this.classicalComplete && this.quantumComplete
        ? Math.round(this.classicalMax / this.quantumMax)
        : null
    };
  }
}
