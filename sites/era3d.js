(function () {
  var THREE = window.THREE;
  var canvas = document.getElementById('bg3d');
  if (!THREE || !canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (err) {
    canvas.parentNode.removeChild(canvas);
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  camera.lookAt(0, 0, 0);

  var key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 8);
  var fill = new THREE.DirectionalLight(0x4dff88, 0.4);
  fill.position.set(-6, -4, 2);
  scene.add(key, fill, new THREE.AmbientLight(0x22352a, 0.5));

  var group = new THREE.Group();

  var knotGeo = new THREE.TorusKnotGeometry(2.0, 0.62, 200, 28);

  var solid = new THREE.Mesh(
    knotGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0x0e2417,
      roughness: 0.28,
      metalness: 0.45,
      emissive: 0x0f3d22,
      emissiveIntensity: 0.55,
      flatShading: true
    })
  );

  var wire = new THREE.Mesh(
    knotGeo,
    new THREE.MeshBasicMaterial({
      color: 0x4dff88,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    })
  );
  wire.scale.setScalar(1.015);

  group.add(solid, wire);

  var satGeo = new THREE.IcosahedronGeometry(0.2, 0);
  var satMat = new THREE.MeshStandardMaterial({
    color: 0x8dff4d,
    emissive: 0x3f7a22,
    emissiveIntensity: 0.4,
    roughness: 0.4
  });
  var sats = [];
  for (var i = 0; i < 6; i++) {
    var m = new THREE.Mesh(satGeo, satMat);
    var a = (i / 6) * Math.PI * 2;
    var r = 2.9 + (i % 2) * 0.45;
    m.position.set(Math.cos(a) * r, Math.sin(i) * 0.8, Math.sin(a) * r * 0.6);
    group.add(m);
    sats.push(m);
  }

  scene.add(group);

  function layout() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    group.position.x = w >= 900 ? 3.6 : 1.7;
    group.scale.setScalar(w >= 900 ? 1 : 0.6);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  var targetY = 0;
  var targetRot = 0;

  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    targetY = Math.sin(p * Math.PI * 2.5) * (reduce ? 1.4 : 2.3);
    targetRot = p * Math.PI * 2;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { layout(); onScroll(); });

  layout();
  onScroll();

  var cur = { y: targetY, rot: targetRot };
  var clock = new THREE.Clock();

  renderer.setAnimationLoop(function () {
    var dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) return;

    var k = Math.min(1, dt * 4);
    cur.y += (targetY - cur.y) * k;
    cur.rot += (targetRot - cur.rot) * k;

    group.position.y = cur.y + (reduce ? 0 : Math.sin(clock.elapsedTime * 0.5) * 0.3);
    if (!reduce) {
      group.rotation.x += dt * 0.15;
      group.rotation.y += dt * 0.2;
    }
    group.rotation.z = cur.rot;
    for (var j = 0; j < sats.length; j++) sats[j].rotation.z += dt * 0.4;

    renderer.render(scene, camera);
  });
})();