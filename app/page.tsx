"use client";

import { useEffect, useMemo, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Player = {
  Name: string;
  PreferredLine: string; // "O" | "D" | ""
  Role: string;          // "handler" | "cutter" | "hybrid" | ""
  Notes: string;
};

type DashboardData = {
  config: Record<string, string>;
  availablePlayers: Player[];
  latestPoints: Array<Record<string, string>>;
};

type DayStat = {
  totalPoints: number;
  totalSeconds: number;
  totalMinutes: number;
  oPoints: number;
  dPoints: number;
  holds: number;
  breaks: number;
  conceded: number;
};

type RecentPoint = {
  pointNumber: string;
  lineType: string;
  possessionType: string;
  result: string;
  durationSec: number;
  startTime: string;
  day: number;
};

type PlayerStat = {
  name: string;
  role: string;
  notes: string;
  totalPoints: number;
  totalSeconds: number;
  totalMinutes: number;
  oPoints: number;
  dPoints: number;
  holds: number;
  breaks: number;
  conceded: number;
  day1: DayStat;
  day2: DayStat;
  recentPoints: RecentPoint[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function roleColor(role: string): { bg: string; border: string; color: string } {
  switch (role.toLowerCase()) {
    case "handler":
      return { bg: "#dbeafe", border: "#93c5fd", color: "#1e40af" };
    case "cutter":
      return { bg: "#ffedd5", border: "#fdba74", color: "#9a3412" };
    case "hybrid":
      return { bg: "#f3e8ff", border: "#c4b5fd", color: "#5b21b6" };
    default:
      return { bg: "#e0e7ff", border: "#c7d2fe", color: "#1e3a8a" };
  }
}

function resultColor(result: string): string {
  switch (result.toLowerCase()) {
    case "hold":   return "#16a34a";
    case "break":  return "#2563eb";
    case "conceded": return "#dc2626";
    default:       return "#6b7280";
  }
}

function resultEmoji(result: string): string {
  switch (result.toLowerCase()) {
    case "hold":     return "✅";
    case "break":    return "🔥";
    case "conceded": return "❌";
    default:         return "—";
  }
}

// ─── Player Modal ─────────────────────────────────────────────────────────────

function PlayerModal({
  stat,
  onClose,
  onSaveNotes,
}: {
  stat: PlayerStat;
  onClose: () => void;
  onSaveNotes: (name: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(stat.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSaveNotes(stat.name, notes);
    setSaving(false);
  }

  const roleC = roleColor(stat.role);

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>{stat.name}</h2>
            {stat.role && (
              <span style={{ ...roleBadge, background: roleC.bg, border: `1px solid ${roleC.border}`, color: roleC.color }}>
                {stat.role}
              </span>
            )}
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Overall stats */}
        <div style={statGrid}>
          <StatBox label="Points" value={stat.totalPoints} />
          <StatBox label="Time" value={fmtTime(stat.totalSeconds)} />
          <StatBox label="O pts" value={stat.oPoints} />
          <StatBox label="D pts" value={stat.dPoints} />
          <StatBox label="Holds" value={stat.holds} color="#16a34a" />
          <StatBox label="Breaks" value={stat.breaks} color="#2563eb" />
          <StatBox label="Conceded" value={stat.conceded} color="#dc2626" />
        </div>

        {/* Day 1 vs Day 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <DayCard day={1} s={stat.day1} />
          <DayCard day={2} s={stat.day2} />
        </div>

        {/* Recent points */}
        {stat.recentPoints.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}>Recent Points</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {stat.recentPoints.map((pt, i) => (
                <div key={i} style={{
                  display: "flex", gap: 8, alignItems: "center",
                  padding: "6px 10px", borderRadius: 8,
                  background: "#f9fafb", fontSize: 13,
                }}>
                  <span style={{ fontWeight: 700, color: "#111827", minWidth: 28 }}>#{pt.pointNumber}</span>
                  <span style={{ color: "#6b7280" }}>Day {pt.day}</span>
                  <span style={{ color: "#4b5563" }}>{pt.lineType} / {pt.possessionType}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 700, color: resultColor(pt.result) }}>
                    {resultEmoji(pt.result)} {pt.result || "—"}
                  </span>
                  <span style={{ color: "#9ca3af" }}>{fmtTime(pt.durationSec)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes / TLDR */}
        <div style={{ marginBottom: 12 }}>
          <div style={sectionLabel}>Player Notes / TLDR</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes about this player..."
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: "1px solid #cbd5e1", fontSize: 14, resize: "vertical",
              background: "#f9fafb", color: "#111827", boxSizing: "border-box",
            }}
          />
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, marginTop: 8, fontSize: 14 }}>
            {saving ? "Saving…" : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#111827" }}>{value}</div>
    </div>
  );
}

function DayCard({ day, s }: { day: number; s: DayStat }) {
  return (
    <div style={{ background: day === 1 ? "#eff6ff" : "#fefce8", borderRadius: 12, padding: "12px 14px", border: `1px solid ${day === 1 ? "#bfdbfe" : "#fde68a"}` }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: day === 1 ? "#1d4ed8" : "#92400e", marginBottom: 8 }}>Day {day}</div>
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
        <div><strong>{s.totalPoints}</strong> pts · <strong>{fmtTime(s.totalSeconds)}</strong></div>
        <div>O: {s.oPoints} · D: {s.dPoints}</div>
        <div style={{ color: "#16a34a" }}>✅ {s.holds} holds</div>
        <div style={{ color: "#2563eb" }}>🔥 {s.breaks} breaks</div>
        <div style={{ color: "#dc2626" }}>❌ {s.conceded} conceded</div>
      </div>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  title,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={card}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: 0, marginBottom: open ? 14 : 0,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
          {title}
          {badge !== undefined && (
            <span style={{
              marginLeft: 8, fontSize: 12, fontWeight: 700,
              background: "#e5e7eb", color: "#374151",
              padding: "2px 8px", borderRadius: 999,
            }}>{badge}</span>
          )}
        </span>
        <span style={{ fontSize: 18, color: "#6b7280" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && children}
    </section>
  );
}

// ─── End Point Modal ──────────────────────────────────────────────────────────

function EndPointModal({
  config,
  onClose,
  onSubmit,
}: {
  config: Record<string, string>;
  onClose: () => void;
  onSubmit: (data: { result: string; scoreUsAfter: string; scoreThemAfter: string; notes: string }) => void;
}) {
  const [result, setResult] = useState("hold");
  const [scoreUs, setScoreUs] = useState(config.score_us || "0");
  const [scoreThem, setScoreThem] = useState(config.score_them || "0");
  const [notes, setNotes] = useState("");

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>End Point</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={fieldLabel}>Result</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["hold", "break", "conceded", "unknown"].map((r) => (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "2px solid",
                    borderColor: result === r ? resultColor(r) : "#e5e7eb",
                    background: result === r ? resultColor(r) : "#f9fafb",
                    color: result === r ? "#fff" : "#374151",
                    fontWeight: 700, cursor: "pointer", fontSize: 14,
                  }}
                >
                  {resultEmoji(r)} {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={fieldLabel}>Score Us</div>
              <input type="number" value={scoreUs} onChange={(e) => setScoreUs(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <div style={fieldLabel}>Score Them</div>
              <input type="number" value={scoreThem} onChange={(e) => setScoreThem(e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          <div>
            <div style={fieldLabel}>Notes</div>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..." style={inputStyle} />
          </div>

          <button
            onClick={() => onSubmit({ result, scoreUsAfter: scoreUs, scoreThemAfter: scoreThem, notes })}
            style={{ ...primaryBtn, background: "#dc2626", fontSize: 16, marginTop: 4 }}
          >
            End Point
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lineType, setLineType] = useState("O");
  const [possessionType, setPossessionType] = useState("Receive");
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);

  async function loadDashboard() {
    const [dashRes, statsRes] = await Promise.all([
      fetch("/api/dashboard"),
      fetch("/api/player-stats"),
    ]);

    if (!dashRes.ok) throw new Error(`Dashboard: ${dashRes.status}`);
    if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status}`);

    const json: DashboardData = await dashRes.json();
    const statsJson: PlayerStat[] = await statsRes.json();

    setData(json);
    setLineType(json.config.line_type || "O");
    setPossessionType(json.config.possession_type || "Receive");
    setPlayerStats(statsJson);
  }

  useEffect(() => {
    loadDashboard().catch((err) => {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to load");
    });
  }, []);

  // ── Bench: split O / D, alphabetical ─────────────────────────────────────
  const { oBench, dBench } = useMemo(() => {
    if (!data) return { oBench: [], dBench: [] };
    const selectedSet = new Set(selected);
    const bench = data.availablePlayers
      .filter((p) => !selectedSet.has(p.Name))
      .sort((a, b) => a.Name.localeCompare(b.Name));

    const oBench = bench.filter((p) => p.PreferredLine === "O" || p.PreferredLine === "");
    const dBench = bench.filter((p) => p.PreferredLine === "D");
    return { oBench, dBench };
  }, [data, selected]);

  // ── Auto-generate line ────────────────────────────────────────────────────
  function autoLine() {
    if (!data) return;
    const selectedSet = new Set(selected);
    const pool = data.availablePlayers
      .filter((p) => !selectedSet.has(p.Name))
      .sort((a, b) => a.Name.localeCompare(b.Name));

    // prefer players whose PreferredLine matches the current lineType
    const preferred = pool.filter((p) => p.PreferredLine === lineType);
    const others = pool.filter((p) => p.PreferredLine !== lineType);
    const ordered = [...preferred, ...others];
    const need = 7 - selected.length;
    const picks = ordered.slice(0, need).map((p) => p.Name);
    setSelected((prev) => [...prev, ...picks]);
  }

  function addPlayer(name: string) {
    if (selected.includes(name) || selected.length >= 7) return;
    setSelected((prev) => [...prev, name]);
  }

  function removePlayer(name: string) {
    setSelected((prev) => prev.filter((n) => n !== name));
  }

  function openPlayerModal(name: string) {
    const stat = playerStats.find((s) => s.name === name);
    if (stat) setSelectedPlayer(stat);
  }

  async function saveNotes(name: string, notes: string) {
    await fetch("/api/update-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, notes }),
    });
    await loadDashboard();
  }

  async function resetGame() {
    if (!confirm("Reset entire game? This will delete all points.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reset-game", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      alert("Game reset ✅");
      setSelected([]);
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function startPoint() {
    setLoading(true);
    try {
      const res = await fetch("/api/start-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: selected, lineType, possessionType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start point.");
      alert(`Point ${json.pointNumber} started ▶`);
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function endPoint(formData: { result: string; scoreUsAfter: string; scoreThemAfter: string; notes: string }) {
    setShowEndModal(false);
    setLoading(true);
    try {
      const res = await fetch("/api/end-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: formData.result,
          scoreUsAfter: Number(formData.scoreUsAfter),
          scoreThemAfter: Number(formData.scoreThemAfter),
          notes: formData.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to end point.");
      alert(`Point ended ${resultEmoji(formData.result)} · ${fmtTime(json.durationSec)}`);
      setSelected([]);
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!data) return <main style={pageStyle}>Loading…</main>;

  const isInProgress = (data.config.current_point_status || "").toLowerCase() === "in progress";

  return (
    <main style={pageStyle}>
      {/* Modals */}
      {selectedPlayer && (
        <PlayerModal
          stat={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onSaveNotes={saveNotes}
        />
      )}
      {showEndModal && (
        <EndPointModal
          config={data.config}
          onClose={() => setShowEndModal(false)}
          onSubmit={endPoint}
        />
      )}

      {/* Title */}
      <h1 style={{ fontSize: 26, marginBottom: 12, color: "#111827", fontWeight: 800 }}>
        🏃 Ultimate Line Caller
      </h1>

      {/* Score / Status */}
      <section style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={label}>Score</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#111827" }}>
              {data.config.score_us || 0} – {data.config.score_them || 0}
            </div>
          </div>
          <div>
            <div style={label}>Point</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#111827" }}>
              #{data.config.current_point_number || 1}
            </div>
          </div>
          <div>
            <div style={label}>Status</div>
            <div style={{
              fontSize: 15, fontWeight: 700,
              color: isInProgress ? "#d97706" : "#16a34a",
              background: isInProgress ? "#fef3c7" : "#dcfce7",
              padding: "4px 12px", borderRadius: 999,
            }}>
              {isInProgress ? "▶ In Progress" : "● Ready"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={lineType} onChange={(e) => setLineType(e.target.value)} style={inputStyle}>
              <option value="O">O Line</option>
              <option value="D">D Line</option>
            </select>
            <select value={possessionType} onChange={(e) => setPossessionType(e.target.value)} style={inputStyle}>
              <option value="Receive">Receive</option>
              <option value="Pull">Pull</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={startPoint} disabled={loading || isInProgress} style={primaryBtn}>
            ▶ Start Point
          </button>
          <button onClick={() => setShowEndModal(true)} disabled={loading || !isInProgress} style={dangerBtn}>
            ■ End Point
          </button>
          <button onClick={() => setSelected([])} disabled={loading} style={ghostBtn}>Clear</button>
          <button onClick={autoLine} disabled={loading || selected.length >= 7} style={{ ...ghostBtn, background: "#d1fae5", color: "#065f46" }}>
            ⚡ Auto {lineType} Line
          </button>
          <button onClick={() => loadDashboard()} disabled={loading} style={ghostBtn}>↺ Refresh</button>
          <button onClick={resetGame} disabled={loading} style={{ ...ghostBtn, background: "#fce7f3", color: "#9d174d" }}>
            ⚠ Reset Game
          </button>
        </div>
      </section>

      {/* Current Line */}
      <Section title="Current Line" badge={`${selected.length}/7`}>
        <div style={chipWrap}>
          {selected.map((name) => {
            const p = data.availablePlayers.find((pl) => pl.Name === name);
            const rc = roleColor(p?.Role || "");
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <button
                  onClick={() => removePlayer(name)}
                  onDoubleClick={() => openPlayerModal(name)}
                  title="Click to remove · Double-click for stats"
                  style={{ ...selectedChip, background: rc.bg, border: `1.5px solid ${rc.border}`, color: rc.color }}
                >
                  {name}
                </button>
                {p?.Role && <span style={{ fontSize: 10, color: rc.color, fontWeight: 600 }}>{p.Role}</span>}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 7 - selected.length) }).map((_, i) => (
            <div key={i} style={emptyChip}>Empty</div>
          ))}
        </div>
      </Section>

      {/* Bench */}
      <Section title="Bench" badge={oBench.length + dBench.length} defaultOpen={true}>
        {/* Role legend */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {[
            { role: "handler", label: "Handler" },
            { role: "cutter", label: "Cutter" },
            { role: "hybrid", label: "Hybrid" },
          ].map(({ role, label }) => {
            const rc = roleColor(role);
            return (
              <span key={role} style={{ ...roleBadge, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>
                {label}
              </span>
            );
          })}
        </div>

        {dBench.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>D Line</div>
            <div style={{ ...chipWrap, marginBottom: 12 }}>
              {dBench.map((p) => {
                const rc = roleColor(p.Role);
                const stat = playerStats.find((s) => s.name === p.Name);
                return (
                  <BenchChip
                    key={p.Name}
                    player={p}
                    rc={rc}
                    stat={stat}
                    onAdd={() => addPlayer(p.Name)}
                    onInfo={() => openPlayerModal(p.Name)}
                  />
                );
              })}
            </div>
          </>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 6 }}>O Line</div>
        <div style={chipWrap}>
          {oBench.map((p) => {
            const rc = roleColor(p.Role);
            const stat = playerStats.find((s) => s.name === p.Name);
            return (
              <BenchChip
                key={p.Name}
                player={p}
                rc={rc}
                stat={stat}
                onAdd={() => addPlayer(p.Name)}
                onInfo={() => openPlayerModal(p.Name)}
              />
            );
          })}
        </div>
      </Section>

      {/* Recent Points */}
      <Section title="Recent Points" badge={data.latestPoints.length} defaultOpen={false}>
        {data.latestPoints.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No points yet.</div>
        ) : (
          data.latestPoints.map((pt) => {
            const res = (pt.Result || "").toLowerCase();
            const resColor = resultColor(res);
            const durationSec = Number(pt.DurationSec || 0);
            return (
              <div
                key={pt.PointID}
                style={{
                  padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                  background: "#f9fafb", border: "1px solid #e5e7eb",
                  display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 800, color: "#111827", minWidth: 36 }}>#{pt.PointNumber}</span>
                <span style={{
                  fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 999,
                  background: pt.LineType === "O" ? "#dbeafe" : "#fce7f3",
                  color: pt.LineType === "O" ? "#1e40af" : "#9d174d",
                }}>{pt.LineType}</span>
                <span style={{ color: "#6b7280", fontSize: 13 }}>{pt.PossessionType}</span>
                {pt.Result && (
                  <span style={{ fontWeight: 700, color: resColor, marginLeft: "auto" }}>
                    {resultEmoji(res)} {pt.Result}
                  </span>
                )}
                {durationSec > 0 && (
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>{fmtTime(durationSec)}</span>
                )}
                <div style={{ width: "100%", color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  {pt.PlayersCSV}
                </div>
              </div>
            );
          })
        )}
      </Section>

      {/* Player Stats */}
      <Section title="Player Stats" badge={playerStats.length} defaultOpen={false}>
        {playerStats.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No stats yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={thTd}>Player</th>
                  <th style={thTd}>Pts</th>
                  <th style={thTd}>Time</th>
                  <th style={thTd}>O</th>
                  <th style={thTd}>D</th>
                  <th style={thTd}>Holds</th>
                  <th style={thTd}>Breaks</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((player) => {
                  const rc = roleColor(player.role);
                  return (
                    <tr
                      key={player.name}
                      onClick={() => setSelectedPlayer(player)}
                      className="stats-row"
                      style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}
                    >
                      <td style={{ ...thTd, minWidth: 140 }}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>{player.name}</div>
                        {player.role && (
                          <span style={{ ...roleBadge, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color, fontSize: 10 }}>
                            {player.role}
                          </span>
                        )}
                      </td>
                      <td style={thTd}>{player.totalPoints}</td>
                      <td style={thTd}>{fmtTime(player.totalSeconds)}</td>
                      <td style={thTd}>{player.oPoints}</td>
                      <td style={thTd}>{player.dPoints}</td>
                      <td style={{ ...thTd, color: "#16a34a", fontWeight: 700 }}>{player.holds}</td>
                      <td style={{ ...thTd, color: "#2563eb", fontWeight: 700 }}>{player.breaks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  );
}

// ─── BenchChip component ──────────────────────────────────────────────────────

function BenchChip({
  player,
  rc,
  stat,
  onAdd,
  onInfo,
}: {
  player: Player;
  rc: { bg: string; border: string; color: string };
  stat?: PlayerStat;
  onAdd: () => void;
  onInfo: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ display: "flex", gap: 0 }}>
        <button
          onClick={onAdd}
          title="Add to line"
          style={{
            padding: "8px 12px",
            borderRadius: "999px 0 0 999px",
            border: `1px solid ${rc.border}`,
            borderRight: "none",
            background: rc.bg,
            color: rc.color,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {player.Name}
        </button>
        <button
          onClick={onInfo}
          title="View stats"
          style={{
            padding: "8px 8px",
            borderRadius: "0 999px 999px 0",
            border: `1px solid ${rc.border}`,
            background: rc.bg,
            color: rc.color,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          📊
        </button>
      </div>
      {stat && stat.totalPoints > 0 && (
        <span style={{ fontSize: 10, color: "#9ca3af" }}>
          {stat.totalPoints}pts · {fmtTime(stat.totalSeconds)}
        </span>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto",
  padding: "16px 16px 40px",
  fontFamily: "system-ui, -apple-system, Arial, sans-serif",
  background: "#f3f4f6",
  minHeight: "100vh",
  color: "#111827",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: "16px 18px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
  marginBottom: 12,
};

const label: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const fieldLabel: React.CSSProperties = {
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#6b7280",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#111827",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const chipWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const selectedChip: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1.5px solid #86efac",
  background: "#dcfce7",
  color: "#166534",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const emptyChip: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#9ca3af",
  border: "1px dashed #d1d5db",
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
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
  padding: "10px 10px",
  color: "#111827",
  fontSize: 14,
  textAlign: "left",
  verticalAlign: "middle",
};

const roleBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalBox: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 24,
  maxWidth: 560,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const closeBtn: React.CSSProperties = {
  background: "#f3f4f6",
  border: "none",
  borderRadius: 8,
  width: 32,
  height: 32,
  cursor: "pointer",
  fontSize: 16,
  color: "#374151",
  flexShrink: 0,
};

const statGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
  gap: 8,
  marginBottom: 14,
};
