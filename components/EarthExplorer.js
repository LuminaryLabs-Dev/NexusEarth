"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { isLatestTextureResponse } from "../lib/earth-imagery/gibs.js";

const BASE_TEXTURE_PATH = "textures/earth-base-2048.jpg";
const MAX_CACHED_DATES = 3;
const locations = [
  ["Whole Earth", 15, -25, 3.15], ["Amazon Basin", -4, -62, 2.25],
  ["California", 37, -120, 2.05], ["Greenland", 72, -40, 2.2],
  ["Sahara", 24, 13, 2.2], ["East Africa", -2, 36, 2.12],
  ["Himalayas", 29, 85, 2.05], ["Southeast Asia", 10, 106, 2.15],
  ["Australia", -25, 134, 2.25], ["Antarctica", -78, 15, 2.25]
].map(([name, lat, lon, zoom]) => ({ name, lat, lon, zoom }));

function utcDate(daysAgo = 1) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - daysAgo);
  return value.toISOString().slice(0, 10);
}

export default function EarthExplorer() {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const materialRef = useRef(null);
  const textureWorkerRef = useRef(null);
  const textureCacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const [selected, setSelected] = useState(0);
  const [date, setDate] = useState(utcDate());
  const [spinning, setSpinning] = useState(false);
  const [status, setStatus] = useState("Loading NASA observation…");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.055, enablePan: false, minDistance: 1.5, maxDistance: 5.5 });
    controlsRef.current = controls;

    const globe = new THREE.Group();
    globeRef.current = globe;
    scene.add(globe);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
    materialRef.current = material;
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), material));
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.025, 96, 64),
      new THREE.MeshBasicMaterial({ color: 0x62aef6, transparent: true, opacity: 0.12, side: THREE.BackSide, blending: THREE.AdditiveBlending })
    ));
    scene.add(new THREE.HemisphereLight(0xc5ddff, 0x07111f, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.7);
    sun.position.set(-3, 2, 4);
    scene.add(sun);

    const starGeometry = new THREE.BufferGeometry();
    const stars = new Float32Array(1800 * 3);
    for (let i = 0; i < stars.length; i += 3) {
      const radius = 8 + Math.random() * 11;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      stars[i] = radius * Math.sin(phi) * Math.cos(theta);
      stars[i + 1] = radius * Math.cos(phi);
      stars[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb7cae1, size: 0.018, transparent: true, opacity: 0.62 })));

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let frame;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      requestIdRef.current += 1;
      textureWorkerRef.current?.terminate();
      textureWorkerRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      material.map?.dispose();
      renderer.dispose();
      starGeometry.dispose();
      textureCacheRef.current.clear();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const swapTexture = useCallback((texture, message) => {
    const material = materialRef.current;
    if (!material) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    const previous = material.map;
    material.map = texture;
    material.needsUpdate = true;
    previous?.dispose();
    setStatus(message);
  }, []);

  const applyBaseFallback = useCallback((requestId) => {
    const loader = new THREE.TextureLoader();
    const baseUrl = new URL(BASE_TEXTURE_PATH, document.baseURI).href;
    loader.load(baseUrl, (texture) => {
      if (!isLatestTextureResponse(requestId, requestIdRef.current)) {
        texture.dispose();
        return;
      }
      swapTexture(texture, "Base Earth fallback");
    }, undefined, () => {
      if (isLatestTextureResponse(requestId, requestIdRef.current)) setStatus("Earth texture unavailable");
    });
  }, [swapTexture]);

  const applyTexture = useCallback((requestedDate) => {
    if (!materialRef.current) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    textureWorkerRef.current?.terminate();
    textureWorkerRef.current = null;

    const cached = textureCacheRef.current.get(requestedDate);
    if (cached) {
      const texture = new THREE.CanvasTexture(cached.canvas);
      swapTexture(texture, cached.status);
      return;
    }

    setStatus("Building NASA Earth composite…");
    let worker;
    try {
      worker = new Worker(new URL("../workers/earth-texture.worker.js", import.meta.url), { type: "module" });
    } catch {
      applyBaseFallback(requestId);
      return;
    }
    textureWorkerRef.current = worker;
    worker.onmessage = (event) => {
      const response = event.data;
      if (!isLatestTextureResponse(response.requestId, requestIdRef.current)) {
        response.bitmap?.close();
        return;
      }
      worker.terminate();
      if (textureWorkerRef.current === worker) textureWorkerRef.current = null;
      if (response.error || !response.bitmap) {
        applyBaseFallback(requestId);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = response.width;
      canvas.height = response.height;
      const context = canvas.getContext("2d");
      if (!context) {
        response.bitmap.close();
        applyBaseFallback(requestId);
        return;
      }
      context.drawImage(response.bitmap, 0, 0);
      response.bitmap.close();
      const cache = textureCacheRef.current;
      if (cache.size >= MAX_CACHED_DATES) cache.delete(cache.keys().next().value);
      cache.set(requestedDate, { canvas, status: response.status, metrics: response.metrics });
      const texture = new THREE.CanvasTexture(canvas);
      swapTexture(texture, response.status);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (!isLatestTextureResponse(requestId, requestIdRef.current)) return;
      worker.terminate();
      if (textureWorkerRef.current === worker) textureWorkerRef.current = null;
      applyBaseFallback(requestId);
    };
    worker.postMessage({
      requestId,
      date: requestedDate,
      baseTextureUrl: new URL(BASE_TEXTURE_PATH, document.baseURI).href
    });
  }, [applyBaseFallback, swapTexture]);

  useEffect(() => applyTexture(date), [date, applyTexture]);

  const travelTo = (index) => {
    const location = locations[index];
    if (!globeRef.current || !cameraRef.current) return;
    globeRef.current.rotation.x = THREE.MathUtils.degToRad(location.lat);
    globeRef.current.rotation.y = -THREE.MathUtils.degToRad(location.lon) - Math.PI / 2;
    cameraRef.current.position.set(0, 0, location.zoom);
    setSelected(index);
  };

  const toggleSpin = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.autoRotate = !spinning;
    controls.autoRotateSpeed = 0.6;
    setSpinning(!spinning);
  };

  return (
    <section className="explorer">
      <header className="masthead">
        <div><p className="eyebrow">NASA EARTH OBSERVATION</p><h1>Nexus Earth</h1></div>
        <div className="status"><span />{status}</div>
      </header>
      <div className="workspace">
        <aside className="sidebar" aria-label="Earth locations">
          <p className="section-label">Travel to</p>
          <div className="location-list">
            {locations.map((location, index) => (
              <button type="button" className={selected === index ? "location active" : "location"} key={location.name} onClick={() => travelTo(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span>{location.name}
              </button>
            ))}
          </div>
        </aside>
        <div className="globe-panel">
          <div className="globe" ref={mountRef} aria-label="Interactive 3D Earth" />
          <div className="globe-caption">Drag to rotate · Scroll to zoom</div>
          <div className="controls">
            <label>Observation date<input type="date" value={date} max={utcDate()} onChange={(event) => setDate(event.target.value)} /></label>
            <button type="button" onClick={toggleSpin} aria-pressed={spinning}>{spinning ? "Pause rotation" : "Auto rotate"}</button>
          </div>
        </div>
        <aside className="details">
          <p className="section-label">Selected region</p>
          <p className="region-index">{String(selected + 1).padStart(2, "0")}</p>
          <h2>{locations[selected].name}</h2>
          <p>Explore recent true-color imagery from NASA’s Global Imagery Browse Services.</p>
          <dl>
            <div><dt>Latitude</dt><dd>{Math.abs(locations[selected].lat)}°{locations[selected].lat >= 0 ? "N" : "S"}</dd></div>
            <div><dt>Longitude</dt><dd>{Math.abs(locations[selected].lon)}°{locations[selected].lon >= 0 ? "E" : "W"}</dd></div>
            <div><dt>Sensor</dt><dd>VIIRS NOAA-20</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
