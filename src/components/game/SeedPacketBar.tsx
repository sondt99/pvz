"use client";

import { useGameStore } from "@/store/game-store";
import type { SeedPacketSlot } from "@/engine/types";

const PLANT_EMOJI: Record<string, string> = {
  PEASHOOTER: "🫛",
  SUNFLOWER: "🌻",
  WALL_NUT: "🥜",
  SNOW_PEA: "❄️",
  CHERRY_BOMB: "🍒",
  POTATO_MINE: "🥔",
  REPEATER: "🟢",
  PUFF_SHROOM: "🍄",
  SUN_SHROOM: "☀️",
  FUME_SHROOM: "💨",
  SCAREDY_SHROOM: "🍄",
  ICE_SHROOM: "❄️",
  DOOM_SHROOM: "💀",
  LILY_PAD: "🪷",
  TANGLE_KELP: "〰",
  SEA_SHROOM: "🍄",
  PLANTERN: "✦",
  BLOVER: "◌",
  SPLIT_PEA: "↔",
  SPIKEWEED: "🌵",
  TORCHWOOD: "🔥",
  TALL_NUT: "🥜",
  FLOWER_POT: "▱",
  CABBAGE_PULT: "🥬",
  KERNEL_PULT: "🌽",
  MELON_PULT: "🍈",
};

const PLANT_BG: Record<string, string> = {
  PEASHOOTER: "#1a5c2a",
  SUNFLOWER: "#7a5c00",
  WALL_NUT: "#5c3a00",
  SNOW_PEA: "#004c5c",
  CHERRY_BOMB: "#5c0000",
  POTATO_MINE: "#4a3c1a",
  PUFF_SHROOM: "#3b245c",
  SUN_SHROOM: "#5c4b14",
  FUME_SHROOM: "#334b25",
  SCAREDY_SHROOM: "#3f315f",
  ICE_SHROOM: "#1f4f64",
  DOOM_SHROOM: "#2e2536",
  LILY_PAD: "#15593d",
  PLANTERN: "#5b5420",
  FLOWER_POT: "#704029",
  CABBAGE_PULT: "#355d24",
  KERNEL_PULT: "#5d4b1d",
  MELON_PULT: "#245d36",
  default: "#1a3a1a",
};

function formatCooldown(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  return secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${secs}s`;
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
    slot.cooldownTotalMs > 0
      ? slot.cooldownRemainingMs / slot.cooldownTotalMs
      : 0;

  const bg = PLANT_BG[slot.plantType] ?? PLANT_BG.default;

  return (
    <button
      onClick={() => !isDisabled && onSelect(slot.slotIndex)}
      style={{
        position: "relative",
        width: 72,
        height: 88,
        background: isSelected ? "#6aad2a" : bg,
        border: isSelected ? "3px solid #ffd700" : "2px solid #2a4a1a",
        borderRadius: 8,
        cursor: isDisabled ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 4px 4px",
        opacity: isDisabled && !isSelected ? 0.55 : 1,
        transition: "border-color 0.1s, background 0.1s",
        overflow: "hidden",
        flexShrink: 0,
      }}
      disabled={isDisabled}
      title={`${slot.plantType} — ${slot.sunCost} ☀`}
    >
      {/* Plant icon */}
      <span style={{ fontSize: 26, lineHeight: 1 }}>
        {PLANT_EMOJI[slot.plantType] ?? "🌿"}
      </span>

      {/* Plant name (short) */}
      <span
        style={{
          color: "#e0ffe0",
          fontSize: 8,
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: 0.3,
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {slot.plantType.replace(/_/g, " ")}
      </span>

      {/* Sun cost */}
      <span
        style={{
          background: isAffordable ? "#ffd700" : "#884400",
          color: isAffordable ? "#4a2a00" : "#ffcc88",
          borderRadius: 4,
          padding: "1px 5px",
          fontSize: 10,
          fontWeight: "bold",
        }}
      >
        ☀ {slot.sunCost}
      </span>

      {/* Cooldown overlay */}
      {isCooling && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: `${cooldownFraction * 100}%`,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>
            {formatCooldown(slot.cooldownRemainingMs)}
          </span>
        </div>
      )}
    </button>
  );
}

export function SeedPacketBar() {
  const loadout = useGameStore((s) => s.loadout);
  const currentSun = useGameStore((s) => s.currentSun);
  const selectedSlot = useGameStore((s) => s.selectedSlot);

  function handleSelect(index: number) {
    // Toggle off if already selected
    const newSlot = selectedSlot === index ? null : index;
    useGameStore.getState().selectSlot(newSlot);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 8,
        padding: "10px 16px",
        background: "linear-gradient(to bottom, #1a3a0a, #0d2205)",
        borderTop: "3px solid #2a5a0a",
        overflowX: "auto",
        alignItems: "center",
        minHeight: 108,
      }}
    >
      {loadout.map((slot) => (
        <SlotCard
          key={slot.slotIndex}
          slot={{ ...slot, isSelected: slot.slotIndex === selectedSlot }}
          currentSun={currentSun}
          onSelect={handleSelect}
        />
      ))}
      {loadout.length === 0 && (
        <p style={{ color: "#4a7a4a", fontSize: 14, margin: 0 }}>
          No seed packets loaded.
        </p>
      )}
    </div>
  );
}
