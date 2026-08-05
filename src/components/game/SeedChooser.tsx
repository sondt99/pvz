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
  /** Fixed loadout / special mode — plants are not toggleable. */
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
  // Conveyor may start with 0 selected (belt fills in-game).
  const canStart =
    !starting && (selectedPlantTypes.length > 0 || modeLabel.includes("CONVEYOR"));

  return (
    <div
      style={{
        width: "min(960px, 100%)",
        background: "linear-gradient(180deg, #1a3a12 0%, #0d2208 100%)",
        border: "3px solid #3d7a28",
        borderRadius: 16,
        padding: "20px 22px 24px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        color: "#e8ffd8",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700, letterSpacing: 0.6 }}>{modeLabel}</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 26, color: "#ffe56a" }}>{levelName}</h2>
        </div>
        {!lockSelection && (
          <div style={{ fontSize: 14, fontWeight: 800, color: full ? "#ffd700" : "#adffa0" }}>
            {selectedPlantTypes.length} / {seedSlots} slots
          </div>
        )}
      </div>

      {briefingText && (
        <p
          style={{
            margin: "0 0 16px",
            padding: "10px 12px",
            background: "rgba(0,0,0,0.25)",
            borderRadius: 8,
            borderLeft: "4px solid #7cba4a",
            fontSize: 14,
            lineHeight: 1.45,
            color: "#d7f5b6",
          }}
        >
          {briefingText}
        </p>
      )}

      {/* Selected loadout slots */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75, marginBottom: 8 }}>YOUR LOADOUT</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: seedSlots }, (_, i) => {
            const plantType = selectedPlantTypes[i];
            const plant = plantType
              ? availablePlants.find((p) => p.plantType === plantType)
              : null;
            return (
              <button
                key={`slot-${i}`}
                type="button"
                onClick={() => !lockSelection && plantType && onToggle(plantType)}
                title={
                  lockSelection
                    ? plantType ?? "Fixed loadout"
                    : plantType
                      ? "Click to remove"
                      : "Empty slot"
                }
                style={{
                  width: 76,
                  height: 96,
                  borderRadius: 10,
                  border: plant
                    ? "2px solid #ffd700"
                    : "2px dashed rgba(173,255,160,0.35)",
                  background: plant ? "rgba(42,90,20,0.9)" : "rgba(0,0,0,0.25)",
                  cursor: plant && !lockSelection ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  padding: 4,
                }}
              >
                {plant ? (
                  <>
                    <PlantPreviewCanvas plantType={plant.plantType} size={48} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#e0ffe0", textAlign: "center" }}>
                      {(plant.displayName ?? plant.plantType).replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 10, color: "#ffd700", fontWeight: 700 }}>☀ {plant.sunCost}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 22, opacity: 0.35 }}>+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Available plants bank — hidden when loadout is fixed */}
      {!lockSelection && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75, marginBottom: 8 }}>
            AVAILABLE PLANTS
            {availablePlants.length <= seedSlots && (
              <span style={{ marginLeft: 8, opacity: 0.8, fontWeight: 600 }}>
                (all pre-selected — early level)
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              maxHeight: 220,
              overflowY: "auto",
              padding: 4,
            }}
          >
            {availablePlants.map((plant) => {
              const isOn = selected.has(plant.plantType);
              const blocked = !isOn && full;
              return (
                <button
                  key={plant.plantType}
                  type="button"
                  disabled={blocked}
                  onClick={() => onToggle(plant.plantType)}
                  style={{
                    width: 80,
                    height: 100,
                    borderRadius: 10,
                    border: isOn ? "3px solid #ffd700" : "2px solid #2a5a1a",
                    background: isOn
                      ? "linear-gradient(180deg,#4a8a28,#2a5a12)"
                      : blocked
                        ? "rgba(20,30,15,0.5)"
                        : "linear-gradient(180deg,#2a4a18,#1a3010)",
                    opacity: blocked ? 0.45 : 1,
                    cursor: blocked ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: 4,
                  }}
                >
                  <PlantPreviewCanvas plantType={plant.plantType} size={48} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#e0ffe0", textAlign: "center", lineHeight: 1.1 }}>
                    {(plant.displayName ?? plant.plantType).replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 10, color: "#ffd700", fontWeight: 700 }}>☀ {plant.sunCost}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {lockSelection && (
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#adffa0", opacity: 0.9 }}>
          Fixed loadout for this level — press Let&apos;s Rock when ready.
        </p>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
        <a
          href={onBackHref}
          style={{
            color: "#8ab870",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            padding: "10px 14px",
          }}
        >
          ← Back
        </a>
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          style={{
            background: canStart
              ? "linear-gradient(180deg,#6bc23a,#3d8a1e)"
              : "#2a3a20",
            color: canStart ? "#0a1a05" : "#6a7a5a",
            border: canStart ? "2px solid #a8f060" : "2px solid #3a4a30",
            borderRadius: 10,
            padding: "12px 28px",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 0.5,
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 4px 18px rgba(80,160,40,0.45)" : "none",
          }}
        >
          {starting ? "Starting…" : "Let's Rock!"}
        </button>
      </div>
    </div>
  );
}
