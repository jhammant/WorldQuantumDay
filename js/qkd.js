// qkd.js — Quantum Key Distribution (BB84) "Catching the Eavesdropper" visualization
import * as THREE from 'three';

export class QuantumQKD {
  constructor() {
    this.group = new THREE.Group();
    this.running = false;
    this.onComplete = null;
    this.paused = false;

    // State machine: 'idle' | 'sending' | 'detecting' | 'complete'
    this.phase = 'idle';

    // Channel geometry constants
    this.channelLeft = -1.8;
    this.channelRight = 1.8;
    this.channelLength = this.channelRight - this.channelLeft;
    this.classicalY = 0.6;
    this.quantumY = -0.6;

    // Photon tracking
    this.classicalPhotons = [];
    this.quantumPhotons = [];
    this.totalPhotons = 20;
    this.photonsSent = 0;
    this.photonsArrived = 0;
    this.quantumErrors = 0;
    this.sendInterval = 400; // ms between photon launches
    this.lastSendTime = 0;
    this.photonSpeed = 0.003; // units per ms

    // Eve position (fraction along channel)
    this.eveFraction = 0.5;
    this.eveX = this.channelLeft + this.channelLength * this.eveFraction;

    // Detection phase
    this.detectionStart = 0;
    this.detectionDuration = 2000; // ms
    this.alertFlashPhase = 0;

    // Security meters
    this.classicalMeterFill = null;
    this.quantumMeterFill = null;
    this.classicalSecurity = 0;
    this.quantumSecurity = 0;

    // Eve meshes (for alert flash)
    this.classicalEve = null;
    this.quantumEve = null;

    this._buildScene();
    this.group.visible = false;
  }

  _buildScene() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.classicalPhotons = [];
    this.quantumPhotons = [];

    // Title labels
    this._addLabel('Classical Channel', 0, 1.15, 0, '#ff8844');
    this._addLabel('Quantum BB84 Channel', 0, -0.05, 0, '#44aaff');

    // Build both channels
    this._buildChannel(this.classicalY, false);
    this._buildChannel(this.quantumY, true);

