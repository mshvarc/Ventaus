import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const hero = document.querySelector('#hero');
const mount = document.querySelector('#aquarium-3d');
const status = document.querySelector('#scene-status');
const sceneImages = [...document.querySelectorAll('[data-scene-image]')];
const buttons = [...document.querySelectorAll('[data-target]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sceneLabels = { interior: 'Интерьер', aqua: 'Аквариум', facade: 'Ландшафт' };
let activeScene = 'aqua';
const useOrandaFish = true;

for (let index = 0; index < 54; index += 1) {
  const bubble = document.createElement('span');
  bubble.className = 'bubble';
  const x = 34 + ((index * 43) % 64);
  const size = 2 + ((index * 17) % 7);
  bubble.style.setProperty('--x', `${x}%`);
  bubble.style.setProperty('--size', `${size}px`);
  bubble.style.setProperty('--duration', `${10 + ((index * 29) % 13)}s`);
  bubble.style.setProperty('--delay', `${-((index * 31) % 19)}s`);
  bubble.style.setProperty('--sway', `${-16 + ((index * 23) % 33)}px`);
  document.querySelector('#bubble-layer').appendChild(bubble);
}

function selectScene(next) {
  activeScene = next;
  hero.dataset.scene = next;
  mount.setAttribute('aria-hidden', String(next !== 'aqua'));
  for (const image of sceneImages) image.classList.toggle('is-active', image.dataset.sceneImage === next);
  for (const button of buttons) {
    const selected = button.dataset.target === next;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  status.textContent = `Выбрана среда: ${sceneLabels[next]}`;
}

for (const button of buttons) button.addEventListener('click', () => selectScene(button.dataset.target));

if (useOrandaFish && !reducedMotion.matches && typeof WebGLRenderingContext !== 'undefined') {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 40);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0x9defff, 0x031214, 1.8));
  const key = new THREE.DirectionalLight(0x83ddff, 3.1);
  key.position.set(2, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3abf90, 1.4);
  rim.position.set(-4, -2, 5);
  scene.add(rim);

  const clock = new THREE.Clock();
  const loader = new GLTFLoader();
  const fish = [];
  const pointer = new THREE.Vector3(99, 99, 0);
  const bounds = { minX: -1.0, maxX: 7.4, minY: -3.5, maxY: 3.35, minZ: -1.8, maxZ: 1.4 };
  const lamp = new THREE.Vector2(2.85, -0.25);
  const screenNormal = new THREE.Vector3(0, 0, 1);
  const verticalAxis = new THREE.Vector3(0, 1, 0);
  const targetQuaternion = new THREE.Quaternion();
  const yawQuaternion = new THREE.Quaternion();
  const pitchQuaternion = new THREE.Quaternion();
  let running = true;

  function newDestination(index, fromX = null) {
    const spanX = bounds.maxX - bounds.minX - 1.4;
    const spanY = bounds.maxY - bounds.minY - 1.2;
    let x = bounds.minX + .7 + ((index * 2.47 + Math.random() * 2.1) % spanX);
    if (fromX !== null) {
      const travellingRight = fromX < (bounds.minX + bounds.maxX) * .5;
      x = travellingRight
        ? bounds.maxX - .9 - Math.random() * 1.5
        : bounds.minX + .9 + Math.random() * 1.5;
    }
    return new THREE.Vector3(
      x,
      bounds.minY + .6 + ((index * 1.63 + Math.random() * 1.7) % spanY),
      bounds.minZ + .35 + ((index * .71 + Math.random() * .55) % (bounds.maxZ - bounds.minZ - .7)),
    );
  }

  function resize() {
    const rect = mount.getBoundingClientRect();
    const aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    const viewHeight = 9;
    camera.left = -(viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
  }

  function createFish(source, clips, index, total, profile) {
    const visual = SkeletonUtils.clone(source);
    // Source anatomy after the GLB's nested export transforms: nose=+Z,
    // dorsal/up=+Y. Web scene: nose=+X, dorsal/up=+Y. A single yaw maps
    // the longitudinal axis while preserving the dorsal/belly axis exactly.
    const sourceAnatomyToScreen = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    );
    // Never overwrite the imported scene quaternion. These Sketchfab GLBs use
    // a +90deg root transform followed by a compensating -90deg child transform.
    // Replacing only the root left the compensation active and rolled every fish
    // onto its side / into the camera. Keep the rig untouched and apply anatomy
    // on a dedicated wrapper instead.
    const anatomy = new THREE.Group();
    anatomy.quaternion.copy(sourceAnatomyToScreen);
    anatomy.add(visual);
    const model = new THREE.Group();
    model.add(anatomy);
    const foreground = profile.foreground;
    const scale = profile.scale * (.93 + (index % 3) * .055);
    model.scale.setScalar(scale);
    model.position.set(
      bounds.minX + .65 + ((index * 2.73) % (bounds.maxX - bounds.minX - 1.3)),
      bounds.minY + .55 + ((index * 1.79) % (bounds.maxY - bounds.minY - 1.1)),
      foreground ? .45 - index * .38 : -1.45 + ((index * .71) % 2.2),
    );
    visual.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.frustumCulled = true;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if ('roughness' in material) material.roughness = .38;
        if ('metalness' in material) material.metalness = .04;
        if ('emissive' in material) {
          material.emissiveIntensity = Math.min(material.emissiveIntensity || 0, .08);
        }
      }
    });
    const mixer = new THREE.AnimationMixer(visual);
    for (const clip of clips) {
      const action = mixer.clipAction(clip);
      action.timeScale = profile.animationSpeed * (.92 + (index % 3) * .06);
      action.play();
      action.time = (index / total) * Math.max(.1, clip.duration);
    }
    scene.add(model);
    const directionSign = index % 2 === 0 ? 1 : -1;
    fish.push({
      model,
      mixer,
      velocity: new THREE.Vector3(directionSign * (.36 + (index % 4) * .06), .04 * Math.sin(index), .02 * Math.cos(index)),
      wander: index * 1.731,
      species: profile.species,
      maxSpeed: profile.maxSpeed,
      cruiseSpeed: profile.cruiseSpeed * (.94 + (index % 3) * .05),
      turnRate: profile.turnRate,
      baseScale: scale,
      school: -index - 1,
      facingSign: directionSign,
      destination: newDestination(index, model.position.x),
      retargetAt: 7 + (index % 7) * 1.7,
      startledUntil: 0,
      pointerRetargetAt: 0,
    });
  }

  function normalizeAsset(gltf) {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const normalize = 1 / Math.max(size.x, size.y, size.z, .001);
    gltf.scene.scale.setScalar(normalize);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center.multiplyScalar(normalize));
    return gltf;
  }

  Promise.all([
    loader.loadAsync('/redcap_oranda_goldfish.glb'),
    loader.loadAsync('/tosakin_goldfish.glb'),
    loader.loadAsync('/veiltail_goldfish.glb'),
    loader.loadAsync('/broadtail_moor_goldfish.glb'),
    loader.loadAsync('/jikin_goldfish.glb'),
    loader.loadAsync('/comet_goldfish.glb'),
  ]).then(([oranda, tosakin, veiltail, moor, jikin, comet]) => {
    [oranda, tosakin, veiltail, moor, jikin, comet].forEach(normalizeAsset);
    const mobile = window.innerWidth <= 760;
    const roster = mobile
      ? [
          [oranda, { species: 'oranda', scale: .86, cruiseSpeed: .34, maxSpeed: .58, turnRate: 1.12, animationSpeed: .78, foreground: true }],
          [tosakin, { species: 'tosakin', scale: .82, cruiseSpeed: .24, maxSpeed: .43, turnRate: .82, animationSpeed: .62, foreground: true }],
          [moor, { species: 'moor', scale: .64, cruiseSpeed: .3, maxSpeed: .5, turnRate: 1.0, animationSpeed: .72, foreground: false }],
        ]
      : [
          [oranda, { species: 'oranda', scale: .82, cruiseSpeed: .34, maxSpeed: .58, turnRate: 1.12, animationSpeed: .78, foreground: true }],
          [tosakin, { species: 'tosakin', scale: .88, cruiseSpeed: .23, maxSpeed: .42, turnRate: .8, animationSpeed: .6, foreground: true }],
          [veiltail, { species: 'veiltail', scale: .72, cruiseSpeed: .27, maxSpeed: .47, turnRate: .88, animationSpeed: .68, foreground: true }],
          [moor, { species: 'moor', scale: .62, cruiseSpeed: .31, maxSpeed: .52, turnRate: 1.02, animationSpeed: .74, foreground: false }],
          [jikin, { species: 'jikin', scale: .58, cruiseSpeed: .39, maxSpeed: .64, turnRate: 1.18, animationSpeed: .86, foreground: false }],
          [comet, { species: 'comet', scale: .56, cruiseSpeed: .46, maxSpeed: .76, turnRate: 1.28, animationSpeed: .96, foreground: false }],
        ];
    roster.forEach(([asset, profile], index) => createFish(asset.scene, asset.animations, index, roster.length, profile));
    // Animate the canvas, not the scene container: container visibility is
    // controlled exclusively by data-scene so fish cannot leak into facade.
    gsap.fromTo(renderer.domElement, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' });
  }).catch((error) => {
    console.error('Goldfish assets failed to load', error);
  });

  function steerBoids(item, index, elapsed) {
    const position = item.model.position;
    const separation = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    let neighbors = 0;

    for (let otherIndex = 0; otherIndex < fish.length; otherIndex += 1) {
      if (otherIndex === index) continue;
      const other = fish[otherIndex];
      const distance = position.distanceTo(other.model.position);
      if (distance > 1.85) continue;
      neighbors += 1;
      if (item.school >= 0 && item.school === other.school) {
        alignment.add(other.velocity);
        cohesion.add(other.model.position);
      }
      if (distance < .82) separation.add(position.clone().sub(other.model.position).multiplyScalar(1 / Math.max(distance * distance, .08)));
    }

    const force = new THREE.Vector3();
    if (neighbors) {
      alignment.divideScalar(neighbors).sub(item.velocity).multiplyScalar(item.school < 0 ? 0 : .10);
      cohesion.divideScalar(neighbors).sub(position).multiplyScalar(item.school < 0 ? 0 : .018);
      force.add(alignment).add(cohesion).add(separation.multiplyScalar(.34));
    }

    if (position.distanceTo(item.destination) < .62 || elapsed > item.retargetAt) {
      item.destination.copy(newDestination(index, position.x));
      item.retargetAt = elapsed + 7 + Math.random() * 10;
    }
    const desired = item.destination.clone().sub(position);
    desired.normalize().multiplyScalar(item.cruiseSpeed);
    force.add(desired.sub(item.velocity).multiplyScalar(.68));

    const wanderTarget = new THREE.Vector3(
      Math.cos(elapsed * .17 + item.wander),
      Math.sin(elapsed * .23 + item.wander * 1.4) * .7,
      Math.sin(elapsed * .13 + item.wander) * .25,
    );
    force.add(wanderTarget.multiplyScalar(.035));

    const lampDelta = new THREE.Vector2(position.x - lamp.x, position.y - lamp.y);
    const lampDistance = lampDelta.length();
    if (lampDistance < 1.35) {
      const strength = (1.35 - lampDistance) / 1.35;
      force.x += (lampDelta.x / Math.max(lampDistance, .01)) * strength * 2.4;
      force.y += (lampDelta.y / Math.max(lampDistance, .01)) * strength * 2.4;
    }

    const pointerDistance = position.distanceTo(pointer);
    if (pointerDistance < 2.25) {
      const away = position.clone().sub(pointer).normalize();
      const startle = (2.25 - pointerDistance) / 2.25;
      force.add(away.multiplyScalar(startle * 2.6));
      item.startledUntil = elapsed + .9;
      if (elapsed > item.pointerRetargetAt) {
        item.destination.copy(newDestination(index, position.x));
        item.retargetAt = elapsed + 5 + Math.random() * 5;
        item.pointerRetargetAt = elapsed + 1.2;
      }
    }

    const margin = .72;
    if (position.x < bounds.minX + margin) force.x += 1.8;
    if (position.x > bounds.maxX - margin) force.x -= 1.8;
    if (position.y < bounds.minY + margin) force.y += 1.45;
    if (position.y > bounds.maxY - margin) force.y -= 1.45;
    if (position.z < bounds.minZ + margin) force.z += .45;
    if (position.z > bounds.maxZ - margin) force.z -= .45;
    return force;
  }

  function updateFish(delta, elapsed) {
    fish.forEach((item, index) => {
      item.velocity.add(steerBoids(item, index, elapsed).multiplyScalar(delta));
      // Aquarium fish remain upright: depth is subtle and vertical swimming is limited.
      item.velocity.y = THREE.MathUtils.clamp(item.velocity.y, -.22, .22);
      item.velocity.z = THREE.MathUtils.clamp(item.velocity.z, -.19, .19);
      const speed = item.velocity.length();
      const activeMaxSpeed = elapsed < item.startledUntil ? item.maxSpeed * 1.55 : item.maxSpeed;
      if (speed > activeMaxSpeed) item.velocity.multiplyScalar(activeMaxSpeed / speed);
      if (speed < .12) item.velocity.multiplyScalar(.12 / Math.max(speed, .01));
      item.model.position.addScaledVector(item.velocity, delta);
      item.model.position.x = THREE.MathUtils.clamp(item.model.position.x, bounds.minX, bounds.maxX);
      item.model.position.y = THREE.MathUtils.clamp(item.model.position.y, bounds.minY, bounds.maxY);
      item.model.position.z = THREE.MathUtils.clamp(item.model.position.z, bounds.minZ, bounds.maxZ);

      // U-turns happen around the upright Y axis, not as a flat 2D spin. This
      // briefly shows the nose/tail during a turn while keeping back and belly
      // anatomically stable. Vertical travel is a small pitch only.
      if (Math.abs(item.velocity.x) > .055) item.facingSign = Math.sign(item.velocity.x);
      const swimPitch = THREE.MathUtils.clamp(
        Math.atan2(item.velocity.y, Math.max(Math.abs(item.velocity.x), .18)),
        -.28,
        .28,
      );
      yawQuaternion.setFromAxisAngle(verticalAxis, item.facingSign > 0 ? 0 : Math.PI);
      pitchQuaternion.setFromAxisAngle(screenNormal, swimPitch * item.facingSign);
      targetQuaternion.copy(yawQuaternion).multiply(pitchQuaternion);
      item.model.quaternion.rotateTowards(targetQuaternion, item.turnRate * delta);
      // Depth is readable through perspective scale: approaching fish grow and
      // receding fish shrink, while their silhouettes remain anatomically clear.
      const depthT = THREE.MathUtils.clamp(
        (item.model.position.z - bounds.minZ) / (bounds.maxZ - bounds.minZ),
        0,
        1,
      );
      const depthScale = THREE.MathUtils.lerp(.72, 1.22, depthT);
      const targetScale = item.baseScale * depthScale;
      const smoothScale = THREE.MathUtils.damp(item.model.scale.x, targetScale, 2.4, delta);
      item.model.scale.setScalar(smoothScale);
      item.mixer.update(delta * (.78 + item.velocity.length() * .4));
    });
  }

  function frame() {
    const delta = Math.min(clock.getDelta(), .033);
    const elapsed = clock.elapsedTime;
    if (running && activeScene === 'aqua') updateFish(delta, elapsed);
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);
  new ResizeObserver(resize).observe(mount);
  resize();

  hero.addEventListener('pointermove', (event) => {
    if (activeScene !== 'aqua') return;
    const rect = hero.getBoundingClientRect();
    const normalizedX = (event.clientX - rect.left) / rect.width;
    const normalizedY = (event.clientY - rect.top) / rect.height;
    const worldWidth = camera.right - camera.left;
    pointer.set(camera.left + normalizedX * worldWidth, camera.top - normalizedY * 9, 0);
  });
  hero.addEventListener('pointerleave', () => pointer.set(99, 99, 0));

  ScrollTrigger.create({
    trigger: hero,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => { running = true; },
    onEnterBack: () => { running = true; },
    onLeave: () => { running = false; },
    onLeaveBack: () => { running = false; },
  });
}
