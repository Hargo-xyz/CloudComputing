// ==========================================
// DETEKSI DEVICE & OPTIMASI RESOLUSI (Ga Burik)
// ==========================================
const isMobile = window.innerWidth < 768;
// Menyesuaikan pixel ratio agar tajam tapi tetap ringan di mobile
const dpr = isMobile ? Math.min(window.devicePixelRatio, 1.2) : Math.min(window.devicePixelRatio, 1.5);

// ==========================================
// WARNA BUMI & DARATAN
// ==========================================
const style = getComputedStyle(document.body);
const colorWater = style.getPropertyValue("--globe-water").trim() || "#000000";
const colorLand = style.getPropertyValue("--globe-land").trim() || "#111111";

// ==========================================
// SCENE & CONTAINER
// ==========================================
const scene = new THREE.Scene();
const container = document.getElementById("canvas-container");

// ==========================================
// KAMERA
// ==========================================
// Far clipping dikurangi agar objek terlalu jauh tidak di-render
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 0, isMobile ? 400 : 320);

// ==========================================
// RENDERER (Optimasi GPU Mobile)
// ==========================================
const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: true,
  powerPreference: "high-performance",
  precision: isMobile ? "mediump" : "highp", // Meringankan GPU mobile secara drastis
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(dpr); // Bikin grafis "ga burik" sesuai layar
container.appendChild(renderer.domElement);

// ==========================================
// KONTROL & ANIMASI MENGORBIT
// ==========================================
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
// Animasi bumi mengorbit otomatis
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

// ==========================================
// BUMI UTAMA (Transparan & Berwarna)
// ==========================================
const globeRadius = 100;
// Sedikit kurangi segmen di mobile agar lebih lancar
const segments = isMobile ? 48 : 64;
const globeGeometry = new THREE.SphereGeometry(globeRadius, segments, segments);
const globeMaterial = new THREE.MeshBasicMaterial({ 
    color: colorWater, // Menggunakan warna dari file js sebelumnya
    transparent: true,
    opacity: 0.8 // Dibuat sedikit tebal agar garis daratan terlihat jelas
});
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
globe.rotation.x = 0.2; // Sedikit dimiringkan estetik
scene.add(globe);

// ==========================================
// BINTANG-BINTANG (Animasi Latar)
// ==========================================
const starsCount = isMobile ? 300 : 800;
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
  size: isMobile ? 1.2 : 1.5,
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
// DARATAN (Peta GeoJSON)
// ==========================================
function toSphericalCoords(lng, lat, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (-lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

function drawLines(coordinates, radius) {
    const material = new THREE.LineBasicMaterial({
        color: colorLand, // Warna daratan
        linewidth: 2,
        transparent: true,
        opacity: 0.9
    });

    coordinates.forEach(ring => {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        ring.forEach(coord => {
            const vertex = toSphericalCoords(coord[0], coord[1], radius);
            vertices.push(vertex.x, vertex.y, vertex.z);
        });
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const line = new THREE.Line(geometry, material);
        
        // Memasukkan garis ke dalam globe utama agar ikut rotasi
        globe.add(line); 
    });
}

function processGeoJSON(geojson) {
    geojson.features.forEach(feature => {
        const geom = feature.geometry;
        if (geom.type === 'Polygon') {
            drawLines(geom.coordinates, globeRadius);
        } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach(polygon => {
                drawLines(polygon, globeRadius);
            });
        }
    });
}

fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
    .then(response => response.json())
    .then(data => {
        processGeoJSON(data);
    })
    .catch(err => console.error('Error loading GeoJSON:', err));

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
    }, isMobile ? 150 : 50);
  }
});

// ==========================================
// ANIMATION LOOP (Dioptimasi)
// ==========================================
let animationCounter = 0;
const ANIMATION_TICKS_PER_RENDER = isMobile ? 3 : 1;

function animate() {
  requestAnimationFrame(animate);

  animationCounter++;
  
  if (animationCounter % ANIMATION_TICKS_PER_RENDER === 0) {
    // Rotasi bintang perlahan
    starField.rotation.y += 0.00005;
    starField.rotation.x += 0.00001;
    
    // Update kontrol agar animasi orbit bumi berjalan
    controls.update();
  }

  renderer.render(scene, camera);
}

animate();