    // Security meters
    this._buildSecurityMeter(this.classicalY, false);
    this._buildSecurityMeter(this.quantumY, true);
  }

  _buildChannel(yOffset, isQuantum) {
    // Alice terminal (left)
    const aliceGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const aliceMat = new THREE.MeshBasicMaterial({ color: 0x22aa44 });
    const alice = new THREE.Mesh(aliceGeo, aliceMat);
    alice.position.set(this.channelLeft, yOffset, 0);
    this.group.add(alice);
    this._addLabel('Alice', this.channelLeft, yOffset + 0.2, 0, '#22cc55');

    // Bob terminal (right)
    const bobGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const bobMat = new THREE.MeshBasicMaterial({ color: 0x22aa44 });
    const bob = new THREE.Mesh(bobGeo, bobMat);
    bob.position.set(this.channelRight, yOffset, 0);
    this.group.add(bob);
    this._addLabel('Bob', this.channelRight, yOffset + 0.2, 0, '#22cc55');

    // Channel line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(this.channelLeft + 0.1, yOffset, 0),
      new THREE.Vector3(this.channelRight - 0.1, yOffset, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: isQuantum ? 0x4488ff : 0xff8844,
      transparent: true,
      opacity: 0.4
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.group.add(line);

    // Eve (dark box mid-channel)
    const eveGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const eveMat = new THREE.MeshBasicMaterial({
      color: 0x882222,
      transparent: true,
      opacity: 0.9
    });
    const eve = new THREE.Mesh(eveGeo, eveMat);
    eve.position.set(this.eveX, yOffset + 0.18, 0);
    this.group.add(eve);
    this._addLabel('Eve', this.eveX, yOffset + 0.38, 0, '#cc4444');

    if (isQuantum) {
      this.quantumEve = eve;
    } else {
      this.classicalEve = eve;
    }

    // Thin line from channel to Eve (tap)
    const tapGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(this.eveX, yOffset, 0),
      new THREE.Vector3(this.eveX, yOffset + 0.1, 0)
    ]);
    const tapMat = new THREE.LineBasicMaterial({
      color: 0x882222,
      transparent: true,
      opacity: 0.3
    });
    const tapLine = new THREE.Line(tapGeo, tapMat);
    this.group.add(tapLine);
  }

  _buildSecurityMeter(yOffset, isQuantum) {
    const meterX = this.channelRight + 0.4;
    const meterWidth = 0.08;
    const meterHeight = 0.3;

    // Background (dark)
    const bgGeo = new THREE.BoxGeometry(meterWidth, meterHeight, 0.02);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.set(meterX, yOffset, 0);
    this.group.add(bg);

    // Fill bar (starts empty)
    const fillGeo = new THREE.BoxGeometry(meterWidth * 0.8, 0.001, 0.03);
    const fillMat = new THREE.MeshBasicMaterial({ color: isQuantum ? 0x44ff44 : 0xff4444 });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.position.set(meterX, yOffset - meterHeight / 2, 0.01);
    this.group.add(fill);

    this._addLabel('Security', meterX, yOffset + 0.25, 0, '#aaaaaa', 0.6);

    if (isQuantum) {
      this.quantumMeterFill = fill;
      this.quantumMeterY = yOffset;
    } else {
      this.classicalMeterFill = fill;
      this.classicalMeterY = yOffset;
    }
  }

  _addLabel(text, x, y, z, color, scaleX) {
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
    sprite.scale.set(scaleX || 1.5, 0.2, 1);
    this.group.add(sprite);
  }

  _createPhoton(yOffset, isQuantum) {
    const geo = new THREE.SphereGeometry(0.03, 12, 12);
    const hue = 0.15 + Math.random() * 0.4; // random color in green-blue range
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue, 1.0, 0.6),
      transparent: true,
      opacity: 0.9
    });
    const photon = new THREE.Mesh(geo, mat);
    photon.position.set(this.channelLeft + 0.15, yOffset, 0.05);

    // Store metadata on the mesh
    photon.userData = {
      isQuantum,
      hue,
      intercepted: false,
      arrived: false,
      progress: 0, // 0..1 along channel
      copySpawned: false
    };

    this.group.add(photon);
    return photon;
  }

  _createEveCopy(sourcePhoton, yOffset) {
    const geo = new THREE.SphereGeometry(0.02, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: sourcePhoton.material.color.clone(),
      transparent: true,
      opacity: 0.4
    });
    const copy = new THREE.Mesh(geo, mat);
    copy.position.set(this.eveX, yOffset, 0.05);
    copy.userData = { fadeTarget: yOffset + 0.18, fading: true };
    this.group.add(copy);
    return copy;
  }

  start(onComplete = null) {
    this.onComplete = onComplete;
    this.running = true;
    this.paused = false;
    this.phase = 'sending';
    this.photonsSent = 0;
    this.photonsArrived = 0;
    this.quantumErrors = 0;
    this.classicalSecurity = 0;
    this.quantumSecurity = 0;
    this.lastSendTime = 0;
    this.detectionStart = 0;
    this.alertFlashPhase = 0;

    // Clear old photons
    this._clearPhotons();
    this._updateMeter(this.classicalMeterFill, 0, this.classicalMeterY);
    this._updateMeter(this.quantumMeterFill, 0, this.quantumMeterY);

    // Reset Eve colors
    if (this.classicalEve) this.classicalEve.material.color.set(0x882222);
    if (this.quantumEve) this.quantumEve.material.color.set(0x882222);
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.phase = 'idle';
    this._clearPhotons();
    this._updateMeter(this.classicalMeterFill, 0, this.classicalMeterY);
    this._updateMeter(this.quantumMeterFill, 0, this.quantumMeterY);
    if (this.classicalEve) this.classicalEve.material.color.set(0x882222);
    if (this.quantumEve) this.quantumEve.material.color.set(0x882222);
  }

  _clearPhotons() {
    for (const p of [...this.classicalPhotons, ...this.quantumPhotons]) {
      this.group.remove(p);
    }
    this.classicalPhotons = [];
    this.quantumPhotons = [];

    // Also remove any lingering eve-copy spheres
    const toRemove = [];
    this.group.children.forEach(child => {
      if (child.userData && child.userData.fading) toRemove.push(child);
    });
    toRemove.forEach(c => this.group.remove(c));
  }

  _updateMeter(fill, fraction, yBase) {
    if (!fill) return;
    const maxHeight = 0.28;
    const h = Math.max(0.001, fraction * maxHeight);
    fill.scale.set(1, h / 0.001, 1);
    fill.position.y = yBase - 0.15 + h / 2;
  }

  update(time) {
    if (!this.running || this.paused) return;

    // --- Sending phase ---
    if (this.phase === 'sending') {
      // Launch new photons on interval
      if (this.photonsSent < this.totalPhotons && (time - this.lastSendTime > this.sendInterval)) {
        this.lastSendTime = time;

        // Launch classical photon
        const cp = this._createPhoton(this.classicalY, false);
        this.classicalPhotons.push(cp);

        // Launch quantum photon
        const qp = this._createPhoton(this.quantumY, true);
        this.quantumPhotons.push(qp);

        this.photonsSent++;
      }

      // Move classical photons
      for (const p of this.classicalPhotons) {
        if (p.userData.arrived) continue;
        p.userData.progress += this.photonSpeed * 16; // approximate per-frame
        const x = this.channelLeft + 0.15 + p.userData.progress * (this.channelLength - 0.3);
        p.position.x = x;

        // Eve intercept — silently copy, photon passes through unchanged
        if (!p.userData.copySpawned && p.userData.progress >= this.eveFraction) {
          p.userData.copySpawned = true;
          p.userData.intercepted = true;
          const copy = this._createEveCopy(p, this.classicalY);
          this.classicalPhotons.push(copy); // will be cleaned up as fading
        }

        if (p.userData.progress >= 1.0) {
          p.userData.arrived = true;
          p.position.x = this.channelRight - 0.15;
          // Fade out after arriving
          p.material.opacity = Math.max(0, p.material.opacity - 0.02);
        }
      }

      // Move quantum photons
      for (const p of this.quantumPhotons) {
        if (p.userData.arrived) continue;
        p.userData.progress += this.photonSpeed * 16;
        const x = this.channelLeft + 0.15 + p.userData.progress * (this.channelLength - 0.3);
        p.position.x = x;

        // Eve intercept — photon color CHANGES (disturbance)
        if (!p.userData.intercepted && p.userData.progress >= this.eveFraction) {
          p.userData.intercepted = true;
          // Disturb: shift hue noticeably
          const newHue = (p.userData.hue + 0.4) % 1.0;
          p.material.color.setHSL(newHue, 1.0, 0.65);
          p.material.opacity = 0.75;
          this.quantumErrors++;

          // Faint copy to Eve
          const copy = this._createEveCopy(p, this.quantumY);
          this.quantumPhotons.push(copy);
        }

        if (p.userData.progress >= 1.0) {
          p.userData.arrived = true;
          p.position.x = this.channelRight - 0.15;
        }
      }

      // Fade eve-copy spheres upward
      this.group.children.forEach(child => {
        if (child.userData && child.userData.fading) {
          child.position.y += 0.003;
          child.material.opacity = Math.max(0, child.material.opacity - 0.01);
          if (child.material.opacity <= 0) {
            this.group.remove(child);
          }
        }
      });

      // Fade out arrived photons
      for (const p of [...this.classicalPhotons, ...this.quantumPhotons]) {
        if (p.userData.arrived && !p.userData.fading) {
          p.material.opacity = Math.max(0, p.material.opacity - 0.008);
        }
      }

      // Classical security stays at 0
      this.classicalSecurity = 0;
      this._updateMeter(this.classicalMeterFill, 0, this.classicalMeterY);

      // Check if all photons sent and enough have passed Eve
      const quantumArrived = this.quantumPhotons.filter(
        p => p.userData.isQuantum && p.userData.arrived
      ).length;

      if (this.photonsSent >= this.totalPhotons && quantumArrived >= 15) {
        this.phase = 'detecting';
        this.detectionStart = time;
      }
    }

    // --- Detection phase ---
    if (this.phase === 'detecting') {
      const elapsed = time - this.detectionStart;
      const t = Math.min(1, elapsed / this.detectionDuration);

      // Quantum security ramps up to 100%
      this.quantumSecurity = t;
      this._updateMeter(this.quantumMeterFill, t, this.quantumMeterY);

      // Classical stays at 0
      this._updateMeter(this.classicalMeterFill, 0, this.classicalMeterY);

      // Flash Eve red on quantum channel
      this.alertFlashPhase += 0.15;
      const flash = 0.5 + 0.5 * Math.sin(this.alertFlashPhase);
      if (this.quantumEve) {
        this.quantumEve.material.color.setHSL(0, 0.9, 0.3 + flash * 0.5);
      }

      // Continue fading copy spheres
      this.group.children.forEach(child => {
        if (child.userData && child.userData.fading) {
          child.position.y += 0.002;
          child.material.opacity = Math.max(0, child.material.opacity - 0.015);
          if (child.material.opacity <= 0) {
            this.group.remove(child);
          }
        }
      });

      if (t >= 1) {
        this.phase = 'complete';
        this.quantumSecurity = 1;
        this._updateMeter(this.quantumMeterFill, 1, this.quantumMeterY);
        // Eve stays bright red
        if (this.quantumEve) {
          this.quantumEve.material.color.set(0xff2222);
        }
        this.running = false;
        if (this.onComplete) this.onComplete();
      }
    }
  }

  getStats() {
    return {
      phase: this.phase,
      photonsSent: this.photonsSent,
      totalPhotons: this.totalPhotons,
      quantumErrors: this.quantumErrors,
      classicalSecurity: Math.round(this.classicalSecurity * 100),
      quantumSecurity: Math.round(this.quantumSecurity * 100),
      eveDetected: this.phase === 'complete'
    };
  }
}
