import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "3rem", color: "#4ade80", textAlign: "center" }}>
        Plants vs. Zombies
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "1.1rem", textAlign: "center" }}>
        5 environments · 38 plants · 31 zombies · fully pausable
      </p>
      <Link
        href="/game"
        style={{
          background: "#16a34a",
          color: "#fff",
          padding: "0.8rem 2.5rem",
          borderRadius: "0.5rem",
          textDecoration: "none",
          fontSize: "1.25rem",
          fontWeight: 600,
        }}
      >
        Play Now
      </Link>
    </main>
  );
}
