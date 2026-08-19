"use client";

import type { CurveSnapshot } from "./types";

export interface MembraneViewProps {
  snapshot: CurveSnapshot;
  playing: boolean;
}

const EXTRACELLULAR_SODIUM_PARTICLES = ["8%", "22%", "38%", "61%", "76%", "91%"];
const INTRACELLULAR_SODIUM_PARTICLES = ["41%", "76%"];
const EXTRACELLULAR_POTASSIUM_PARTICLES = ["48%", "84%"];
const INTRACELLULAR_POTASSIUM_PARTICLES = ["13%", "31%", "52%", "70%", "87%"];
const FLOW_DOTS = ["0s", "-0.38s", "-0.76s"];

export function MembraneView({ snapshot, playing }: MembraneViewProps) {
  const sodiumFlow = snapshot.ionFlow === "sodium-in";
  const potassiumFlow = snapshot.ionFlow === "potassium-out";
  const insidePositive = snapshot.insidePolarity === "positive";

  return (
    <section className="membrane-view-card" aria-label="膜两侧离子运动">
      <header>
        <div>
          <span>离子通道</span>
          <small>开放的通道会高亮</small>
        </div>
        <strong>{snapshot.sodiumOpen ? "Na⁺ 通道开放" : snapshot.potassiumOpen ? "K⁺ 通道开放" : "通道处于关闭状态"}</strong>
      </header>

      <div
        className={`membrane-scene ${playing ? "is-playing" : ""}`}
        data-flow={snapshot.ionFlow}
      >
        <div className="membrane-compartment membrane-extracellular">
          <span className="membrane-compartment-label">膜外 <b>{insidePositive ? "−" : "+"}</b></span>
          {EXTRACELLULAR_SODIUM_PARTICLES.map((left, index) => (
            <i
              key={`na-out-${left}`}
              className="membrane-particle sodium"
              data-compartment="outside"
              style={{
                left,
                top: `${34 + (index % 3) * 16}%`,
                animationDelay: `${-0.67 * index}s`,
                animationDuration: `${2.8 + (index % 3) * 0.55}s`,
              }}
              aria-hidden="true"
            >
              Na⁺
            </i>
          ))}
          {EXTRACELLULAR_POTASSIUM_PARTICLES.map((left, index) => (
            <i
              key={`k-out-${left}`}
              className="membrane-particle potassium"
              data-compartment="outside"
              style={{
                left,
                top: `${24 + index * 48}%`,
                animationDelay: `${-1.15 * index - 0.55}s`,
                animationDuration: `${3.25 + index * 0.6}s`,
              }}
              aria-hidden="true"
            >
              K⁺
            </i>
          ))}
        </div>

        <div className="membrane-bilayer" aria-label="细胞膜">
          <div
            className={`membrane-channel sodium ${snapshot.sodiumOpen ? "is-open" : ""}`}
            aria-label="Na⁺ 通道"
            data-open={String(snapshot.sodiumOpen)}
          >
            <span
              className="membrane-channel-art"
              data-protein="sodium"
              aria-hidden="true"
            />
            <b>Na⁺</b>
            <small>{snapshot.sodiumOpen ? "开" : "关"}</small>
          </div>
          <div className="membrane-lipid-field" aria-hidden="true">
            {Array.from({ length: 17 }, (_, index) => <i key={index} />)}
          </div>
          <div
            className={`membrane-channel potassium ${snapshot.potassiumOpen ? "is-open" : ""}`}
            aria-label="K⁺ 通道"
            data-open={String(snapshot.potassiumOpen)}
          >
            <span
              className="membrane-channel-art"
              data-protein="potassium"
              aria-hidden="true"
            />
            <b>K⁺</b>
            <small>{snapshot.potassiumOpen ? "开" : "关"}</small>
          </div>
        </div>

        <div className="membrane-compartment membrane-intracellular">
          <span className="membrane-compartment-label">膜内 <b>{insidePositive ? "+" : "−"}</b></span>
          {INTRACELLULAR_POTASSIUM_PARTICLES.map((left, index) => (
            <i
              key={`k-in-${left}`}
              className="membrane-particle potassium"
              data-compartment="inside"
              style={{
                left,
                top: `${34 + ((index + 1) % 3) * 16}%`,
                animationDelay: `${-0.83 * index - 0.4}s`,
                animationDuration: `${3 + (index % 3) * 0.5}s`,
              }}
              aria-hidden="true"
            >
              K⁺
            </i>
          ))}
          {INTRACELLULAR_SODIUM_PARTICLES.map((left, index) => (
            <i
              key={`na-in-${left}`}
              className="membrane-particle sodium"
              data-compartment="inside"
              style={{
                left,
                top: `${24 + index * 52}%`,
                animationDelay: `${-1.05 * index - 0.7}s`,
                animationDuration: `${3.1 + index * 0.65}s`,
              }}
              aria-hidden="true"
            >
              Na⁺
            </i>
          ))}
        </div>

        {sodiumFlow && (
          <div
            className="membrane-flow-track sodium is-active"
            aria-label="Na⁺ 内流路径"
            data-direction="down"
          >
            <strong>Na⁺ 内流</strong>
            <span className="membrane-flow-arrow" aria-hidden="true">↓</span>
            {FLOW_DOTS.map((delay) => (
              <i
                key={delay}
                className="membrane-flow-dot"
                style={{ animationDelay: delay }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
        {potassiumFlow && (
          <div
            className="membrane-flow-track potassium is-active"
            aria-label="K⁺ 外流路径"
            data-direction="up"
          >
            <strong>K⁺ 外流</strong>
            <span className="membrane-flow-arrow" aria-hidden="true">↑</span>
            {FLOW_DOTS.map((delay) => (
              <i
                key={delay}
                className="membrane-flow-dot"
                style={{ animationDelay: delay }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

      <div className="membrane-polarity-bar">
        <span>膜外{insidePositive ? "相对为负" : "相对为正"}</span>
        <i aria-hidden="true" />
        <span>膜内{insidePositive ? "相对为正" : "相对为负"}</span>
      </div>
    </section>
  );
}
