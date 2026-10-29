import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

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

  targetCanvas.dataset.background = "interactive-cubes";
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
  camera.position.set(0, 0, 9);

  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  const hemisphereLight = new THREE.HemisphereLight(0xeafaff, 0x24384c, 1.9);
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  const blueLight = new THREE.PointLight(0x82c7e8, 11, 18, 2);
  const tealLight = new THREE.PointLight(0x74d8c7, 9, 16, 2);
  keyLight.position.set(-3.5, 5, 7);
  blueLight.position.set(-5, 1, 4);
  tealLight.position.set(5, -2, 3);
  scene.add(hemisphereLight, keyLight, blueLight, tealLight);

  function createCube(options) {
    const container = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: options.color,
      roughness: 0.16,
      metalness: 0.12,
      transmission: 0.32,
      thickness: 1.2,
      ior: 1.38,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide
    });
    const cube = new THREE.Mesh(geometry, material);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: options.edgeColor,
      transparent: true,
      opacity: 0.52
    });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
    edges.scale.setScalar(1.006);

    const innerMaterial = new THREE.MeshStandardMaterial({
      color: options.innerColor,
      emissive: options.innerColor,
      emissiveIntensity: 0.28,
      roughness: 0.24,
      metalness: 0.18,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const innerCube = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), innerMaterial);
    innerCube.rotation.set(0.35, -0.3, 0.18);

    container.add(cube, edges, innerCube);
    container.position.copy(options.position);
    container.scale.setScalar(options.scale);
    container.rotation.copy(options.rotation);
    container.userData = {
      basePosition: options.position.clone(),
      baseRotation: options.rotation.clone(),
      speed: options.speed,
      phase: options.phase,
      scale: options.scale,
      avoidOffset: new THREE.Vector3(),
      innerCube
    };
    cubeGroup.add(container);
    return container;
  }

  const desktopCubes = [
    {
      color: 0x527b9e,
      edgeColor: 0xb8d8e9,
      innerColor: 0x8dcce5,
      position: new THREE.Vector3(-4.7, 2.5, -2.8),
      scale: 1.75,
      rotation: new THREE.Euler(0.45, 0.58, -0.22),
      speed: 0.12,
      phase: 0
    },
    {
      color: 0x4b9a8e,
      edgeColor: 0xb8e5dc,
      innerColor: 0x86d8c7,
      position: new THREE.Vector3(4.65, -2.35, -3.1),
      scale: 1.9,
      rotation: new THREE.Euler(-0.32, 0.72, 0.28),
      speed: -0.1,
      phase: 2.1
    },
    {
      color: 0x7185aa,
      edgeColor: 0xd2dcf0,
      innerColor: 0xaabce0,
      position: new THREE.Vector3(4.15, 2.8, -5.3),
      scale: 1.18,
      rotation: new THREE.Euler(0.72, -0.45, 0.36),
      speed: 0.085,
      phase: 4.2
    },
    {
      color: 0x5d88a5,
      edgeColor: 0xc4ddea,
      innerColor: 0x92c7dc,
      position: new THREE.Vector3(-4.7, -2.65, -4.1),
      scale: 0.82,
      rotation: new THREE.Euler(-0.28, 0.38, 0.48),
      speed: -0.14,
      phase: 1.1
    },
    {
      color: 0x61998f,
      edgeColor: 0xc8e4dd,
      innerColor: 0x95d2c6,
      position: new THREE.Vector3(-3.15, 0.15, -6.1),
      scale: 0.5,
      rotation: new THREE.Euler(0.62, -0.38, -0.3),
      speed: 0.17,
      phase: 3.4
    },
    {
      color: 0x7889aa,
      edgeColor: 0xd8e0ef,
      innerColor: 0xb2bee0,
      position: new THREE.Vector3(5.1, 0.3, -4.4),
      scale: 0.68,
      rotation: new THREE.Euler(0.34, 0.82, -0.4),
      speed: -0.13,
      phase: 5.1
    },
    {
      color: 0x4f8d98,
      edgeColor: 0xc1dce1,
      innerColor: 0x8fc8d1,
      position: new THREE.Vector3(2.9, -3.65, -6.2),
      scale: 0.46,
      rotation: new THREE.Euler(-0.65, 0.22, 0.58),
      speed: 0.19,
      phase: 0.7
    },
    {
      color: 0x657da0,
      edgeColor: 0xd0dbea,
      innerColor: 0xa4b9d8,
      position: new THREE.Vector3(-2.85, 3.75, -5.7),
      scale: 0.74,
      rotation: new THREE.Euler(0.22, -0.72, 0.26),
      speed: 0.11,
      phase: 2.8
    },
    {
      color: 0x58978a,
      edgeColor: 0xc5e3dc,
      innerColor: 0x91cfc0,
      position: new THREE.Vector3(5.45, 3.6, -6.5),
      scale: 0.54,
      rotation: new THREE.Euler(0.78, 0.16, -0.52),
      speed: -0.16,
      phase: 4.8
    },
    {
      color: 0x668ba3,
      edgeColor: 0xc9dce7,
      innerColor: 0x9bc4d4,
      position: new THREE.Vector3(-5.45, -0.35, -6.2),
      scale: 0.56,
      rotation: new THREE.Euler(-0.48, 0.68, 0.18),
      speed: 0.15,
      phase: 1.9
    },
    {
      color: 0x7a87a6,
      edgeColor: 0xd9deeb,
      innerColor: 0xb3bcda,
      position: new THREE.Vector3(3.05, 0.9, -7.1),
      scale: 0.38,
      rotation: new THREE.Euler(0.42, -0.28, 0.72),
      speed: -0.2,
      phase: 3.9
    },
    {
      color: 0x508f84,
      edgeColor: 0xc1e0d9,
      innerColor: 0x8bcbbe,
      position: new THREE.Vector3(-3.9, -3.85, -6.4),
      scale: 0.43,
      rotation: new THREE.Euler(-0.18, -0.58, 0.36),
      speed: 0.18,
      phase: 5.7
    }
  ];

  const mobileCubes = desktopCubes.map(function (cube) {
    return {
      ...cube,
      position: new THREE.Vector3(cube.position.x * 0.34, cube.position.y * 0.96, cube.position.z - 0.15),
      scale: cube.scale * 0.68
    };
  });

  const cubes = (isMobile ? mobileCubes : desktopCubes).map(createCube);
  targetCanvas.dataset.cubeCount = String(cubes.length);
  targetCanvas.dataset.interactive = String(!reduceMotion);

  const particleCount = isMobile ? 34 : 64;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3;
    particlePositions[offset] = (Math.random() - 0.5) * 15;
    particlePositions[offset + 1] = (Math.random() - 0.5) * 10;
    particlePositions[offset + 2] = -2 - Math.random() * 7;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x7ba5b8,
    size: isMobile ? 0.035 : 0.045,
    transparent: true,
    opacity: 0.34,
    depthWrite: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const projectedPosition = new THREE.Vector3();
  const desiredAvoidOffset = new THREE.Vector3();
  const scroll = { current: 0, target: 0 };
  const clock = new THREE.Clock();
  let animationFrameId = 0;
  let isVisible = !document.hidden;
  let isPointerActive = false;

  function handlePointerMove(event) {
    isPointerActive = true;
    pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
  }

  function handlePointerLeave() {
    isPointerActive = false;
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
    scroll.current += (scroll.target - scroll.current) * (isMobile ? 0.08 : 0.05);

    cubeGroup.rotation.x += (pointer.y * 0.055 - cubeGroup.rotation.x) * 0.035;
    cubeGroup.rotation.y += (pointer.x * 0.075 + scroll.current * 0.32 - cubeGroup.rotation.y) * 0.035;
    cubeGroup.updateMatrixWorld(true);

    cubes.forEach(function (cube, index) {
      const data = cube.userData;
      const direction = index % 2 === 0 ? 1 : -1;
      const floatX = Math.cos(elapsed * 0.3 + data.phase) * 0.07;
      const floatY = Math.sin(elapsed * 0.48 + data.phase) * 0.16;

      desiredAvoidOffset.set(0, 0, 0);
      if (isPointerActive) {
        cube.getWorldPosition(projectedPosition);
        projectedPosition.project(camera);
        let deltaX = projectedPosition.x - pointer.x;
        let deltaY = projectedPosition.y - pointer.y;
        let distance = Math.hypot(deltaX, deltaY);
        const avoidRadius = 0.22 + Math.min(data.scale, 1.9) * 0.11;

        if (distance < avoidRadius) {
          if (distance < 0.001) {
            deltaX = Math.cos(data.phase);
            deltaY = Math.sin(data.phase);
            distance = 1;
          }
          const strength = (avoidRadius - distance) / avoidRadius;
          desiredAvoidOffset.set(
            (deltaX / distance) * strength * (1.15 + data.scale * 0.34),
            (deltaY / distance) * strength * (0.9 + data.scale * 0.24),
            strength * 0.18
          );
        }
      }

      data.avoidOffset.lerp(desiredAvoidOffset, isPointerActive ? 0.12 : 0.075);
      cube.rotation.x = data.baseRotation.x + elapsed * data.speed + scroll.current * direction * 0.7;
      cube.rotation.y = data.baseRotation.y + elapsed * data.speed * 1.25 + scroll.current * direction;
      cube.rotation.z = data.baseRotation.z + elapsed * data.speed * 0.55;
      cube.position.set(
        data.basePosition.x + floatX + data.avoidOffset.x,
        data.basePosition.y + floatY + data.avoidOffset.y,
        data.basePosition.z + data.avoidOffset.z
      );
      data.innerCube.rotation.x = -elapsed * data.speed * 1.5 + data.phase;
      data.innerCube.rotation.y = elapsed * data.speed * 1.8;
    });

    particles.rotation.y = elapsed * 0.01 + pointer.x * 0.018;
    particles.position.y = scroll.current * 0.5;
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
    document.documentElement.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);
  renderFrame();
}
