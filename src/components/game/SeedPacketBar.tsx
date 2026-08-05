"use client";

import { useGameStore } from "@/store/game-store";
import type { SeedPacketSlot } from "@/engine/types";
import { PlantPreviewCanvas } from "./PlantPreviewCanvas";

const PLANT_BG: Record<string, string> = {
  PEASHOOTER: "linear-gradient(180deg,#2a7a3a,#1a4c22)",
  SUNFLOWER: "linear-gradient(180deg,#9a7a18,#6a5010)",
  WALL_NUT: "linear-gradient(180deg,#7a5a28,#4a3414)",
  EXPLODE_O_NUT: "linear-gradient(180deg,#a04030,#601810)",
  PUMPKIN: "linear-gradient(180deg,#a05020,#602810)",
  SNOW_PEA: "linear-gradient(180deg,#2080a0,#104858)",
  CHERRY_BOMB: "linear-gradient(180deg,#8a2020,#4a1010)",
  POTATO_MINE: "linear-gradient(180deg,#6a5a30,#3a3018)",
  PUFF_SHROOM: "linear-gradient(180deg,#5a3a7a,#301848)",
  SUN_SHROOM: "linear-gradient(180deg,#8a7018,#4a3c10)",
  FUME_SHROOM: "linear-gradient(180deg,#4a6830,#283818)",
  SCAREDY_SHROOM: "linear-gradient(180deg,#5a4878,#302848)",
  ICE_SHROOM: "linear-gradient(180deg,#307090,#184050)",
  DOOM_SHROOM: "linear-gradient(180deg,#4a3850,#241828)",
  LILY_PAD: "linear-gradient(180deg,#208050,#104028)",
  PLANTERN: "linear-gradient(180deg,#7a7028,#403818)",
  FLOWER_POT: "linear-gradient(180deg,#8a5030,#502818)",
  CABBAGE_PULT: "linear-gradient(180deg,#4a7830,#284018)",
  KERNEL_PULT: "linear-gradient(180deg,#7a6828,#403818)",
  STARFRUIT: "linear-gradient(180deg,#8a7828,#484018)",
  GARLIC: "linear-gradient(180deg,#5a5030,#302818)",
  MELON_PULT: "linear-gradient(180deg,#308048,#184028)",
  CHOMPER: "linear-gradient(180deg,#4a6830,#283818)",
  REPEATER: "linear-gradient(180deg,#2a7a3a,#1a4c22)",
  default: "linear-gradient(180deg,#2a4a22,#1a3018)",
};

function formatCooldown(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  return secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${secs}s`;
}

function shortName(plantType: string): string {
  return plantType.replace(/_/g, " ");
}

interface SlotCardProps {
  slot: SeedPacketSlot;
  currentSun: number;
  onSelect: (index: number) => void;
}

function SlotCard({ slot, currentSun, onSelect }: SlotCardProps) {
  const isCooling = slot.cooldownRemainingMs > 0;
  const isAffordable = currentSun >= slot.sunCost;
  const isDisabled = isCooling || !isAffordable;
  const isSelected = slot.isSelected;

  const cooldownFraction =
    slot.cooldownTotalMs > 0 ? slot.cooldownRemainingMs / slot.cooldownTotalMs : 0;

  const bg = PLANT_BG[slot.plantType] ?? PLANT_BG.default;

  return (
    <button
      type="button"
      className={isSelected ? "pvz-seed-packet pvz-seed-packet--selected" : "pvz-seed-packet"}
      onClick={() => !isDisabled && onSelect(slot.slotIndex)}
      style={{
        background: bg,
        opacity: isDisabled && !isSelected ? 0.55 : 1,
      }}
      disabled={isDisabled}
      title={`${shortName(slot.plantType)} — ${slot.sunCost} sun`}
    >
      <PlantPreviewCanvas plantType={slot.plantType} size={52} />
      <span className="pvz-seed-packet__name">{shortName(slot.plantType)}</span>
      <span
        className={
          isAffordable
            ? "pvz-seed-packet__cost pvz-seed-packet__cost--ok"
            : "pvz-seed-packet__cost pvz-seed-packet__cost--no"
        }
      >
        ☀ {slot.sunCost}
      </span>

      {isCooling && (
        <div className="pvz-seed-packet__cd" style={{ height: `${cooldownFraction * 100}%` }}>
          {formatCooldown(slot.cooldownRemainingMs)}
        </div>
      )}
    </button>
  );
}

interface SeedPacketBarProps {
  shovelSelected?: boolean;
  onShovelToggle?: () => void;
  showShovel?: boolean;
}

export function SeedPacketBar({
  shovelSelected = false,
  onShovelToggle,
  showShovel = true,
}: SeedPacketBarProps = {}) {
  const loadout = useGameStore((s) => s.loadout);
  const currentSun = useGameStore((s) => s.currentSun);
  const selectedSlot = useGameStore((s) => s.selectedSlot);
  const freePlacement = useGameStore((s) => s.levelRules.freePlacement);
  const playMode = useGameStore((s) => s.levelRules.playMode);

  function handleSelect(index: number) {
    const newSlot = selectedSlot === index ? null : index;
    useGameStore.getState().selectSlot(newSlot);
  }

  return (
    <div className="pvz-seed-bar">
      {loadout.map((slot) => (
        <SlotCard
          key={`${slot.plantType}-${slot.slotIndex}`}
          slot={{
            ...slot,
            isSelected: slot.slotIndex === selectedSlot,
            sunCost: freePlacement ? 0 : slot.sunCost,
          }}
          currentSun={freePlacement ? Number.MAX_SAFE_INTEGER : currentSun}
          onSelect={handleSelect}
        />
      ))}

      {showShovel && onShovelToggle && (
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          <div
            style={{
              width: 1,
              height: 78,
              background: "rgba(139, 90, 43, 0.55)",
              margin: "0 10px",
            }}
          />
          <button
            type="button"
            className={shovelSelected ? "pvz-shovel pvz-shovel--on" : "pvz-shovel"}
            onClick={onShovelToggle}
            title="Shovel — dig up a plant (no sun refund)"
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>⛏️</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Shovel
            </span>
          </button>
        </div>
      )}

      {loadout.length === 0 && (
        <p style={{ color: "#8a7a58", fontSize: 14, margin: 0, fontWeight: 700 }}>
          {playMode === "CONVEYOR" ? "Waiting for conveyor plants…" : "No seed packets loaded."}
        </p>
      )}
    </div>
  );
}
