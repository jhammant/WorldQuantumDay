// bloch-sphere.js — Three.js Bloch sphere visualization
import * as THREE from 'three';

export class BlochSphere {
  constructor() {
    this.group = new THREE.Group();
    this.stateArrow = null;
    this.trailPoints = [];
    this.trailLine = null;
    this.animating = false;
    this.currentBloch = { x: 0, y: 0, z: 1 }; // |0⟩
    this.targetBloch = { x: 0, y: 0, z: 1 };
    this.animProgress = 1;
    this.animDuration = 600; // ms
    this.animStartTime = 0;
    this.animStartBloch = { x: 0, y: 0, z: 1 };
    this.onAnimComplete = null;

    this._buildSphere();
    this._buildAxes();
    this._buildLabels();
    this._buildAnnotations();
    this._buildStateArrow();
    this._buildTrail();
  }

  _buildSphere() {
    // Main wireframe sphere
    const geo = new THREE.SphereGeometry(1, 32, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3355aa,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    this.sphere = new THREE.Mesh(geo, mat);
    this.group.add(this.sphere);

    // Equator ring
    const eqGeo = new THREE.TorusGeometry(1, 0.005, 8, 64);
    const eqMat = new THREE.MeshBasicMaterial({ color: 0x5577cc, transparent: true, opacity: 0.4 });
    const equator = new THREE.Mesh(eqGeo, eqMat);
    equator.rotation.x = Math.PI / 2;
    this.group.add(equator);

    // Meridian ring (XZ plane)
    const merGeo = new THREE.TorusGeometry(1, 0.005, 8, 64);
    const merMat = new THREE.MeshBasicMaterial({ color: 0x5577cc, transparent: true, opacity: 0.3 });
    const meridian = new THREE.Mesh(merGeo, merMat);
    this.group.add(meridian);

    // Meridian ring (YZ plane)
    const mer2 = new THREE.Mesh(merGeo.clone(), merMat.clone());
    mer2.rotation.y = Math.PI / 2;
    this.group.add(mer2);
  }

  _buildAxes() {
    const axisLength = 1.3;
    const axes = [
      { dir: new THREE.Vector3(0, 0, 1), color: 0x4488ff },  // Z axis (|0⟩/|1⟩)
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff4444 },  // X axis (|+⟩/|-⟩)
      { dir: new THREE.Vector3(0, 1, 0), color: 0x44ff44 },  // Y axis (|i⟩/|-i⟩)
    ];

    axes.forEach(({ dir, color }) => {
      const points = [dir.clone().multiplyScalar(-axisLength), dir.clone().multiplyScalar(axisLength)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
      this.group.add(new THREE.Line(geo, mat));
    });
  }

  _buildLabels() {
    const labels = [
      { text: '|0⟩', pos: [0, 0, 1.45], color: '#4488ff' },
      { text: '|1⟩', pos: [0, 0, -1.45], color: '#4488ff' },
      { text: '|+⟩', pos: [1.45, 0, 0], color: '#ff6666' },
      { text: '|-⟩', pos: [-1.45, 0, 0], color: '#ff6666' },
      { text: '|i⟩', pos: [0, 1.45, 0], color: '#66ff66' },
      { text: '|-i⟩', pos: [0, -1.45, 0], color: '#66ff66' },
    ];

    labels.forEach(({ text, pos, color }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 32);

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(...pos);
      sprite.scale.set(0.5, 0.25, 1);
      this.group.add(sprite);
    });
  }

  _buildAnnotations() {
    this.annotationGroup = new THREE.Group();
    this.annotationGroup.visible = false;

    const annotations = [
      { text: 'Definitely |0⟩', pos: [0.9, 0, 1.2], color: '#88bbff' },
      { text: 'Superposition zone', pos: [1.5, 0, 0], color: '#ffcc44' },
      { text: 'Definitely |1⟩', pos: [0.9, 0, -1.2], color: '#88bbff' },
    ];

    annotations.forEach(({ text, pos, color }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = '22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 24);

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(...pos);
      sprite.scale.set(0.8, 0.15, 1);
      this.annotationGroup.add(sprite);
    });

    this.group.add(this.annotationGroup);
  }

  showAnnotations() { this.annotationGroup.visible = true; }
  hideAnnotations() { this.annotationGroup.visible = false; }

