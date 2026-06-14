import * as THREE from 'three';

// Pool of little tumbling wood shavings sprayed off the cut.
export class Shavings {
  constructor(scene, count = 140) {
    this.pool = [];
    this.tex = this._curlTexture();
    const geo = new THREE.PlaneGeometry(0.05, 0.018);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.tex, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push({ mesh: m, vel: new THREE.Vector3(), av: new THREE.Vector3(), life: 0, max: 1 });
    }
    this._next = 0;
    this._c = new THREE.Color();
  }

  _curlTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(8, 40);
    g.bezierCurveTo(20, 10, 44, 10, 56, 34);   // a little comma/curl
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  spawn(pos, color, intensity) {
    const n = Math.min(this.pool.length, 1 + Math.floor(intensity * 5));
    for (let k = 0; k < n; k++) {
      const p = this.pool[this._next];
      this._next = (this._next + 1) % this.pool.length;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.position.x += (Math.random() - 0.5) * 0.08;
      p.mesh.position.y += (Math.random() - 0.5) * 0.05;
      p.mesh.position.z += (Math.random() - 0.5) * 0.05;
      const speed = 0.5 + intensity * 1.4;
      p.vel.set(
        (Math.random() - 0.5) * 0.5,
        0.5 + Math.random() * 0.9,
        0.4 + Math.random() * 0.8 * (Math.random() < 0.5 ? 1 : -1)
      ).multiplyScalar(speed);
      p.av.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      this._c.set(color);
      this._c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      p.mesh.material.color.copy(this._c);
      p.mesh.material.opacity = 1;
      const sc = 0.7 + Math.random() * 0.9;
      p.mesh.scale.set(sc, sc, sc);
      p.max = 0.6 + Math.random() * 0.5;
      p.life = p.max;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= 3.2 * dt;        // gravity
      p.vel.multiplyScalar(1 - 1.5 * dt); // drag
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.av.x * dt;
      p.mesh.rotation.y += p.av.y * dt;
      p.mesh.rotation.z += p.av.z * dt;
      p.mesh.material.opacity = Math.min(1, p.life / (p.max * 0.6));
    }
  }
}
