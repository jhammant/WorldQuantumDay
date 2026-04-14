// optimization.js — Quantum Route Finder (Traveling Salesman) visualization
import * as THREE from 'three';

export class QuantumOptimization {
  constructor() {
    this.group = new THREE.Group();
    this.running = false;
    this.paused = false;
    this.onComplete = null;

    this.numCities = 8;
    this.totalPermutations = 40320; // 8!
    this.maxQuantumIterations = 30;

    this.classicalStep = 0;
    this.quantumIteration = 0;
    this.classicalDone = false;
    this.quantumDone = false;
    this.lastClassicalStepTime = 0;
    this.lastQuantumStepTime = 0;
    this.classicalInterval = 60;
    this.quantumInterval = 100;

    // City positions (unit circle, rough)
    this.cityPositions = [];
    this.optimalRoute = [];
    this.optimalDistance = Infinity;
    this.classicalPermutations = [];
    this.classicalBestDistance = Infinity;
    this.classicalBestRoute = [];
    this.classicalCurrentRoute = [];
    this.classicalCurrentDistance = 0;

    // Scene objects
    this.classicalNodes = [];
    this.quantumNodes = [];
    this.classicalEdges = [];
    this.quantumEdges = [];
    this.classicalPathEdges = [];
    this.quantumGlowEdges = [];
    this.classicalLabel = null;
    this.quantumLabel = null;
    this.classicalCounterSprite = null;
    this.quantumCounterSprite = null;
    this.classicalDistLabel = null;
    this.quantumDistLabel = null;

    this._generateCities();
    this._computeOptimalRoute();
    this._generateClassicalPermutations();
    this._buildScene();
    this.group.visible = false;
  }