  _buildStateArrow() {
    // Arrow shaft
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    shaftGeo.translate(0, 0.5, 0);
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    this.arrowShaft = new THREE.Mesh(shaftGeo, shaftMat);

    // Arrow head
    const headGeo = new THREE.ConeGeometry(0.06, 0.15, 8);
    headGeo.translate(0, 1.05, 0);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    this.arrowHead = new THREE.Mesh(headGeo, headMat);

    // Arrow group
    this.stateArrow = new THREE.Group();
    this.stateArrow.add(this.arrowShaft);
    this.stateArrow.add(this.arrowHead);

    // Point toward |0⟩ (positive Z)
    this._pointArrowTo(this.currentBloch);
    this.group.add(this.stateArrow);

    // Glowing dot at arrow tip
    const dotGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    this.arrowDot = new THREE.Mesh(dotGeo, dotMat);
    this.group.add(this.arrowDot);
    this._updateDotPosition();
  }

  _buildTrail() {
    const maxPoints = 100;
    const positions = new Float32Array(maxPoints * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.6
    });
    this.trailLine = new THREE.Line(geo, mat);
    this.trailPoints = [];
    this.group.add(this.trailLine);
  }

  _pointArrowTo(bloch) {
    const dir = new THREE.Vector3(bloch.x, bloch.y, bloch.z).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    // Align Y-axis of arrow group with the direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, dir);
    this.stateArrow.quaternion.copy(quaternion);
  }

  _updateDotPosition() {
    const b = this.currentBloch;
    this.arrowDot.position.set(b.x, b.y, b.z);
  }

  // Smoothly animate to new Bloch coordinates
  animateTo(newBloch, gateColor = '#00ffcc', callback = null) {
    this.animStartBloch = { ...this.currentBloch };
    this.targetBloch = { ...newBloch };
    this.animProgress = 0;
    this.animStartTime = performance.now();
    this.animating = true;
    this.onAnimComplete = callback;

    // Set trail and arrow color based on gate
    this.arrowShaft.material.color.set(gateColor);
    this.arrowHead.material.color.set(gateColor);
    this.arrowDot.material.color.set(gateColor);
    this.trailLine.material.color.set(gateColor);

    // Clear trail
    this.trailPoints = [];
  }

  // Called each frame from the animation loop
  update(time) {
    if (!this.animating) return;

    const elapsed = time - this.animStartTime;
    this.animProgress = Math.min(1, elapsed / this.animDuration);

    // Ease out cubic
    const t = 1 - Math.pow(1 - this.animProgress, 3);

    // Slerp on the unit sphere
    const start = new THREE.Vector3(this.animStartBloch.x, this.animStartBloch.y, this.animStartBloch.z);
    const end = new THREE.Vector3(this.targetBloch.x, this.targetBloch.y, this.targetBloch.z);

    // Use quaternion slerp for great-circle interpolation
    const qStart = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), start.clone().normalize());
    const qEnd = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().normalize());
    const qCurrent = new THREE.Quaternion();
    qCurrent.slerpQuaternions(qStart, qEnd, t);

    const currentDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qCurrent);
    this.currentBloch = { x: currentDir.x, y: currentDir.y, z: currentDir.z };

    this._pointArrowTo(this.currentBloch);
    this._updateDotPosition();

    // Add trail point
    this.trailPoints.push(currentDir.clone());
    if (this.trailPoints.length > 100) this.trailPoints.shift();

    // Update trail geometry
    const positions = this.trailLine.geometry.attributes.position.array;
    for (let i = 0; i < this.trailPoints.length; i++) {
      positions[i * 3] = this.trailPoints[i].x;
      positions[i * 3 + 1] = this.trailPoints[i].y;
      positions[i * 3 + 2] = this.trailPoints[i].z;
    }
    this.trailLine.geometry.attributes.position.needsUpdate = true;
    this.trailLine.geometry.setDrawRange(0, this.trailPoints.length);

    if (this.animProgress >= 1) {
      this.animating = false;
      this.currentBloch = { ...this.targetBloch };
      this._pointArrowTo(this.currentBloch);
      this._updateDotPosition();

      // Fade trail
      setTimeout(() => {
        this.trailPoints = [];
        this.trailLine.geometry.setDrawRange(0, 0);
        // Reset colors
        this.arrowShaft.material.color.set(0x00ffcc);
        this.arrowHead.material.color.set(0x00ffcc);
        this.arrowDot.material.color.set(0x00ffcc);
      }, 800);

      if (this.onAnimComplete) this.onAnimComplete();
    }
  }
}
