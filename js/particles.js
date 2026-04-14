// particles.js — Ambient and effect particle systems
import * as THREE from 'three';

export class AmbientParticles {
  constructor(count = 400) {
    this.count = count;
    this.velocities = [];

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute in a sphere of radius ~3
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 2;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Blue-purple-cyan palette
      const hue = 0.55 + Math.random() * 0.2;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1 + Math.random() * 3;

      this.velocities.push({
        x: (Math.random() - 0.5) * 0.002,
        y: (Math.random() - 0.5) * 0.002,
        z: (Math.random() - 0.5) * 0.002
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(geo, mat);
  }

  update(time) {
    const positions = this.points.geometry.attributes.position.array;

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const v = this.velocities[i];

      positions[idx] += v.x;
      positions[idx + 1] += v.y;
      positions[idx + 2] += v.z;

      // Gentle orbit drift
      const x = positions[idx];
      const z = positions[idx + 2];
      positions[idx] += -z * 0.0003;
      positions[idx + 2] += x * 0.0003;

      // Pulsing opacity via size
      const dist = Math.sqrt(x * x + positions[idx + 1] ** 2 + z * z);
      if (dist > 4) {
        // Reset particle closer
        positions[idx] *= 0.5;
        positions[idx + 1] *= 0.5;
        positions[idx + 2] *= 0.5;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

export class GateBurstParticles {
  constructor() {
    this.maxParticles = 60;
    this.particles = [];
    this.active = false;

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(geo, mat);
  }

  burst(origin, color = '#00ffcc') {
    this.particles = [];
    const c = new THREE.Color(color);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: origin.x, y: origin.y, z: origin.z,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        vz: (Math.random() - 0.5) * 0.06,
        life: 1.0,
        decay: 0.01 + Math.random() * 0.02,
        color: c
      });
    }
    this.active = true;
  }

  update() {
    if (!this.active) return;

    const positions = this.points.geometry.attributes.position.array;
    const colors = this.points.geometry.attributes.color.array;
    let aliveCount = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vz *= 0.97;
      p.life -= p.decay;

      positions[aliveCount * 3] = p.x;
      positions[aliveCount * 3 + 1] = p.y;
      positions[aliveCount * 3 + 2] = p.z;
      colors[aliveCount * 3] = p.color.r * p.life;
      colors[aliveCount * 3 + 1] = p.color.g * p.life;
      colors[aliveCount * 3 + 2] = p.color.b * p.life;
      aliveCount++;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.setDrawRange(0, aliveCount);

    if (aliveCount === 0) this.active = false;
  }
}
