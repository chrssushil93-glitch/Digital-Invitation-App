"use client";
import { useEffect, useRef, useState } from "react";

type Phase = "loading" | "closed" | "opening" | "revealed" | "done" | "skip";

const DOOR_YAW = Math.PI / 2;
const MODEL_URL = "/models/old-wooden-door/scene.gltf";
const GATE_URL = "/models/gate/reja.glb";
export type Opener = "wood" | "gate";

/**
 * Shows a 3D wooden door. A tap (or a short wait) plays the model's opening
 * animation, the camera moves through the doorway, and the invitation is
 * revealed. Without WebGL, or when the visitor prefers reduced motion, the
 * invitation is shown straight away.
 */
export default function DoorReveal({
  children,
  hint,
  replayLabel,
  autoOpenMs = 3500,
  opener = "wood",
}: {
  children: React.ReactNode;
  hint: string;
  replayLabel?: string;
  autoOpenMs?: number;
  opener?: Opener;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [runKey, setRunKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("skip");
      return;
    }
    setPhase("loading");
    const isGate = opener === "gate";
    let disposed = false;
    let teardown = () => {};
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    (async () => {
      try {
        const THREE = await import("three");
        const [{ GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/environments/RoomEnvironment.js"),
        ]);
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        if (disposed || !canvas || !stage) return;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
        scene.environment = envTarget.texture;
        scene.add(new THREE.AmbientLight(0xffffff, 0.25));
        const key = new THREE.DirectionalLight(0xffe2b8, 2.4);
        key.position.set(2.5, 3.5, 5);
        scene.add(key);

        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
        let baseZ = 8;
        let modelW = 1.6;
        let modelH = 2;
        let dollyStart = 0;

        const fit = () => {
          const w = Math.max(1, stage.clientWidth);
          const h = Math.max(1, stage.clientHeight);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          const t = Math.tan((camera.fov * Math.PI) / 360);
          const mg = opener === "gate" ? 0.53 : 0.56;
          baseZ = Math.max((modelH * mg) / t, (modelW * mg) / (t * camera.aspect));
          if (!dollyStart) camera.position.set(0, 0, baseZ);
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(fit);
        ro.observe(stage);

        // Warm light behind the doors, seen through the doorway once they open.
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = glowCanvas.height = 256;
        const gctx = glowCanvas.getContext("2d");
        if (gctx) {
          const grd = gctx.createRadialGradient(128, 128, 8, 128, 128, 128);
          grd.addColorStop(0, "rgba(255,232,170,1)");
          grd.addColorStop(0.55, "rgba(255,190,100,0.6)");
          grd.addColorStop(1, "rgba(255,170,80,0)");
          gctx.fillStyle = grd;
          gctx.fillRect(0, 0, 256, 256);
        }
        const glowTex = new THREE.CanvasTexture(glowCanvas);
        glowTex.colorSpace = THREE.SRGBColorSpace;
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(3, 3.6),
          new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false })
        );
        scene.add(glow);

        let torn = false;
        teardown = () => {
          if (torn) return;
          torn = true;
          renderer.setAnimationLoop(null);
          ro.disconnect();
          scene.traverse((o) => {
            const m = o as import("three").Mesh;
            if (m.geometry) m.geometry.dispose();
            const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
            mats.forEach((mat) => {
              Object.values(mat).forEach((v) => {
                if (v instanceof THREE.Texture) v.dispose();
              });
              mat.dispose();
            });
          });
          envTarget.dispose();
          pmrem.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
        };

        const loader = new GLTFLoader();
        const gltf = await Promise.race([
          loader.loadAsync(isGate ? GATE_URL : MODEL_URL),
          new Promise<never>((_, reject) => later(() => reject(new Error("door model timed out")), 15000)),
        ]);
        if (disposed) {
          teardown();
          return;
        }

        const model = gltf.scene;
        // Pose the skinned leaves first, so the bounds describe what is actually drawn.
        const mixer = new THREE.AnimationMixer(model);
        const clip = isGate ? undefined : gltf.animations[0];
        const action = clip ? mixer.clipAction(clip) : null;
        if (action) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          action.paused = true;
          mixer.update(0);
        }
        model.updateMatrixWorld(true);
        model.traverse((o) => { const sk = o as import("three").SkinnedMesh; if (sk.isSkinnedMesh) { sk.skeleton.update(); sk.computeBoundingBox(); } });
        const box = new THREE.Box3().setFromObject(model, true);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.info("door bounds", size.toArray(), center.toArray());
        model.position.sub(center);
        const pivot = new THREE.Group();
        pivot.add(model);
        const s = 2 / size.y;
        pivot.scale.setScalar(s);
        pivot.rotation.y = isGate ? 0 : DOOR_YAW; // the door is authored facing sideways
        scene.add(pivot);
        modelW = (isGate ? size.x : size.z) * s;
        modelH = 2;
        if (isGate) { glow.scale.setScalar(0.8); (glow.material as import("three").MeshBasicMaterial).opacity = 0.7; }
        glow.position.z = isGate ? -1 : -(size.x * s) / 2 - 0.05;

        // Gate: the two side leaves swing on hinges, then the whole gate fades as the camera moves in.
        const leaves: { hinge: import("three").Group; dir: number }[] = [];
        const gateMats: import("three").Material[] = [];
        if (isGate) {
          model.updateMatrixWorld(true);
          ["puerta", "puerta.001"].forEach((name) => {
            const leaf = model.getObjectByName(name);
            if (!leaf) return;
            const hinge = new THREE.Group();
            const wp = leaf.getWorldPosition(new THREE.Vector3());
            model.worldToLocal(wp);
            hinge.position.copy(wp);
            model.add(hinge);
            hinge.attach(leaf);
            leaves.push({ hinge, dir: wp.x > 0 ? -1 : 1 });
          });
          model.traverse((o) => {
            const m = o as import("three").Mesh;
            if (!m.isMesh) return;
            (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
              gateMats.push(mat);
            });
          });
        }
        let gateT0 = 0;
        fit();

        let opened = false;
        const startDolly = () => {
          if (!dollyStart) dollyStart = performance.now();
        };
        mixer.addEventListener("finished", startDolly);
        const open = () => {
          window.dispatchEvent(new Event("nm-open"));
          if (opened || disposed) return;
          opened = true;
          setPhase("opening");
          if (action) action.paused = false;
          if (isGate) {
            gateT0 = performance.now();
            later(startDolly, 2000);
          } else {
            later(startDolly, 6000); // safety net if the animation never reports it has finished
            if (!action) startDolly();
          }
        };
        openRef.current = open;

        const clock = new THREE.Clock();
        const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        let revealed = false;
        renderer.setAnimationLoop(() => {
          mixer.update(Math.min(clock.getDelta(), 0.05));
          if (isGate && gateT0) {
            const a = ease(Math.min(1, (performance.now() - gateT0) / 1900));
            leaves.forEach((l) => (l.hinge.rotation.y = l.dir * a * 1.75));
          }
          if (dollyStart) {
            const t = Math.min(1, (performance.now() - dollyStart) / 1400);
            camera.position.z = baseZ * (1 - 0.5 * ease(t));
            if (isGate) gateMats.forEach((m) => (m.transparent = true, m.opacity = 1 - ease(Math.min(1, t * 1.4))));
            if (t > 0.35 && !revealed) {
              revealed = true;
              setPhase("revealed");
              later(() => {
                setPhase("done");
                teardown();
              }, 1200);
            }
          }
          renderer.render(scene, camera);
        });

        renderer.render(scene, camera);
        setPhase("closed");
        later(open, autoOpenMs);
      } catch {
        if (!disposed) setPhase("skip");
      }
    })();

    return () => {
      disposed = true;
      timers.forEach((t) => window.clearTimeout(t));
      teardown();
    };
  }, [runKey, autoOpenMs, opener]);

  return (
    <>
      <div className="doorwrap" data-phase={phase}>
        <div
          className="doorstage"
          ref={stageRef}
          role="button"
          tabIndex={phase === "closed" ? 0 : -1}
          aria-label={hint}
          onClick={() => openRef.current()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openRef.current();
            }
          }}
        >
          <canvas key={runKey} ref={canvasRef} aria-hidden="true" />
          {phase === "closed" && <span className="doorhint">{hint}</span>}
          {phase === "loading" && <span className="doorspin" aria-hidden="true" />}
        </div>
        <div className="doorcard">{children}</div>
      </div>
      {phase === "done" && replayLabel && (
        <button
          className="btn ghost small"
          type="button"
          style={{ margin: "1rem auto 0", display: "flex" }}
          onClick={() => setRunKey((k) => k + 1)}
        >
          {replayLabel}
        </button>
      )}
      <noscript>
        <style>{`.doorcard{display:block!important}.doorstage{display:none!important}`}</style>
      </noscript>
    </>
  );
}
