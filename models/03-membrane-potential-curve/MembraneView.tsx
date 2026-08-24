"use client";

import { getIonVisualState } from "./ion-visual-state";
import type { CurveIntensity, CurveSnapshot } from "./types";

export interface MembraneViewProps {
  snapshot: CurveSnapshot;
  playing: boolean;
  time: number;
  intensity: CurveIntensity;
}

interface ParticlePosition {
  left: string;
  top: string;
}

const PARTICLE_POSITIONS = {
  sodiumOutside: [
    { left: "15%", top: "30%" },
    { left: "31%", top: "63%" },
    { left: "47%", top: "29%" },
    { left: "61%", top: "67%" },
    { left: "76%", top: "31%" },
    { left: "88%", top: "64%" },
    { left: "55%", top: "48%" },
  ],
  sodiumInside: [
    { left: "37%", top: "35%" },
    { left: "74%", top: "67%" },
    { left: "20%", top: "66%" },
    { left: "54%", top: "60%" },
    { left: "85%", top: "35%" },
  ],
  potassiumOutside: [
    { left: "43%", top: "64%" },
    { left: "82%", top: "52%" },
    { left: "24%", top: "34%" },
    { left: "65%", top: "32%" },
    { left: "91%", top: "29%" },
  ],
  potassiumInside: [
    { left: "14%", top: "36%" },
    { left: "29%", top: "68%" },
    { left: "46%", top: "38%" },
    { left: "61%", top: "69%" },
    { left: "78%", top: "37%" },
    { left: "89%", top: "65%" },
  ],
} satisfies Record<string, ParticlePosition[]>;

const CROSSING_DELAYS = ["0s", "-0.4s", "-0.8s", "-1.2s"];

function renderParticles(
  positions: ParticlePosition[],
  count: number,
  ion: "sodium" | "potassium",
  compartment: "outside" | "inside",
) {
  const label = ion === "sodium" ? "Na⁺" : "K⁺";
  return positions.slice(0, count).map((position, index) => (
    <i
      key={`${ion}-${compartment}-${index}`}
      className={`membrane-particle ${ion}`}
      data-compartment={compartment}
      style={{
        left: position.left,
        top: position.top,
        animationDelay: `${-0.61 * index}s`,
        animationDuration: `${2.9 + (index % 3) * 0.48}s`,
      }}
      aria-hidden="true"
    >
      {label}
    </i>
  ));
}

function IonStream({ ion }: { ion: "sodium" | "potassium" }) {
  const sodium = ion === "sodium";
  const label = sodium ? "Na⁺" : "K⁺";
  const movement = sodium ? "Na⁺ 内流" : "K⁺ 外流";

  return (
    <div
      className={`membrane-ion-stream ${ion}`}
      aria-label={`${movement}：离子穿过开放通道`}
      data-direction={sodium ? "in" : "out"}
    >
      <strong>{movement}</strong>
      {CROSSING_DELAYS.map((delay, index) => (
        <i
          key={delay}
          className={`membrane-particle membrane-crossing-ion ${ion}`}
          style={{ animationDelay: delay }}
          aria-hidden="true"
        >
          {label}
          <span>{index + 1}</span>
        </i>
      ))}
    </div>
  );
}

export function MembraneView({ snapshot, playing, time, intensity }: MembraneViewProps) {
  const insidePositive = snapshot.insidePolarity === "positive";
  const visual = getIonVisualState(time, intensity, snapshot);

  return (
    <section className="membrane-view-card" aria-label="膜两侧离子运动">
      <header>
        <div>
          <span>离子通道</span>
          <small>观察离子穿过开放通道</small>
        </div>
        <strong>{snapshot.sodiumOpen ? "Na⁺ 通道开放" : snapshot.potassiumOpen ? "K⁺ 通道开放" : "通道处于关闭状态"}</strong>
      </header>

      <div
        className={`membrane-scene ${playing ? "is-playing" : "is-paused"}`}
        data-flow={snapshot.ionFlow}
      >
        <div
          className={`membrane-stimulus ${visual.stimulusActive ? "is-active" : ""}`}
          data-level={visual.stimulusLevel}
          aria-label={`${visual.stimulusLevel === "weak" ? "弱" : visual.stimulusLevel === "strong" ? "强" : "阈"}刺激脉冲`}
        >
          <span>刺激</span>
          <i aria-hidden="true" />
          <b aria-hidden="true" />
        </div>

        <div className="membrane-compartment membrane-extracellular">
          <span className="membrane-compartment-label">膜外 <b>{insidePositive ? "−" : "+"}</b></span>
          {renderParticles(PARTICLE_POSITIONS.sodiumOutside, visual.sodium.outside, "sodium", "outside")}
          {renderParticles(PARTICLE_POSITIONS.potassiumOutside, visual.potassium.outside, "potassium", "outside")}
        </div>

        <div className="membrane-bilayer" aria-label="细胞膜">
          <div className={`membrane-channel sodium ${snapshot.sodiumOpen ? "is-open" : ""}`} aria-label="Na⁺ 通道" data-open={String(snapshot.sodiumOpen)}>
            <span className="membrane-channel-art" data-protein="sodium" aria-hidden="true" />
            <b>Na⁺</b>
            <small>{snapshot.sodiumOpen ? "开" : "关"}</small>
          </div>
          <div className="membrane-lipid-field" aria-hidden="true">
            {Array.from({ length: 17 }, (_, index) => <i key={index} />)}
          </div>
          <div className={`membrane-channel potassium ${snapshot.potassiumOpen ? "is-open" : ""}`} aria-label="K⁺ 通道" data-open={String(snapshot.potassiumOpen)}>
            <span className="membrane-channel-art" data-protein="potassium" aria-hidden="true" />
            <b>K⁺</b>
            <small>{snapshot.potassiumOpen ? "开" : "关"}</small>
          </div>
        </div>

        <div className="membrane-compartment membrane-intracellular">
          <span className="membrane-compartment-label">膜内 <b>{insidePositive ? "+" : "−"}</b></span>
          {renderParticles(PARTICLE_POSITIONS.potassiumInside, visual.potassium.inside, "potassium", "inside")}
          {renderParticles(PARTICLE_POSITIONS.sodiumInside, visual.sodium.inside, "sodium", "inside")}
        </div>

        {visual.sodiumCrossing && <IonStream ion="sodium" />}
        {visual.potassiumCrossing && <IonStream ion="potassium" />}
      </div>

    </section>
  );
}