  _generateCities() {
    this.cityPositions = [];
    for (let i = 0; i < this.numCities; i++) {
      const angle = (i / this.numCities) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 0.55 + (Math.random() - 0.5) * 0.15;
      this.cityPositions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
  }

  _distance(a, b) {
    const dx = this.cityPositions[a].x - this.cityPositions[b].x;
    const dy = this.cityPositions[a].y - this.cityPositions[b].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _routeDistance(route) {
    let dist = 0;
    for (let i = 0; i < route.length; i++) {
      dist += this._distance(route[i], route[(i + 1) % route.length]);
    }
    return dist;
  }

  _computeOptimalRoute() {
    // Brute-force find the true optimal among all permutations of cities 1..7 (fix city 0)
    const rest = [];
    for (let i = 1; i < this.numCities; i++) rest.push(i);

    this.optimalDistance = Infinity;
    this.optimalRoute = [];

    const permute = (arr, l = 0) => {
      if (l === arr.length - 1) {
        const route = [0, ...arr];
        const d = this._routeDistance(route);
        if (d < this.optimalDistance) {
          this.optimalDistance = d;
          this.optimalRoute = route.slice();
        }
        return;
      }
      for (let i = l; i < arr.length; i++) {
        [arr[l], arr[i]] = [arr[i], arr[l]];
        permute(arr, l + 1);
        [arr[l], arr[i]] = [arr[i], arr[l]];
      }
    };
    permute(rest);
  }

  _generateClassicalPermutations() {
    // Generate totalPermutations random permutations (shuffles of cities)
    this.classicalPermutations = [];
    for (let p = 0; p < this.totalPermutations; p++) {
      const route = [0];
      const remaining = [];
      for (let i = 1; i < this.numCities; i++) remaining.push(i);
      // Fisher-Yates shuffle
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      route.push(...remaining);
      this.classicalPermutations.push(route);
    }
    // Ensure the optimal route appears somewhere in the last quarter
    const insertAt = Math.floor(this.totalPermutations * 0.75 + Math.random() * this.totalPermutations * 0.2);
    this.classicalPermutations[Math.min(insertAt, this.totalPermutations - 1)] = this.optimalRoute.slice();
  }

  _edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  _buildScene() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.classicalNodes = [];
    this.quantumNodes = [];
    this.classicalEdges = {};
    this.quantumEdges = {};
    this.classicalPathEdges = [];
    this.quantumGlowEdges = [];

    const leftOffset = -1.2;
    const rightOffset = 1.2;

    // Title labels
    this._addLabel('Classical Brute Force', leftOffset, 1.15, 0, '#ff8844');
    this._addLabel('Quantum QAOA', rightOffset, 1.15, 0, '#44aaff');

    // Counter labels (will be updated dynamically)
    this.classicalCounterSprite = this._addDynamicLabel('Paths tested: 0 / 40,320', leftOffset, -0.95, 0, '#ff8844');
    this.quantumCounterSprite = this._addDynamicLabel('Iterations: 0 / 30', rightOffset, -0.95, 0, '#44aaff');

    // Distance labels
    this.classicalDistLabel = this._addDynamicLabel('', leftOffset, -1.1, 0, '#ffaa66');
    this.quantumDistLabel = this._addDynamicLabel('', rightOffset, -1.1, 0, '#66ccff');

    // Build both sides
    this._buildSide(leftOffset, this.classicalNodes, this.classicalEdges);
    this._buildSide(rightOffset, this.quantumNodes, this.quantumEdges);

    // Create classical highlighted-path line objects (reusable)
    for (let i = 0; i < this.numCities; i++) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.9, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      this.group.add(line);
      this.classicalPathEdges.push({ line, geo, offset: leftOffset });
    }

    // Create quantum glow edge objects for the optimal route
    for (let i = 0; i < this.numCities; i++) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      this.group.add(line);

      const a = this.optimalRoute[i];
      const b = this.optimalRoute[(i + 1) % this.numCities];
      const posArr = line.geometry.attributes.position.array;
      posArr[0] = this.cityPositions[a].x + rightOffset;
      posArr[1] = this.cityPositions[a].y;
      posArr[2] = 0;
      posArr[3] = this.cityPositions[b].x + rightOffset;
      posArr[4] = this.cityPositions[b].y;
      posArr[5] = 0;
      line.geometry.attributes.position.needsUpdate = true;

      this.quantumGlowEdges.push(line);
    }
  }

  _buildSide(xOffset, nodesArr, edgesMap) {
    // Draw all possible edges as thin dim lines
    for (let i = 0; i < this.numCities; i++) {
      for (let j = i + 1; j < this.numCities; j++) {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array([
          this.cityPositions[i].x + xOffset, this.cityPositions[i].y, 0,
          this.cityPositions[j].x + xOffset, this.cityPositions[j].y, 0
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({
          color: 0x444466,
          transparent: true,
          opacity: 0.2
        });
        const line = new THREE.Line(geo, mat);
        this.group.add(line);
        edgesMap[this._edgeKey(i, j)] = line;
      }
    }

    // Draw city nodes
    for (let i = 0; i < this.numCities; i++) {
      const geo = new THREE.SphereGeometry(0.04, 12, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xaaaacc });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(
        this.cityPositions[i].x + xOffset,
        this.cityPositions[i].y,
        0
      );
      this.group.add(sphere);
      nodesArr.push(sphere);
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
    return sprite;
  }

  _addDynamicLabel(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.5, 0.18, 1);
    this.group.add(sprite);
    sprite.userData = { canvas, color };
    return sprite;
  }

  _updateDynamicLabel(sprite, text) {
    const { canvas, color } = sprite.userData;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);
    sprite.material.map.needsUpdate = true;
  }

  start(onComplete = null) {
    this.onComplete = onComplete;
    this.running = true;
    this.paused = false;
    this.classicalStep = 0;
    this.quantumIteration = 0;
    this.classicalDone = false;
    this.quantumDone = false;
    this.classicalBestDistance = Infinity;
    this.classicalBestRoute = [];
    this.classicalCurrentRoute = [];
    this.classicalCurrentDistance = 0;
    this.lastClassicalStepTime = performance.now();
    this.lastQuantumStepTime = performance.now();

    // Reset edge colors
    for (const key of Object.keys(this.classicalEdges)) {
      this.classicalEdges[key].material.color.set(0x444466);
      this.classicalEdges[key].material.opacity = 0.2;
    }
    for (const key of Object.keys(this.quantumEdges)) {
      this.quantumEdges[key].material.color.set(0x334466);
      this.quantumEdges[key].material.opacity = 0.15;
    }

    // Set quantum edges to faint blue glow
    for (const key of Object.keys(this.quantumEdges)) {
      this.quantumEdges[key].material.color.set(0x2244aa);
      this.quantumEdges[key].material.opacity = 0.15;
    }

    // Reset path edges
    this.classicalPathEdges.forEach(e => { e.line.visible = false; });
    this.quantumGlowEdges.forEach(e => { e.material.opacity = 0; });

    // Reset node colors
    this.classicalNodes.forEach(n => n.material.color.set(0xaaaacc));
    this.quantumNodes.forEach(n => n.material.color.set(0xaaaacc));

    this._updateDynamicLabel(this.classicalCounterSprite, 'Paths tested: 0 / 40,320');
    this._updateDynamicLabel(this.quantumCounterSprite, 'Iterations: 0 / 30');
    this._updateDynamicLabel(this.classicalDistLabel, '');
    this._updateDynamicLabel(this.quantumDistLabel, '');
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.classicalStep = 0;
    this.quantumIteration = 0;

    for (const key of Object.keys(this.classicalEdges)) {
      this.classicalEdges[key].material.color.set(0x444466);
      this.classicalEdges[key].material.opacity = 0.2;
    }
    for (const key of Object.keys(this.quantumEdges)) {
      this.quantumEdges[key].material.color.set(0x444466);
      this.quantumEdges[key].material.opacity = 0.2;
    }

    this.classicalPathEdges.forEach(e => { e.line.visible = false; });
    this.quantumGlowEdges.forEach(e => { e.material.opacity = 0; });

    this.classicalNodes.forEach(n => n.material.color.set(0xaaaacc));
    this.quantumNodes.forEach(n => n.material.color.set(0xaaaacc));
  }

  update(time) {
    if (!this.running || this.paused) return;

    // Classical side: try one permutation per interval
    if (!this.classicalDone && time - this.lastClassicalStepTime >= this.classicalInterval) {
      this.lastClassicalStepTime = time;

      if (this.classicalStep < this.totalPermutations) {
        const route = this.classicalPermutations[this.classicalStep];
        const dist = this._routeDistance(route);
        this.classicalCurrentRoute = route;
        this.classicalCurrentDistance = dist;

        if (dist < this.classicalBestDistance) {
          this.classicalBestDistance = dist;
          this.classicalBestRoute = route.slice();
        }

        // Show current path being tested
        const leftOffset = -1.2;
        for (let i = 0; i < this.numCities; i++) {
          const a = route[i];
          const b = route[(i + 1) % this.numCities];
          const edge = this.classicalPathEdges[i];
          const posArr = edge.geo.attributes.position.array;
          posArr[0] = this.cityPositions[a].x + leftOffset;
          posArr[1] = this.cityPositions[a].y;
          posArr[2] = 0.01;
          posArr[3] = this.cityPositions[b].x + leftOffset;
          posArr[4] = this.cityPositions[b].y;
          posArr[5] = 0.01;
          edge.geo.attributes.position.needsUpdate = true;
          edge.line.visible = true;
        }

        // Highlight cities in route order with orange tint
        this.classicalNodes.forEach((n, idx) => {
          const posInRoute = route.indexOf(idx);
          if (posInRoute === 0) {
            n.material.color.set(0xffcc00);
          } else {
            n.material.color.set(0xff8844);
          }
        });

        this.classicalStep++;
        this._updateDynamicLabel(
          this.classicalCounterSprite,
          `Paths tested: ${this.classicalStep.toLocaleString()} / 40,320`
        );
        this._updateDynamicLabel(
          this.classicalDistLabel,
          `Best dist: ${this.classicalBestDistance.toFixed(2)} | Current: ${dist.toFixed(2)}`
        );
      }

      if (this.classicalStep >= this.totalPermutations) {
        this.classicalDone = true;
        // Show best route in green
        const route = this.classicalBestRoute;
        const leftOffset = -1.2;
        for (let i = 0; i < this.numCities; i++) {
          const a = route[i];
          const b = route[(i + 1) % this.numCities];
          const edge = this.classicalPathEdges[i];
          const posArr = edge.geo.attributes.position.array;
          posArr[0] = this.cityPositions[a].x + leftOffset;
          posArr[1] = this.cityPositions[a].y;
          posArr[2] = 0.01;
          posArr[3] = this.cityPositions[b].x + leftOffset;
          posArr[4] = this.cityPositions[b].y;
          posArr[5] = 0.01;
          edge.geo.attributes.position.needsUpdate = true;
          edge.line.material.color.set(0x44ff44);
        }
        this.classicalNodes.forEach(n => n.material.color.set(0x44ff44));
      }
    }

    // Quantum side: QAOA iterations
    if (!this.quantumDone && time - this.lastQuantumStepTime >= this.quantumInterval) {
      this.lastQuantumStepTime = time;

      if (this.quantumIteration < this.maxQuantumIterations) {
        this.quantumIteration++;
        const progress = this.quantumIteration / this.maxQuantumIterations;

        // All edges glow faintly blue, pulse with time
        for (const key of Object.keys(this.quantumEdges)) {
          const edge = this.quantumEdges[key];
          const pulse = 0.08 + Math.sin(time * 0.003 + parseInt(key) * 0.5) * 0.04;
          // Fade non-optimal edges as progress increases
          edge.material.opacity = Math.max(0.03, pulse * (1 - progress * 0.8));
          edge.material.color.setHSL(0.6, 0.6, 0.2 + pulse);
        }

        // Optimal route edges brighten to cyan
        const optimalBrightness = progress;
        for (let i = 0; i < this.quantumGlowEdges.length; i++) {
          const line = this.quantumGlowEdges[i];
          line.material.opacity = 0.1 + optimalBrightness * 0.85;
          line.material.color.setHSL(0.5, 0.9, 0.3 + optimalBrightness * 0.4);
        }

        // Quantum nodes: gradually shift toward the optimal route color
        this.quantumNodes.forEach((n, idx) => {
          const isOnOptimal = this.optimalRoute.includes(idx);
          if (isOnOptimal) {
            n.material.color.setHSL(0.5, 0.7, 0.4 + progress * 0.4);
          }
        });

        this._updateDynamicLabel(
          this.quantumCounterSprite,
          `Iterations: ${this.quantumIteration} / 30`
        );

        const estimatedDist = this.optimalDistance + (1 - progress) * 2.0;
        this._updateDynamicLabel(
          this.quantumDistLabel,
          `Route dist: ${estimatedDist.toFixed(2)}`
        );
      }

      if (this.quantumIteration >= this.maxQuantumIterations) {
        this.quantumDone = true;

        // Finalize: optimal edges bright cyan, all other edges nearly invisible
        for (const key of Object.keys(this.quantumEdges)) {
          this.quantumEdges[key].material.opacity = 0.02;
        }
        for (const line of this.quantumGlowEdges) {
          line.material.opacity = 1.0;
          line.material.color.set(0x00ffff);
        }
        this.quantumNodes.forEach(n => n.material.color.set(0x00ffdd));

        this._updateDynamicLabel(
          this.quantumDistLabel,
          `Optimal dist: ${this.optimalDistance.toFixed(2)}`
        );
      }
    }

    // Check completion: quantum finishes first (it's faster for this problem)
    if (this.quantumDone && !this.classicalDone) {
      // Quantum found it; we can call onComplete when quantum finishes
      // but let classical keep running in background
    }
    if (this.quantumDone) {
      // Signal completion when quantum is done
      if (this.onComplete && this.quantumDone) {
        this.running = false;
        this.onComplete();
        this.onComplete = null;
      }
    }
  }

  getStats() {
    return {
      classicalPathsTested: this.classicalStep,
      totalPermutations: this.totalPermutations,
      quantumIterations: this.quantumIteration,
      maxQuantumIterations: this.maxQuantumIterations,
      classicalBestDistance: this.classicalBestDistance,
      optimalDistance: this.optimalDistance,
      classicalDone: this.classicalDone,
      quantumDone: this.quantumDone,
      speedup: this.quantumDone
        ? `${this.maxQuantumIterations} iterations vs ${this.totalPermutations.toLocaleString()} paths`
        : null
    };
  }
}
