"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  config: Record<string, string>;
  availablePlayers: Array<{ Name: string; PreferredLine?: string }>;
  latestPoints: Array<Record<string, string>>;
};

type PlayerStat = {
  playerId: string;
  name: string;
  totalPoints: number;
  totalSeconds: number;
  totalMinutes: number;
  oPoints: number;
  dPoints: number;
};

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lineType, setLineType] = useState("O");
  const [possessionType, setPossessionType] = useState("Receive");
  const [loading, setLoading] = useState(false);

  async function resetGame() {
    if (!confirm("Reset entire game? This will delete all points.")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/reset-game", {
        method: "POST",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(json.error || "Failed to reset game.");
      }

      alert("Game reset ✅");

      setSelected([]);
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
  }
}

  async function loadDashboard() {
    const res = await fetch("/api/dashboard");
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Dashboard API failed: ${res.status} ${text}`);
    }

    const json = JSON.parse(text);
    setData(json);
    setLineType(json.config.line_type || "O");
    setPossessionType(json.config.possession_type || "Receive");

    const statsRes = await fetch("/api/player-stats");
    const statsText = await statsRes.text();

    if (!statsRes.ok) {
      throw new Error(`Player stats API failed: ${statsRes.status} ${statsText}`);
    }

    const statsJson = JSON.parse(statsText);
    setPlayerStats(statsJson);
  }

  useEffect(() => {
    loadDashboard().catch((err) => {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to load dashboard");
    });
  }, []);

  const bench = useMemo(() => {
    if (!data) return [];
    const selectedSet = new Set(selected);
    return data.availablePlayers
      .map((p) => p.Name)
      .filter((name) => !selectedSet.has(name));
  }, [data, selected]);

  function addPlayer(name: string) {
    if (selected.includes(name)) return;
    if (selected.length >= 7) return;
    setSelected((prev) => [...prev, name]);
  }

  function removePlayer(name: string) {
    setSelected((prev) => prev.filter((n) => n !== name));
  }

  async function startPoint() {
    setLoading(true);
    try {
      const res = await fetch("/api/start-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: selected, lineType, possessionType }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(json.error || "Failed to start point.");
      }

      alert(`Point ${json.pointNumber} started`);
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function endPoint() {
    const result =
      window.prompt("result? hold / break / conceded / unknown", "hold") || "unknown";
    const scoreUsAfter =
      window.prompt("score us after?", data?.config.score_us || "0") || "0";
    const scoreThemAfter =
      window.prompt("score them after?", data?.config.score_them || "0") || "0";
    const notes = window.prompt("notes?", "") || "";

    setLoading(true);
    try {
      const res = await fetch("/api/end-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, scoreUsAfter, scoreThemAfter, notes }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(json.error || "Failed to end point.");
      }

      alert(`Point ended. Duration ${json.durationSec}s`);
      setSelected([]);
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return <main style={pageStyle}>Loading...</main>;
  }

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 32, marginBottom: 16, color: "#111827" }}>
        Ultimate Line Caller
      </h1>

      <section style={card}>
        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={label}>Score</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#111827" }}>
              {data.config.score_us || 0} - {data.config.score_them || 0}
            </div>
          </div>

          <div>
            <div style={label}>Point</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#111827" }}>
              {data.config.current_point_number || 1}
            </div>
          </div>

          <div>
            <div style={label}>Status</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#2563eb" }}>
              {data.config.current_point_status || "Ready"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <select
            value={lineType}
            onChange={(e) => setLineType(e.target.value)}
            style={inputStyle}
          >
            <option value="O">O</option>
            <option value="D">D</option>
          </select>

          <select
            value={possessionType}
            onChange={(e) => setPossessionType(e.target.value)}
            style={inputStyle}
          >
            <option value="Receive">Receive</option>
            <option value="Pull">Pull</option>
          </select>
        </div>

        <button
            onClick={resetGame}
            disabled={loading}
            style={{
              ...primaryBtn,
              background: "#7c3aed", // purple so it's clearly different
            }}
          >
            Reset Game
          </button>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 22, marginBottom: 14, color: "#111827" }}>
          Current Line
        </h2>
        <div style={chipWrap}>
          {selected.map((name) => (
            <button key={name} onClick={() => removePlayer(name)} style={selectedChip}>
              {name}
            </button>
          ))}
          {Array.from({ length: Math.max(0, 7 - selected.length) }).map((_, i) => (
            <div key={i} style={emptyChip}>
              Empty
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 22, marginBottom: 14, color: "#111827" }}>Bench</h2>
        <div style={chipWrap}>
          {bench.map((name) => (
            <button key={name} onClick={() => addPlayer(name)} style={chip}>
              {name}
            </button>
          ))}
        </div>
      </section>

      <section style={card}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={startPoint} disabled={loading} style={primaryBtn}>
            Start Point
          </button>
          <button onClick={endPoint} disabled={loading} style={dangerBtn}>
            End Point
          </button>
          <button onClick={() => setSelected([])} disabled={loading} style={ghostBtn}>
            Clear
          </button>
          <button onClick={() => loadDashboard()} disabled={loading} style={ghostBtn}>
            Refresh
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 22, marginBottom: 14, color: "#111827" }}>
          Recent Points
        </h2>
        {data.latestPoints.length === 0 ? (
          <div>No points yet.</div>
        ) : (
          data.latestPoints.map((pt) => (
            <div
              key={pt.PointID}
              style={{ padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}
            >
              <strong>#{pt.PointNumber}</strong> {pt.LineType} / {pt.PossessionType} /{" "}
              {pt.Result || ""}
              <div style={{ color: "#666", marginTop: 4 }}>{pt.PlayersCSV}</div>
            </div>
          ))
        )}
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 22, marginBottom: 14, color: "#111827" }}>
          Player Stats
        </h2>

        {playerStats.length === 0 ? (
          <div>No stats yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #d1d5db",
                    background: "#f9fafb",
                  }}
                >
                  <th style={{ ...thTd, width: 180 }}>Player</th>
                  <th style={thTd}>Points</th>
                  <th style={thTd}>Seconds</th>
                  <th style={thTd}>Minutes</th>
                  <th style={thTd}>O Points</th>
                  <th style={thTd}>D Points</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((player) => (
                  <tr
                    key={player.playerId}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td
                      style={{
                        ...thTd,
                        minWidth: 180,
                        verticalAlign: "middle",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.2,
                          color: "#111827",
                        }}
                      >
                        {player.name || "-"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        {player.playerId || ""}
                      </div>
                    </td>
                    <td style={thTd}>{player.totalPoints}</td>
                    <td style={thTd}>{player.totalSeconds}</td>
                    <td style={thTd}>{player.totalMinutes}</td>
                    <td style={thTd}>{player.oPoints}</td>
                    <td style={thTd}>{player.dPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial, sans-serif",
  background: "#f3f4f6",
  minHeight: "100vh",
  color: "#111827",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  border: "1px solid #d1d5db",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  marginBottom: 16,
};

const label: React.CSSProperties = {
  color: "#4b5563",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  minWidth: 140,
  background: "#ffffff",
  color: "#111827",
  fontSize: 16,
};

const chipWrap: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const chip: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #c7d2fe",
  background: "#e0e7ff",
  color: "#1e3a8a",
  cursor: "pointer",
  fontWeight: 600,
};

const selectedChip: React.CSSProperties = {
  ...chip,
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#166534",
};

const emptyChip: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#6b7280",
  border: "1px dashed #cbd5e1",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "#dc2626",
};

const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "#e5e7eb",
  color: "#111827",
};

const thTd: React.CSSProperties = {
  padding: "12px 12px",
  color: "#111827",
  fontSize: 15,
  textAlign: "left",
  verticalAlign: "middle",
};