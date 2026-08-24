// ==========================================
// DEVICE DETECTION
// ==========================================
const isMobile = window.innerWidth < 768;
const dpr = isMobile ? Math.min(window.devicePixelRatio, 1.2) : Math.min(window.devicePixelRatio, 1.5);

// ==========================================
// COLORS
// ==========================================
const style = getComputedStyle(document.body);
const colorWater = style.getPropertyValue("--globe-water").trim() || "#000000";
const colorLand = style.getPropertyValue("--globe-land").trim() || "#111111";

// ==========================================
// CONTAINER & SCENE
// ==========================================
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();

// ==========================================
// CAMERA
// ==========================================
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1500 // OPTIMASI: Kurangi far clipping plane agar object super jauh tidak di-render
);
camera.position.set(0, 0, isMobile ? 400 : 320);

// ==========================================
// RENDERER (OPTIMASI GPU)
// ==========================================
const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile, 
  alpha: true,
  powerPreference: "high-performance",
  precision: isMobile ? "mediump" : "highp", // OPTIMASI KRITIS: Meringankan GPU mobile secara drastis
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(dpr);
container.appendChild(renderer.domElement);

// ==========================================
// ORBIT CONTROLS
// ==========================================
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

// ==========================================
// GLOBE
// ==========================================
const globe = new ThreeGlobe()
  .showGlobe(true)
  .showAtmosphere(!isMobile)
  .atmosphereColor("#588fe9")
  .atmosphereAltitude(0.18);

globe.globeMaterial().color = new THREE.Color(colorWater);
globe.globeMaterial().roughness = 0.7;
globe.globeMaterial().metalness = 0.1;

globe.rotation.x = 0.2;
globe.rotation.y = Math.PI;
scene.add(globe);

// ==========================================
// STARFIELD (OPTIMASI)
// ==========================================
const starsCount = isMobile ? 300 : 800; // Dikurangi sedikit, tapi size dibesarkan agar tetap penuh
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starsCount * 3);
const starColors = new Float32Array(starsCount * 3);
const starColor = new THREE.Color();

