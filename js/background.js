import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

const PARTICLE_COUNT_MULTIPLIER = 1000;
const PARTICLE_SPEED_MULTIPLIER = 3.5;
const canvas = document.querySelector("#webgl-background");

if (canvas) {
  initializeBackground(canvas);
}

function initializeBackground(targetCanvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 700px)").matches;

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: targetCanvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: "high-performance"
    });
  } catch (error) {
    targetCanvas.hidden = true;
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
  camera.position.set(0, 0, 8.5);

  const group = new THREE.Group();
  scene.add(group);

  function createGlowTexture(colorStops) {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 64;
    textureCanvas.height = 64;

    const context = textureCanvas.getContext("2d");
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, colorStops.core);
    gradient.addColorStop(0.18, colorStops.inner);
    gradient.addColorStop(0.48, colorStops.outer);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const coolGlowTexture = createGlowTexture({
    core: "rgba(255, 255, 255, 1)",
    inner: "rgba(195, 231, 238, 0.92)",
    outer: "rgba(82, 111, 128, 0.2)"
  });
  const tealGlowTexture = createGlowTexture({
    core: "rgba(255, 255, 255, 1)",
    inner: "rgba(167, 237, 222, 0.92)",
    outer: "rgba(35, 127, 117, 0.18)"
  });

  const sharedUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0 }
  };

  const vertexShader = `
    uniform float uTime;
    uniform float uScroll;
    uniform vec2 uPointer;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 transformed = position;
      float slowTime = uTime * 0.45;
      float waveA = sin(position.x * 2.15 + slowTime + uPointer.y * 0.8);
      float waveB = sin(position.y * 2.65 - slowTime * 1.25 + uPointer.x * 0.7);
      float waveC = cos(position.z * 3.0 + slowTime * 0.75);
      float scrollWave = sin((position.x + position.y) * 2.2 + uScroll * 12.0);
      float displacement = (waveA + waveB + waveC) * 0.075 + scrollWave * uScroll * 0.055;

      transformed += normal * displacement;
      vNormal = normalize(normalMatrix * normal);
      vPosition = transformed;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uOpacity;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDirection)), 2.4);
      float verticalMix = smoothstep(-1.2, 1.2, vPosition.y);
      vec3 baseColor = mix(uColorA, uColorB, verticalMix);
      vec3 color = mix(baseColor, vec3(0.93, 0.97, 0.98), fresnel * 0.7);
      float alpha = uOpacity * (0.72 + fresnel * 0.28);

      gl_FragColor = vec4(color, alpha);
    }
  `;

  function createBlob(options) {
    const geometry = new THREE.IcosahedronGeometry(1, isMobile ? 3 : 5);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: sharedUniforms.uTime,
        uPointer: sharedUniforms.uPointer,
        uScroll: sharedUniforms.uScroll,
        uColorA: { value: new THREE.Color(options.colorA) },
        uColorB: { value: new THREE.Color(options.colorB) },
        uOpacity: { value: options.opacity }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const blob = new THREE.Mesh(geometry, material);
    blob.position.copy(options.position);
    blob.scale.setScalar(options.scale);
    blob.userData.speed = options.speed;
    blob.userData.offset = options.offset;
    blob.userData.basePosition = options.position.clone();
    blob.userData.baseScale = options.scale;
    group.add(blob);
    return blob;
  }

  function createParticleShell(blob, options) {
    const count = (isMobile ? 48 : 120) * PARTICLE_COUNT_MULTIPLIER;
    const densityAdjustedOpacity = options.opacity / Math.sqrt(PARTICLE_COUNT_MULTIPLIER);
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const positionIndex = index * 3;
      const y = 1 - (index / Math.max(count - 1, 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = index * 2.399963 + Math.random() * 0.16;
      const shellRadius = options.radius + (Math.random() - 0.5) * 0.12;

      positions[positionIndex] = Math.cos(theta) * radiusAtY * shellRadius;
      positions[positionIndex + 1] = y * shellRadius;
      positions[positionIndex + 2] = Math.sin(theta) * radiusAtY * shellRadius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: options.color,
      map: options.texture,
      size: isMobile ? 0.055 : 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: densityAdjustedOpacity,
      alphaTest: 0.015,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const shell = new THREE.Points(geometry, material);
    shell.renderOrder = 3;
    shell.userData.speed = options.speed * PARTICLE_SPEED_MULTIPLIER;
    shell.userData.offset = options.offset;
    shell.userData.baseOpacity = densityAdjustedOpacity;
    blob.add(shell);
    return shell;
  }

  function createOrbitingLights(blob, options) {
    const lights = [];
    const count = isMobile ? 4 : 9;

    for (let index = 0; index < count; index += 1) {
      const material = new THREE.SpriteMaterial({
        color: index % 3 === 0 ? 0xffffff : options.color,
        map: options.texture,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const light = new THREE.Sprite(material);
      const baseSize = 0.06 + Math.random() * 0.075;

      light.scale.setScalar(baseSize);
      light.renderOrder = 4;
      light.userData = {
        baseSize,
        radius: 1.02 + Math.random() * 0.18,
        phi: 0.35 + Math.random() * (Math.PI - 0.7),
        theta: Math.random() * Math.PI * 2,
        speed: options.speed * PARTICLE_SPEED_MULTIPLIER * (0.72 + Math.random() * 0.65),
        phase: Math.random() * Math.PI * 2
      };

      blob.add(light);
      lights.push(light);
    }

    return lights;
  }

  const blobs = [
    createBlob({
      colorA: 0x2f5577,
      colorB: 0x7ea5b5,
      opacity: 0.38,
      position: new THREE.Vector3(-4.2, 2.4, -2.8),
      scale: 3.35,
      speed: 0.12,
      offset: 0
    }),
    createBlob({
      colorA: 0x237f75,
      colorB: 0x9bc9c1,
      opacity: 0.3,
      position: new THREE.Vector3(4.5, -2.7, -3.4),
      scale: 2.85,
      speed: -0.1,
      offset: 2.3
    })
  ];

  const particleShells = [
    createParticleShell(blobs[0], {
      color: 0xd7f1f4,
      texture: coolGlowTexture,
      radius: 1.04,
      opacity: 0.82,
      speed: 0.085,
      offset: 0
    }),
    createParticleShell(blobs[1], {
      color: 0xc3f3e8,
      texture: tealGlowTexture,
      radius: 1.04,
      opacity: 0.76,
      speed: -0.1,
      offset: 1.7
    })
  ];

  const orbitingLights = [
    ...createOrbitingLights(blobs[0], {
      color: 0xb8e6ef,
      texture: coolGlowTexture,
      speed: 0.34
    }),
    ...createOrbitingLights(blobs[1], {
      color: 0xa9eadc,
      texture: tealGlowTexture,
      speed: -0.31
    })
  ];

  const particleCount = (isMobile ? 36 : 70) * PARTICLE_COUNT_MULTIPLIER;
  const particlePositions = new Float32Array(particleCount * 3);

  for (let index = 0; index < particleCount; index += 1) {
    const positionIndex = index * 3;
    particlePositions[positionIndex] = (Math.random() - 0.5) * 15;
    particlePositions[positionIndex + 1] = (Math.random() - 0.5) * 10;
    particlePositions[positionIndex + 2] = -2 - Math.random() * 7;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x526f80,
    map: coolGlowTexture,
    size: isMobile ? 0.065 : 0.075,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.34 / Math.sqrt(PARTICLE_COUNT_MULTIPLIER),
    alphaTest: 0.015,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const pointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);
  const scroll = { current: 0, target: 0 };
  const clock = new THREE.Clock();
  const homeCard = document.querySelector(".home-card");
  let animationFrameId = 0;
  let isVisible = !document.hidden;

  function handlePointerMove(event) {
    pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
  }

  function handleScroll() {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    scroll.target = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
  }

  function handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function renderFrame() {
    const elapsed = clock.getElapsedTime();
    pointer.lerp(pointerTarget, 0.045);
    scroll.current += (scroll.target - scroll.current) * (isMobile ? 0.09 : 0.055);

    const scrollProgress = scroll.current;
    const scrollArc = Math.sin(scrollProgress * Math.PI);

    sharedUniforms.uTime.value = elapsed;
    sharedUniforms.uPointer.value.copy(pointer);
    sharedUniforms.uScroll.value = scrollProgress;

    const targetRotationX = pointer.y * 0.055 + scrollProgress * 0.4;
    const targetRotationY = pointer.x * 0.075 + scrollProgress * 1.2;
    group.rotation.x += (targetRotationX - group.rotation.x) * 0.035;
    group.rotation.y += (targetRotationY - group.rotation.y) * 0.035;
    group.rotation.z = Math.sin(scrollProgress * Math.PI * 2.0) * 0.16;
    group.position.x = Math.sin(scrollProgress * Math.PI * 1.8) * 0.7;
    group.position.y = Math.sin(scrollProgress * Math.PI * 2.4) * 0.65;

    camera.position.x = Math.sin(scrollProgress * Math.PI * 1.5) * 0.4;
    camera.position.y = Math.cos(scrollProgress * Math.PI * 1.25) * 0.22;
    camera.position.z = 8.5 - scrollArc * 1.45;
    camera.lookAt(0, 0, 0);

    blobs.forEach(function (blob, index) {
      const direction = index === 0 ? 1 : -1;
      const basePosition = blob.userData.basePosition;
      const scalePulse = 1 + scrollArc * (index === 0 ? 0.24 : 0.18);

      blob.rotation.x = elapsed * blob.userData.speed + blob.userData.offset + scrollProgress * direction * 2.4;
      blob.rotation.y = elapsed * blob.userData.speed * 0.72 + index + scrollProgress * direction * 3.6;
      blob.position.x = basePosition.x + scrollProgress * direction * 1.4;
      blob.position.y = basePosition.y + Math.sin(elapsed * 0.45 + blob.userData.offset) * 0.08 - scrollProgress * direction * 1.8;
      blob.position.z = basePosition.z + scrollArc * (index === 0 ? 1.1 : 0.75);
      blob.scale.setScalar(blob.userData.baseScale * scalePulse);
    });

    particleShells.forEach(function (shell, index) {
      const direction = index === 0 ? 1 : -1;
      shell.rotation.y = elapsed * shell.userData.speed + scrollProgress * direction * 2.8;
      shell.rotation.x = Math.sin(elapsed * 0.18 * PARTICLE_SPEED_MULTIPLIER + shell.userData.offset) * 0.24 + scrollProgress * 0.7;
      const opacityPulse = 0.86 + Math.sin(elapsed * 0.7 * PARTICLE_SPEED_MULTIPLIER + shell.userData.offset) * 0.14;
      shell.material.opacity = shell.userData.baseOpacity * opacityPulse;
    });

    orbitingLights.forEach(function (light) {
      const data = light.userData;
      const theta = data.theta + elapsed * data.speed + scrollProgress * 4.2;
      const phi = data.phi + Math.sin(elapsed * 0.42 * PARTICLE_SPEED_MULTIPLIER + data.phase) * 0.28;
      const radius = data.radius + Math.sin(elapsed * 0.85 * PARTICLE_SPEED_MULTIPLIER + data.phase) * 0.045;
      const pulse = 1 + Math.sin(elapsed * 2.1 * PARTICLE_SPEED_MULTIPLIER + data.phase) * 0.32;

      light.position.setFromSphericalCoords(radius, phi, theta);
      light.scale.setScalar(data.baseSize * pulse);
      light.material.opacity = 0.6 + pulse * 0.18;
    });

    particles.rotation.y = elapsed * 0.012 * PARTICLE_SPEED_MULTIPLIER + pointer.x * 0.025 + scrollProgress * 1.8;
    particles.rotation.x = pointer.y * 0.015 + scrollProgress * 0.4;
    particles.position.y = scrollProgress * 1.6;
    particles.position.z = scrollArc * 1.4;

    if (homeCard && !reduceMotion) {
      const cardScale = 1 - scrollProgress * 0.12;
      const cardOffset = scrollProgress * window.innerHeight * 0.52;
      const cardRotation = Math.sin(scrollProgress * Math.PI * 1.5) * -1.8;
      const cardOpacity = Math.max(0.2, 1 - scrollProgress * 1.08);

      homeCard.style.transform = `translate3d(0, ${cardOffset}px, 0) scale(${cardScale}) rotate(${cardRotation}deg)`;
      homeCard.style.opacity = String(cardOpacity);
    }

    renderer.render(scene, camera);

    if (!reduceMotion && isVisible) {
      animationFrameId = window.requestAnimationFrame(renderFrame);
    }
  }

  function handleVisibilityChange() {
    isVisible = !document.hidden;

    if (!isVisible) {
      window.cancelAnimationFrame(animationFrameId);
      return;
    }

    clock.getDelta();
    renderFrame();
  }

  handleResize();
  handleScroll();
  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("scroll", handleScroll, { passive: true });

  if (!reduceMotion) {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  renderFrame();
}
