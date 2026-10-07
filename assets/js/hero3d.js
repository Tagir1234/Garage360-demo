/* =========================================================
   Гараж 360 — 3D-сцена первого экрана
   Машина вылетает из светящегося «окна» к зрителю, тормозит и разворачивается.
   Рендер: three.js (облегчённая сборка, assets/vendor/three-lite.min.js → window.THREE_LITE)
   Движение: anime.js v4 анимирует обычные JS-объекты (позицию, поворот), three.js их рисует.
   Модель: Kenney Car Kit (CC0), вшита в assets/models/car-sedan.js → window.G360_CAR_GLB
   Если WebGL недоступен — остаётся SVG-иллюстрация (img.hero__fallback).
   ========================================================= */
(() => {
  'use strict';

  const T = window.THREE_LITE;
  const A = window.anime;
  const GLB = window.G360_CAR_GLB;
  const stage = document.getElementById('hero-stage');
  const canvas = document.getElementById('hero-canvas');
  if (!T || !GLB || !stage || !canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animated = Boolean(A && A.animate) && !reduceMotion;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    return; // нет WebGL — показываем SVG-заглушку
  }

  const COLORS = { red: 0xe5383b, ink: 0x1f2328, fog: 0x08090a };
  const isSmall = () => window.innerWidth < 720;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new T.Scene();
  scene.fog = new T.Fog(COLORS.fog, 10, 30);

  // Мягкие отражения от «комнаты» — без загрузки HDR-файлов
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new T.PerspectiveCamera(30, 1, 0.1, 80);
  const lookAt = new T.Vector3(0, 0.75, -0.4);

  /* ---------- Свет ---------- */
  scene.add(new T.HemisphereLight(0xdfe6ff, 0x15181c, 0.7));
  const key = new T.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 7);
  scene.add(key);
  const rim = new T.DirectionalLight(COLORS.red, 1.6);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  const portalLight = new T.PointLight(COLORS.red, 0, 9, 2); // вспыхивает, когда машина проезжает окно
  portalLight.position.set(0, 1.4, 0.2);
  scene.add(portalLight);

  /* ---------- Текстуры, нарисованные на canvas (без внешних файлов) ---------- */
  function canvasTexture(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }
  // Пол: сетка, растворяющаяся к краям
  const floorTex = canvasTexture(1024, (g, s) => {
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 2;
    for (let i = 0; i <= s; i += 42.7) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
    }
    g.globalCompositeOperation = 'destination-in';
    const r = g.createRadialGradient(s / 2, s * 0.62, 0, s / 2, s * 0.62, s * 0.5);
    r.addColorStop(0, 'rgba(0,0,0,1)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  // Пятно тени под машиной
  const shadowTex = canvasTexture(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(0,0,0,0.85)');
    r.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  // Свечение внутри окна
  const glowTex = canvasTexture(256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(229,56,59,0.55)');
    r.addColorStop(0.5, 'rgba(229,56,59,0.12)');
    r.addColorStop(1, 'rgba(229,56,59,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

  /* ---------- Пол ---------- */
  const floor = new T.Mesh(
    new T.PlaneGeometry(26, 26),
    new T.MeshStandardMaterial({ color: 0x1c1f23, map: floorTex, transparent: true, roughness: 0.9, metalness: 0, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -6);
  scene.add(floor);

  /* ---------- «Окно» и тоннель из рамок ---------- */
  // Контур скруглённого прямоугольника, стоящего на полу (низ на высоте y)
  function roundedRect(path, w, h, r, y = 0) {
    const x = -w / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }
  // Рамка: внешний контур минус внутренний (толщина t)
  function frameGeometry(w, h, r, t) {
    const shape = roundedRect(new T.Shape(), w, h, r);
    shape.holes.push(roundedRect(new T.Path(), w - t * 2, h - t * 2, Math.max(0.01, r - t), t));
    return new T.ShapeGeometry(shape, 12);
  }

  const portal = new T.Group();
  scene.add(portal);
  const FRAME_COUNT = 7;
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const front = i === 0;
    const mat = new T.MeshBasicMaterial({
      color: COLORS.red,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new T.Mesh(frameGeometry(4.4, 2.75, 0.22, front ? 0.06 : 0.025), mat);
    mesh.position.z = -i * 2.6;
    mat.userData.baseOpacity = front ? 0.95 : 0.42 - i * 0.05;
    frames.push(mesh);
    portal.add(mesh);
  }
  const glow = new T.Mesh(
    new T.PlaneGeometry(4.3, 2.65),
    new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })
  );
  glow.position.set(0, 1.375, -0.05);
  portal.add(glow);

  // Разметка-«штрихи» на полу, которые летят навстречу во время разгона
  const dashes = [];
  const dashMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false });
  const dashGeo = new T.PlaneGeometry(0.05, 1.1);
  for (let i = 0; i < 16; i++) {
    const d = new T.Mesh(dashGeo, dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(i % 2 ? 1.25 : -1.25, 0.005, -24 + Math.floor(i / 2) * 3.2);
    dashes.push(d);
    scene.add(d);
  }

  /* ---------- Машина ---------- */
  const car = { x: 0, z: -24, yaw: 0, pitch: 0, lift: 0 }; // состояние, которое анимирует anime.js
  const carRoot = new T.Group();
  const carBody = new T.Group();
  carRoot.add(carBody);
  scene.add(carRoot);

  const shadow = new T.Mesh(
    new T.PlaneGeometry(2.4, 4.4),
    new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  scene.add(shadow);

  const wheels = [];
  const CAR_SCALE = 1.28;
  const WHEEL_RADIUS = 0.3 * CAR_SCALE;

  const bytes = Uint8Array.from(atob(GLB), (c) => c.charCodeAt(0));
  new T.GLTFLoader().parse(bytes.buffer, '', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(CAR_SCALE);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.material.roughness = 0.38;
      o.material.metalness = 0.12;
      if (o.name.startsWith('wheel') || (o.parent && o.parent.name.startsWith('wheel'))) {
        o.material = o.material.clone();
        o.material.roughness = 0.7;
      }
    });
    model.traverse((o) => { if (/^wheel/.test(o.name) && !o.isMesh) wheels.push(o); });
    if (!wheels.length) model.traverse((o) => { if (/^wheel/.test(o.name)) wheels.push(o); });
    carBody.add(model);
    start();
  }, () => { /* ошибка загрузки модели — остаётся SVG */ });

  /* ---------- Размер, камера ---------- */
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Отодвигаем камеру на узких экранах, чтобы окно и машина помещались
    const needWidth = 6.2;
    const dist = Math.max(10, needWidth / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    camera.position.set(0.9, 2.15 + dist * 0.07, dist);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
  }

  /* ---------- Перетаскивание: поворот машины ---------- */
  let dragYaw = 0;
  let dragFrom = null;
  canvas.addEventListener('pointerdown', (e) => { dragFrom = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (dragFrom === null) return;
    dragYaw += (e.clientX - dragFrom) * 0.012;
    dragFrom = e.clientX;
    if (!animated) render();
  });
  const endDrag = () => { dragFrom = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Лёгкий параллакс от мыши
  const pointer = { x: 0, y: 0 };
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });

  /* ---------- Кадр ---------- */
  let prevZ = car.z;
  let idle = false;
  let time = 0;
  const cam = { x: 0, y: 0 };

  function render() {
    // Колёса крутятся пропорционально пройденному пути
    const dz = car.z - prevZ;
    prevZ = car.z;
    wheels.forEach((w) => { w.rotation.x += dz / WHEEL_RADIUS; });

    const sway = idle && animated ? Math.sin(time * 0.6) * 0.1 : 0;
    carRoot.position.set(car.x, car.lift, car.z);
    carRoot.rotation.y = car.yaw + sway + dragYaw;
    carBody.rotation.x = car.pitch;
    shadow.position.x = car.x;
    shadow.position.z = car.z;
    shadow.rotation.z = -carRoot.rotation.y;

    // Вспышка окна, когда машина проезжает сквозь него
    const near = Math.max(0, 1 - Math.abs(car.z) / 2.2);
    portalLight.intensity = 10 * near + (idle ? 1.2 : 0);
    glow.material.opacity = Math.max(glow.material.opacity * 0.95, near * 0.45);

    if (idle && animated) {
      frames.forEach((f, i) => { f.material.opacity = f.material.userData.baseOpacity * (0.9 + 0.1 * Math.sin(time * 1.2 - i * 0.6)); });
      cam.x += (pointer.x * 0.35 - cam.x) * 0.05;
      cam.y += (-pointer.y * 0.2 - cam.y) * 0.05;
      camera.position.x = 0.9 + cam.x;
      camera.lookAt(lookAt.x, lookAt.y + cam.y * 0.3, lookAt.z);
    }
    renderer.render(scene, camera);
  }

  let running = false;
  let visible = true;
  let last = performance.now();
  let loopZ = car.z;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    // «Штрихи» разметки едут к зрителю, пока машина в разгоне
    const speed = Math.max(0, (car.z - loopZ) / Math.max(dt, 0.001));
    loopZ = car.z;
    dashes.forEach((d) => {
      d.position.z += speed * dt * 1.6;
      if (d.position.z > 4) d.position.z -= 25.6;
    });
    dashMat.opacity = Math.min(0.2, speed * 0.025);
    render();
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(loop); }
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (animated) setRunning(visible && !document.hidden);
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (animated) setRunning(visible && !document.hidden); });

  /* ---------- Старт ---------- */
  const FINAL = { x: 0.15, z: 1.15, yaw: -0.72 };

  function start() {
    resize();
    window.addEventListener('resize', () => { resize(); if (!animated) render(); });
    stage.classList.add('is-3d');

    if (!animated) {
      // Без анимаций: сразу финальная поза, один кадр
      Object.assign(car, FINAL);
      prevZ = car.z;
      frames.forEach((f) => { f.material.opacity = f.material.userData.baseOpacity; });
      portalLight.intensity = 1.2;
      idle = true;
      render();
      return;
    }

    setRunning(visible);
    const tl = A.createTimeline({ onComplete: () => { idle = true; } });
    // 1. Рамки тоннеля загораются от дальней к ближней
    tl.add(frames.map((f) => f.material).reverse(), {
      opacity: (mat) => [0, mat.userData.baseOpacity],
      delay: A.stagger(70),
      duration: 420,
      ease: 'outQuad',
    }, 200);
    // 2. Машина вылетает из окна и тормозит
    tl.add(car, { z: [-24, FINAL.z], duration: 2100, ease: 'outQuart' }, 500);
    // 3. Клевок носом при торможении и отскок подвески
    tl.add(car, { pitch: [0, 0.07], duration: 380, ease: 'outQuad' }, 1650);
    tl.add(car, { pitch: 0, duration: 1100, ease: 'outElastic(1, .45)' }, 2030);
    // 4. Разворот боком к зрителю с лёгким заносом
    tl.add(car, { yaw: [0, FINAL.yaw], x: [0, FINAL.x], duration: 1300, ease: 'outBack(1.3)' }, 1850);
    tl.add(car, { lift: [0, 0.06, 0], duration: 500, ease: 'outQuad' }, 1900);
  }
})();