for (let i = 0; i < starsCount; i++) {
  const i3 = i * 3;
  const distance = 280 + Math.pow(Math.random(), 0.65) * 850;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const sinPhi = Math.sin(phi);

  starPositions[i3] = distance * sinPhi * Math.cos(theta);
  starPositions[i3 + 1] = distance * sinPhi * Math.sin(theta);
  starPositions[i3 + 2] = distance * Math.cos(phi);

  const random = Math.random();
  if (random < 0.72) starColor.setRGB(1, 1, 1);
  else if (random < 0.87) starColor.setRGB(0.72, 0.85, 1);
  else if (random < 0.97) starColor.setRGB(1, 0.92, 0.75);
  else starColor.setRGB(0.55, 0.75, 1);

  starColors[i3] = starColor.r;
  starColors[i3 + 1] = starColor.g;
  starColors[i3 + 2] = starColor.b;
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: isMobile ? 1.2 : 1.5, // Besarkan sedikit untuk kompensasi jumlah yang dikurangi
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const starField = new THREE.Points(starGeometry, starMaterial);
starField.frustumCulled = false;
scene.add(starField);

// ==========================================
// SERVER NODES & LABELS
// ==========================================
const serverNodes = [
  { name: "Indonesia", lat: -6.2, lng: 106.84, type: "server" },
  { name: "USA", lat: 38.03, lng: -78.51, type: "server" },
  { name: "Japan", lat: 35.67, lng: 139.65, type: "server" },
  { name: "Germany", lat: 50.11, lng: 8.68, type: "server" },
  { name: "Singapore", lat: 1.35, lng: 103.81, type: "server" },
  { name: "UK", lat: 51.5, lng: -0.12, type: "server" },
  { name: "Australia", lat: -33.86, lng: 151.2, type: "server" },
  { name: "Brazil", lat: -23.55, lng: -46.63, type: "server" },
  { name: "India", lat: 19.07, lng: 72.87, type: "server" },
  { name: "UEA", lat: 25.2, lng: 55.27, type: "server" },
];

const serverLabels = new THREE.Group();
globe.add(serverLabels);

function createServerLabel(text) {
  // Simplified label for better mobile performance - reduce canvas size and DPR overhead
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // Use lower DPR on mobile to save VRAM, still crisp enough for node labels
  const localDpr = isMobile ? Math.min(window.devicePixelRatio, 1.5) : 2;

  const fontSize = (isMobile ? 24 : 40) * localDpr;
  const subFontSize = (isMobile ? 12 : 16) * localDpr;

  ctx.font = `900 ${fontSize}px "Space Grotesk", sans-serif`;
  const textWidth = ctx.measureText(text.toUpperCase()).width;
  ctx.font = `600 ${subFontSize}px monospace`;
  const subTextWidth = ctx.measureText("ACTIVE").width;
  const contentWidth = Math.max(textWidth, subTextWidth);

  // Reduced padding for mobile
  const paddingX = isMobile ? 16 * localDpr : 24 * localDpr;
  const paddingY = isMobile ? 12 * localDpr : 16 * localDpr;
  const glowMargin = isMobile ? 12 * localDpr : 16 * localDpr;

  // Fixed size canvas to avoid dynamic resizing overhead
  const canvasSize = contentWidth + (paddingX * 2) + (glowMargin * 2) + (32 * localDpr);
  canvas.width = canvasSize;
  canvas.height = fontSize + subFontSize + (paddingY * 2) + (glowMargin * 2);

  const startX = glowMargin;
  const startY = glowMargin;
  const boxW = canvas.width - (glowMargin * 2);
  const boxH = canvas.height - (glowMargin * 2);

  // Simple rounded rect background
  const radius = isMobile ? 8 * localDpr : 12 * localDpr;
  ctx.beginPath();
  ctx.moveTo(startX + radius, startY);
  ctx.lineTo(startX + boxW - radius, startY);
  ctx.quadraticCurveTo(startX + boxW, startY, startX + boxW, startY + radius);
  ctx.lineTo(startX + boxW, startY + boxH - radius);
  ctx.quadraticCurveTo(startX + boxW, startY + boxH, startX + boxW - radius, startY + boxH);
  ctx.lineTo(startX + radius, startY + boxH);
  ctx.quadraticCurveTo(startX, startY + boxH, startX, startY + boxH - radius);
  ctx.lineTo(startX, startY + radius);
  ctx.quadraticCurveTo(startX, startY, startX + radius, startY);
  ctx.closePath();

  // Solid dark background
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fill();

  // Border
  ctx.lineWidth = isMobile ? 1.5 * localDpr : 2 * localDpr;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
  ctx.stroke();

  // Accent bar
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(startX, startY, 12 * localDpr, 3 * localDpr);
  ctx.fillRect(startX + boxW - (12 * localDpr), startY + boxH - (3 * localDpr), 12 * localDpr, 3 * localDpr);

  // Dot
  const dotX = startX + paddingX;
  const dotY = startY + (boxH / 2);
  ctx.beginPath();
  ctx.arc(dotX, dotY, isMobile ? 4 * localDpr : 6 * localDpr, 0, Math.PI * 2);
  ctx.fillStyle = "#10b981";
  ctx.fill();

  // Text - uppercase only, smaller footprint
  const textStartX = dotX + (20 * localDpr);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${fontSize}px "Space Grotesk", sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.fillText(text.toUpperCase(), textStartX, startY + (boxH / 2) + (2 * localDpr));

  // Smaller subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 ${subFontSize}px monospace`;
  ctx.textBaseline = "top";
  ctx.fillText("ACTIVE", textStartX, startY + (boxH / 2) + (6 * localDpr));

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  // Adjusted scale for the simplified label size
  sprite.scale.set(canvas.width * (isMobile ? 0.06 : 0.08) / localDpr, canvas.height * (isMobile ? 0.06 : 0.08) / localDpr, 1);
  sprite.renderOrder = 1;

  return sprite;
}

function addServerLabels() {
  serverNodes.forEach((server) => {
    const coords = globe.getCoords(server.lat, server.lng, 0.05);
    const label = createServerLabel(server.name);
    label.position.set(coords.x, coords.y, coords.z);
    serverLabels.add(label);
  });
}

// ==========================================
// GEOJSON & DATA POPULATION
// ==========================================
let ringData = [];

function extractPointsFromGeoJSON(features) {
  const points = [];
  features.forEach((feature) => {
    if (!feature.geometry) return;
    const processCoords = (coords) => {
      coords.forEach((coord) => {
        if (typeof coord[0] === "number" && typeof coord[1] === "number") {
          points.push({ lng: coord[0], lat: coord[1] });
        } else if (Array.isArray(coord)) {
          processCoords(coord);
        }
      });
    };
    processCoords(feature.geometry.coordinates);
  });
  return points;
}

fetch("./custom.geo.json")
  .then((res) => res.json())
  .then((geojson) => {
    const featuresData = geojson.features ? geojson.features : [geojson];

    globe
      .polygonsData(featuresData)
      .polygonCapColor(() => colorLand)
      .polygonSideColor(() => "#1e3a8a")
      .polygonStrokeColor(() => "#1b2c41")
      .polygonAltitude(0.01);

    const landPoints = extractPointsFromGeoJSON(featuresData);
    const userNodes = [];
    const MAX_USER_POINTS = isMobile ? 20 : 50;
    // Cap samples to prevent excessive random access on large geoJSON
    const usablePoints = landPoints.slice(0, MAX_USER_POINTS * 2);
    const NUM_USERS = Math.min(isMobile ? 15 : 45, landPoints.length, MAX_USER_POINTS);

    for (let i = 0; i < NUM_USERS; i++) {
      const idx = Math.floor(Math.random() * usablePoints.length);
      const pt = usablePoints[idx];
      userNodes.push({ lat: pt.lat, lng: pt.lng, type: "user" });
    }

    globe
      .pointsData([...serverNodes, ...userNodes])
      .pointLat("lat")
      .pointLng("lng")
      .pointColor((d) => (d.type === "server" ? "#ef4444" : "#00c3ff"))
      .pointRadius((d) => (d.type === "server" ? 0.85 : 0.35))
      .pointAltitude(0.02)
      .pointResolution(isMobile ? 8 : 16); // Polygon lebih sedikit = lebih ringan

    addServerLabels();

    const arcsData = [];
    const NUM_ARCS = isMobile ? 12 : 40; // Kurangi jumlah route arc di mobile

    for (let i = 0; i < NUM_ARCS; i++) {
      const startNode = userNodes[Math.floor(Math.random() * userNodes.length)];
      const endNode = serverNodes[Math.floor(Math.random() * serverNodes.length)];
      if (startNode && endNode) {
        arcsData.push({
          startLat: startNode.lat,
          startLng: startNode.lng,
          endLat: endNode.lat,
          endLng: endNode.lng,
          color: ["#5d82d1", "#0059ff"],
          duration: 1100 + Math.random() * 1300,
          lastTrigger: 0,
        });
      }
    }

    globe
      .arcsData(arcsData)
      .arcColor("color")
      .arcDashLength(0.35)
      .arcDashGap(1.5)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime((d) => d.duration)
      .arcStroke(isMobile ? 0.6 : 0.5) // Sedikit ditebalkan di mobile agar lebih jelas
      .arcAltitudeAutoScale(0.28);

    globe
      .ringsData([])
      .ringLat("lat")
      .ringLng("lng")
      .ringColor(() => (t) => `rgba(239, 68, 68, ${Math.pow(1 - t, 2)})`)
      .ringMaxRadius(3.5)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(0);

    const MAX_RINGS = isMobile ? 4 : 12; // OPTIMASI: Batasi maksimal ring yang aktif bersamaan

    // OPTIMASI: Kurangi interval dan hindari Array mutasi berlebih
    setInterval(() => {
      const now = Date.now();
      let hasUpdate = false;
      const activeRings = [];

      arcsData.forEach((arc) => {
        if (!arc.lastTrigger || now - arc.lastTrigger > arc.duration) {
          arc.lastTrigger = now;
          activeRings.push({ lat: arc.endLat, lng: arc.endLng });
          hasUpdate = true;
        }
      });

      if (hasUpdate) {
        // Ambil data terbaru secukupnya untuk menghindari Three.js membuat geometri telalu banyak
        globe.ringsData(activeRings.slice(-MAX_RINGS));
      }
    }, isMobile ? 1200 : 600); // Trigger lebih lambat di mobile agar GPU bisa bernapas
  })
  .catch((err) => console.error("Error loading JSON:", err));

// ==========================================
// LIGHTS
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0x38bdf8, 2);
directionalLight1.position.set(1, 1, 1);
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0x818cf8, 1);
directionalLight2.position.set(-1, -1, -1);
scene.add(directionalLight2);

// ==========================================
// RESIZE (Throttled for mobile performance)
// ==========================================
let resizeTimeout = null;
window.addEventListener("resize", () => {
  if (!resizeTimeout) {
    resizeTimeout = setTimeout(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      resizeTimeout = null;
    }, isMobile ? 150 : 50); // Debounce resize on mobile to avoid layout thrashing
  }
});

// ==========================================
// ANIMATION LOOP (Dioptimasi)
// ==========================================
// Reduced star rotation speed on mobile; use a per-frame counter to limit renderer calls
let animationCounter = 0;
const ANIMATION_TICKS_PER_RENDER = isMobile ? 3 : 1; // Throttle on mobile

function animate() {
  requestAnimationFrame(animate);

  animationCounter++;
  // Only update star rotation and controls every N frames to save GPU on mobile
  if (animationCounter % ANIMATION_TICKS_PER_RENDER === 0) {
    // Rotasi bintang lebih halus
    starField.rotation.y += 0.00005;
    starField.rotation.x += 0.00001;
    controls.update();
  }

  renderer.render(scene, camera);
}

animate();