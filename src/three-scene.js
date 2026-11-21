import * as THREE from 'three';

export class ParticlePortraitScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.mouse = new THREE.Vector2(-999, -999);
    this.targetMouse = new THREE.Vector2(-999, -999);
    this.normalizedMouse = new THREE.Vector2(0, 0);
    this.targetRotation = new THREE.Vector2(0, 0);
    this.horizontalScroll = 0;
    this.currentHorizontalScroll = 0;
    this.clock = new THREE.Clock();

    this.initScene();
    this.initListeners();
    this.loadAndBuildPortrait();
  }

  initScene() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0, 14.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050507, 1);
    this.container.appendChild(this.renderer.domElement);

    this.portraitGroup = new THREE.Group();
    this.scene.add(this.portraitGroup);

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.intersectionPoint = new THREE.Vector3();

    this.createBackgroundStars();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  createBackgroundStars() {
    const starCount = 380;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;

      const brightness = Math.random() * 0.7 + 0.3;
      colors[i * 3 + 0] = brightness;
      colors[i * 3 + 1] = brightness * 0.95;
      colors[i * 3 + 2] = brightness * 1.05;

      sizes[i] = Math.random() * 2.2 + 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          float twinkle = sin(uTime * 2.0 + position.x * 3.0 + position.y * 2.0) * 0.3 + 0.7;
          vAlpha = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio * (12.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float d = length(coord);
          if (d > 0.45) discard;
          gl_FragColor = vec4(vColor, vAlpha * (1.0 - smoothstep(0.2, 0.45, d)));
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.starField = new THREE.Points(geometry, starMaterial);
    this.scene.add(this.starField);
  }

  loadAndBuildPortrait() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/portrait_clean.png';

    img.onload = () => {
      this.buildParticleMesh(img);
    };
  }

  buildParticleMesh(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Chunky artistic mosaic grid matching reference (cols = 84)
    const cols = 84;
    const aspect = img.height / img.width; // ~1.18
    const rows = Math.round(cols * aspect); // ~99 rows

    canvas.width = cols;
    canvas.height = rows;
    ctx.drawImage(img, 0, 0, cols, rows);
    const imgData = ctx.getImageData(0, 0, cols, rows).data;

    // Helper to check transparency of grid neighbor
    const isTransparent = (checkR, checkC) => {
      if (checkR < 0 || checkR >= rows || checkC < 0 || checkC >= cols) return true;
      const idx = (checkR * cols + checkC) * 4;
      return imgData[idx + 3] < 30;
    };

    // World size
    const worldHeight = 11.2;
    const worldWidth = worldHeight / aspect;

    const positions = [];
    const originalPositions = [];
    const colors = [];
    const sizes = [];
    const indices = [];
    const isLooseList = [];

    // Rich artistic stained-glass mosaic palette (matching user close-up reference)
    const mosaicPalette = [
      new THREE.Color('#ffe600'), // Bright Canary Yellow
      new THREE.Color('#ffaa00'), // Warm Amber Gold
      new THREE.Color('#ff6600'), // Tangerine Orange
      new THREE.Color('#ff1744'), // Vivid Ruby Red
      new THREE.Color('#f50057'), // Hot Magenta
      new THREE.Color('#ff4081'), // Rose Pink
      new THREE.Color('#d500f9'), // Electric Purple
      new THREE.Color('#651fff'), // Deep Royal Violet
      new THREE.Color('#2979ff'), // Electric Cobalt Blue
      new THREE.Color('#00e5ff'), // Neon Cyan / Turquoise
      new THREE.Color('#00e676'), // Mint Emerald Green
      new THREE.Color('#76ff03'), // Chartreuse Lime
      new THREE.Color('#ffffff'), // Pure Brilliant White
      new THREE.Color('#e0f7fa'), // Pale Ice Blue
      new THREE.Color('#fff9c4')  // Soft Cream
    ];

    let pIdx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4;
        const red = imgData[i];
        const green = imgData[i + 1];
        const blue = imgData[i + 2];
        const alpha = imgData[i + 3];

        // Skip background transparent pixels
        if (alpha < 30) continue;

        // Normalized grid coordinates (0 to 1)
        const u = c / cols;
        const v = r / rows;

        // Centered world coordinates
        const x = (u - 0.5) * worldWidth;
        const y = -(v - 0.44) * worldHeight;

        // Perceived luminance
        const lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255.0;

        // 3D anatomical depth (Z axis)
        const dx = (u - 0.5) * 2.0;
        const dy = (v - 0.35) * 2.2;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const skullDome = Math.max(0, 1.0 - distFromCenter * 1.2) * 0.9;
        const z = (lum * 1.25) + skullDome - 0.2;

        positions.push(x, y, z);
        originalPositions.push(x, y, z);
        isLooseList.push(0.0);

        // Dynamic Tile Sizing & Color Palette Matching Close-up Reference:
        let pointColor = new THREE.Color();
        let pointSize = 3.2;

        const isFaceZone = (v > 0.16 && v < 0.65 && Math.abs(u - 0.48) < 0.34);

        if (isFaceZone && lum > 0.22) {
          // Face & neck zone: Rich chromatic mosaic (~55% colorful jewel tiles, 45% bright white/silver)
          if (Math.random() < 0.55) {
            pointColor = mosaicPalette[Math.floor(Math.random() * mosaicPalette.length)];
          } else {
            const val = 0.65 + lum * 0.35;
            pointColor.setRGB(val, val, val * 1.02);
          }

          // Distinct size variation: Chunky prominent mosaic squares on highlights, smaller in midtones
          if (lum > 0.40) {
            pointSize = 4.6 + lum * 1.6; // Chunky prominent square tiles
          } else {
            pointSize = 3.0 + lum * 2.4; // Midtone tiles
          }
        } else if (lum > 0.25) {
          // Highlight contours on cap edge, collar, and shoulders
          if (Math.random() < 0.18) {
            pointColor = mosaicPalette[Math.floor(Math.random() * mosaicPalette.length)];
            pointSize = 3.6;
          } else {
            const val = 0.45 + lum * 0.55;
            pointColor.setRGB(val, val, val);
            pointSize = 2.8 + lum * 1.4;
          }
        } else {
          // Dark cap & clothing: tiny delicate halftone micro-dots
          const val = 0.08 + lum * 0.22;
          pointColor.setRGB(val, val, val * 1.05);
          pointSize = 1.3 + lum * 1.8; // Tiny pinpoint dots for shadows
        }

        colors.push(pointColor.r, pointColor.g, pointColor.b);
        sizes.push(pointSize);
        indices.push(pIdx++);

        // Check if this pixel is on the outer silhouette boundary
        const isEdge = isTransparent(r - 1, c) || isTransparent(r + 1, c) || isTransparent(r, c - 1) || isTransparent(r, c + 1);

        // Detached / Loose pixels floating off the edges (~28% of edge pixels spawn floating satellite tiles)
        if (isEdge && Math.random() < 0.28) {
          const edgeAngle = Math.atan2(y, x) + (Math.random() - 0.5) * 1.1;
          const driftDist = Math.random() * 1.5 + 0.35; // float 0.35 to 1.85 units outward
          const looseX = x + Math.cos(edgeAngle) * driftDist;
          const looseY = y + Math.sin(edgeAngle) * driftDist;
          const looseZ = z + (Math.random() - 0.5) * 1.2;

          positions.push(looseX, looseY, looseZ);
          originalPositions.push(looseX, looseY, looseZ);
          isLooseList.push(1.0); // Marks as floating loose pixel

          // Loose pixel color & size (some colorful, some white/dim)
          let looseColor = new THREE.Color();
          if (Math.random() < 0.45) {
            looseColor = mosaicPalette[Math.floor(Math.random() * mosaicPalette.length)];
          } else {
            const lv = Math.random() * 0.6 + 0.3;
            looseColor.setRGB(lv, lv, lv);
          }
          colors.push(looseColor.r, looseColor.g, looseColor.b);

          // Varied sizes for loose pixels
          const looseSize = Math.random() * 2.6 + 1.6;
          sizes.push(looseSize);
          indices.push(pIdx++);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aOriginalPosition', new THREE.Float32BufferAttribute(originalPositions, 3));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aIndex', new THREE.Float32BufferAttribute(indices, 1));
    geometry.setAttribute('aIsLoose', new THREE.Float32BufferAttribute(isLooseList, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(-999, -999) },
        uMouseRadius: { value: 1.8 },
        uMouseStrength: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uHorizontalProgress: { value: 0.0 }
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uMouseRadius;
        uniform float uMouseStrength;
        uniform float uPixelRatio;

        attribute vec3 aOriginalPosition;
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aIndex;
        attribute float aIsLoose;

        varying vec3 vColor;

        void main() {
          vColor = aColor;
          vec3 pos = aOriginalPosition;

          // Organic breathing motion
          pos.z += sin(uTime * 1.8 + aIndex * 0.1) * 0.03;

          // Gentle floating drift for loose detached pixels on the edges
          if (aIsLoose > 0.5) {
            pos.x += sin(uTime * 1.3 + aIndex * 1.4) * 0.08;
            pos.y += cos(uTime * 1.1 + aIndex * 1.2) * 0.08;
            pos.z += sin(uTime * 0.9 + aIndex * 0.8) * 0.10;
          }

          // Mouse hover repulsion (smooth fluid disturbance)
          vec2 mouseDiff = pos.xy - uMouse;
          float dist = length(mouseDiff);
          if (dist < uMouseRadius && uMouse.x > -500.0) {
            float influence = 1.0 - smoothstep(0.0, uMouseRadius, dist);
            vec2 dir = (dist > 0.001) ? normalize(mouseDiff) : vec2(0.0, 1.0);
            pos.xy += dir * influence * (uMouseStrength * 0.45);
            pos.z += influence * (uMouseStrength * 0.9);
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Point size: perspective scaled with fixed cell bound so dots never overlap
          gl_PointSize = aSize * uPixelRatio * (14.5 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform float uHorizontalProgress;
        varying vec3 vColor;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          // Sharp square tile with gap
          float d = max(abs(coord.x), abs(coord.y));
          if (d > 0.44) discard;

          // Micro border bevel
          float edge = smoothstep(0.35, 0.44, d);
          vec3 col = mix(vColor, vColor * 0.72, edge);

          float alpha = clamp(1.0 - uHorizontalProgress * 0.55, 0.1, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, this.particleMaterial);
    this.portraitGroup.add(this.points);
  }

  initListeners() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      if (this.particleMaterial) {
        this.particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
      }
      if (this.starField) {
        this.starField.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.normalizedMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.normalizedMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Realistic 3D head tilt in perspective
      this.targetRotation.y = this.normalizedMouse.x * 0.35;
      this.targetRotation.x = -this.normalizedMouse.y * 0.22;

      this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.plane, this.intersectionPoint)) {
        this.targetMouse.x = this.intersectionPoint.x;
        this.targetMouse.y = this.intersectionPoint.y;
      }
    });
  }

  setHorizontalScroll(progress) {
    this.horizontalScroll = THREE.MathUtils.clamp(progress, 0, 1);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const elapsedTime = this.clock.getElapsedTime();

    // Smooth lerp mouse interaction point
    this.mouse.lerp(this.targetMouse, 0.14);

    // Smooth lerp horizontal scroll parallax
    this.currentHorizontalScroll += (this.horizontalScroll - this.currentHorizontalScroll) * 0.08;
    this.portraitGroup.position.x = -this.currentHorizontalScroll * 10.5;
    this.portraitGroup.position.z = -this.currentHorizontalScroll * 3.5;

    // Smooth lerp 3D parallax head rotation with horizontal shift
    const baseRotY = this.targetRotation.y - (this.currentHorizontalScroll * 0.45);
    this.portraitGroup.rotation.y += (baseRotY - this.portraitGroup.rotation.y) * 0.06;
    this.portraitGroup.rotation.x += (this.targetRotation.x - this.portraitGroup.rotation.x) * 0.06;

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = elapsedTime;
      this.particleMaterial.uniforms.uMouse.value.copy(this.mouse);
      this.particleMaterial.uniforms.uHorizontalProgress.value = this.currentHorizontalScroll;
    }

    if (this.starField) {
      this.starField.material.uniforms.uTime.value = elapsedTime;
      this.starField.position.x = -this.currentHorizontalScroll * 4.0;
      this.starField.rotation.y = this.targetRotation.y * 0.15;
      this.starField.rotation.x = this.targetRotation.x * 0.15;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
