"use client";

import { useEffect, useRef } from "react";

export default function NexusGlobe({ date, onInspect, onReady, onStatus }) {
  const containerRef = useRef(null);
  const callbacksRef = useRef({ onInspect, onReady, onStatus });
  callbacksRef.current = { onInspect, onReady, onStatus };

  useEffect(() => {
    let cancelled = false;
    let controller;
    async function initialize() {
      try {
        window.CESIUM_BASE_URL = new URL("cesium/", document.baseURI).href;
        const { createNexusViewer } = await import("../../lib/earth/create-viewer.js");
        if (cancelled || !containerRef.current) return;
        controller = await createNexusViewer(containerRef.current, {
          date,
          onInspect: (point) => callbacksRef.current.onInspect(point),
          onStatus: (status) => callbacksRef.current.onStatus(status)
        });
        if (cancelled) {
          controller.destroy();
          return;
        }
        callbacksRef.current.onReady(controller);
      } catch (error) {
        callbacksRef.current.onStatus(`Globe failed to initialize · ${error.message}`);
      }
    }
    initialize();
    return () => {
      cancelled = true;
      controller?.destroy();
    };
  }, []);

  return <div ref={containerRef} className="globe" aria-label="Interactive terrain-enabled 3D Earth" />;
}
