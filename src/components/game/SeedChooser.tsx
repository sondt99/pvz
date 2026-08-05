"use client";

import type { SeedPacketSlot } from "@/engine/types";
import { PlantPreviewCanvas } from "./PlantPreviewCanvas";

export interface AvailablePlant extends SeedPacketSlot {
  displayName?: string;
}

interface SeedChooserProps {
  levelName: string;
  briefingText: string | null;
  seedSlots: number;
  availablePlants: AvailablePlant[];
  selectedPlantTypes: string[];
  onToggle: (plantType: string) => void;
  onStart: () => void;
  onBackHref?: string;
  starting?: boolean;
  lockSelection?: boolean;
  modeLabel?: string;
}

export function SeedChooser({
  levelName,
  briefingText,
  seedSlots,
  availablePlants,
  selectedPlantTypes,
  onToggle,
  onStart,
  onBackHref = "/",
  starting = false,
  lockSelection = false,
  modeLabel = "CHOOSE YOUR SEEDS",
}: SeedChooserProps) {
  const selected = new Set(selectedPlantTypes);
  const full = selectedPlantTypes.length >= seedSlots;
  const canStart =
    !starting && (selectedPlantTypes.length > 0 || modeLabel.includes("CONVEYOR"));

  return (
    <div className="pvz-panel pvz-chooser">
      <div className="pvz-chooser__header">
        <div>
          <div className="pvz-chooser__mode">{modeLabel}</div>
          <h2 className="pvz-chooser__title">{levelName}</h2>
        </div>
        {!lockSelection && (
          <div className="pvz-chooser__slots">
            {selectedPlantTypes.length} / {seedSlots}
          </div>
        )}
      </div>

      {briefingText && <p className="pvz-chooser__briefing">{briefingText}</p>}

      <div style={{ marginBottom: 14 }}>
        <div className="pvz-chooser__section-label">Your loadout</div>
        <div className="pvz-chooser__grid">
          {Array.from({ length: Math.max(seedSlots, selectedPlantTypes.length || 1) }, (_, i) => {
            const plantType = selectedPlantTypes[i];
            const plant = plantType
              ? availablePlants.find((p) => p.plantType === plantType)
              : null;
            const empty = !plant;
            return (
              <button
                key={`slot-${i}`}
                type="button"
                className={
                  empty
                    ? "pvz-chooser-card pvz-chooser-card--empty"
                    : "pvz-chooser-card pvz-chooser-card--on"
                }
                onClick={() => !lockSelection && plantType && onToggle(plantType)}
                title={
                  lockSelection
                    ? plantType ?? "Fixed loadout"
                    : plantType
                      ? "Click to remove"
                      : "Empty slot"
                }
                style={{ cursor: plant && !lockSelection ? "pointer" : "default" }}
              >
                {plant ? (
                  <>
                    <PlantPreviewCanvas plantType={plant.plantType} size={48} />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "#e0ffe0",
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      {(plant.displayName ?? plant.plantType).replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 10, color: "#ffd700", fontWeight: 800 }}>
                      ☀ {plant.sunCost}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 22, opacity: 0.35 }}>+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!lockSelection && (
        <div style={{ marginBottom: 18 }}>
          <div className="pvz-chooser__section-label">
            Available plants
            {availablePlants.length <= seedSlots && (
              <span style={{ marginLeft: 8, opacity: 0.85, fontWeight: 600, textTransform: "none" }}>
                (all pre-selected)
              </span>
            )}
          </div>
          <div
            className="pvz-chooser__grid"
            style={{ maxHeight: 230, overflowY: "auto", padding: 2 }}
          >
            {availablePlants.map((plant) => {
              const isOn = selected.has(plant.plantType);
              const blocked = !isOn && full;
              return (
                <button
                  key={plant.plantType}
                  type="button"
                  className={isOn ? "pvz-chooser-card pvz-chooser-card--on" : "pvz-chooser-card"}
                  disabled={blocked}
                  onClick={() => onToggle(plant.plantType)}
                >
                  <PlantPreviewCanvas plantType={plant.plantType} size={48} />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "#e0ffe0",
                      textAlign: "center",
                      lineHeight: 1.1,
                    }}
                  >
                    {(plant.displayName ?? plant.plantType).replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 10, color: "#ffd700", fontWeight: 800 }}>
                    ☀ {plant.sunCost}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {lockSelection && (
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.9rem",
            color: "#adffa0",
            opacity: 0.92,
            fontWeight: 600,
          }}
        >
          Fixed loadout for this level — press Let&apos;s Rock when ready.
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <a href={onBackHref} className="pvz-btn pvz-btn--ghost">
          ← Back
        </a>
        <button
          type="button"
          className="pvz-btn pvz-btn--gold pvz-btn--lg"
          disabled={!canStart}
          onClick={onStart}
          style={
            !canStart
              ? {
                  background: "#2a3a20",
                  color: "#6a7a5a",
                  borderColor: "#3a4a30",
                  boxShadow: "none",
                }
              : undefined
          }
        >
          {starting ? "Starting…" : "Let's Rock!"}
        </button>
      </div>
    </div>
  );
}
