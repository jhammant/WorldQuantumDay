// ar.js — WebXR AR mode for placing the Bloch sphere in real space
import * as THREE from 'three';

export class ARMode {
  constructor(renderer, scene, blochSphereGroup) {
    this.renderer = renderer;
    this.scene = scene;
    this.blochGroup = blochSphereGroup;
    this.session = null;
    this.hitTestSource = null;
    this.reticle = null;
    this.placed = false;
    this.supported = false;
    this.onSessionStart = null;
    this.onSessionEnd = null;

    this._buildReticle();
    this._checkSupport();
  }

  _buildReticle() {
    const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.visible = false;
    this.reticle.matrixAutoUpdate = false;
    this.scene.add(this.reticle);
  }

  async _checkSupport() {
    if (!navigator.xr) {
      this.supported = false;
      return;
    }
    try {
      this.supported = await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
      this.supported = false;
    }
  }

  async startSession() {
    if (!this.supported) return false;

    try {
      const overlayEl = document.getElementById('ar-overlay');
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: overlayEl ? { root: overlayEl } : undefined
      });

      this.session = session;
      this.placed = false;

      await this.renderer.xr.setSession(session);
      this.renderer.xr.enabled = true;

      // Set up hit test source
      const viewerSpace = await session.requestReferenceSpace('viewer');
      this.hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

      // Hide the Bloch sphere until placed
      this.blochGroup.visible = false;
      this.reticle.visible = true;

      // Handle tap to place
      session.addEventListener('select', () => {
        if (!this.placed && this.reticle.visible) {
          this.blochGroup.position.setFromMatrixPosition(this.reticle.matrix);
          this.blochGroup.scale.set(0.15, 0.15, 0.15); // Scale down for AR
          this.blochGroup.visible = true;
          this.placed = true;
          this.reticle.visible = false;
        }
      });

      session.addEventListener('end', () => {
        this.renderer.xr.enabled = false;
        this.session = null;
        this.hitTestSource = null;
        this.reticle.visible = false;
        this.blochGroup.scale.set(1, 1, 1);
        this.blochGroup.position.set(0, 0, 0);
        this.blochGroup.visible = true;
        this.placed = false;
        if (this.onSessionEnd) this.onSessionEnd();
      });

      if (this.onSessionStart) this.onSessionStart();
      return true;
    } catch (e) {
      console.warn('AR session failed:', e);
      return false;
    }
  }

  updateHitTest(renderer, frame) {
    if (!this.hitTestSource || this.placed) return;

    const referenceSpace = renderer.xr.getReferenceSpace();
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(referenceSpace);
      if (pose) {
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(pose.transform.matrix);
      }
    } else {
      this.reticle.visible = false;
    }
  }

  isActive() {
    return this.session !== null;
  }
}
