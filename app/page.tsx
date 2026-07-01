"use client";

import { useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = { Name: string; PreferredLine: string; Role: string; Notes: string };

type Game = { GameID: string; Name: string; Date: string; Opponent: string; Tournament: string; Day: string; Status: string; ScoreUs: string; ScoreThem: string; Notes: string };

type DashboardData = {
  config: Record<string, string>;
  availablePlayers: Player[];
  latestPoints: Array<Record<string, string>>;
  currentGame: Game | null;
  games: Game[];
};

type DayStat = {
  totalPoints: number; totalSeconds: number; totalMinutes: number;
  oPoints: number; dPoints: number; holds: number; breaks: number; conceded: number;
};

type RecentPoint = {
  pointNumber: string; lineType: string; possessionType: string;
  result: string; durationSec: number; startTime: string; day: number;
  setPlay: string; setPlaySuccess: string;
};

type PlayerStat = {
  name: string; role: string; notes: string;
  totalPoints: number; totalSeconds: number; totalMinutes: number;
  oPoints: number; dPoints: number; holds: number; breaks: number; conceded: number;
  holdRate: number; breakRate: number; oHoldRate: number; dBreakRate: number;
  avgPointDuration: number; setPlayCount: number; setPlaySuccess: number; setPlaySuccessRate: number;
  day1: DayStat; day2: DayStat;
  recentPoints: RecentPoint[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function roleColor(role: string) {
  switch (role.toLowerCase()) {
    case "handler": return { bg: "#dbeafe", border: "#93c5fd", color: "#1e40af" };
    case "cutter":  return { bg: "#ffedd5", border: "#fdba74", color: "#9a3412" };
    case "hybrid":  return { bg: "#f3e8ff", border: "#c4b5fd", color: "#5b21b6" };
    default:        return { bg: "#e0e7ff", border: "#c7d2fe", color: "#1e3a8a" };
  }
}

function resultColor(r: string) {
  switch (r.toLowerCase()) {
    case "hold":     return "#16a34a";
    case "break":    return "#2563eb";
    case "conceded": return "#dc2626";
    default:         return "#6b7280";
  }
}

function resultEmoji(r: string) {
  switch (r.toLowerCase()) {
    case "hold":     return "✅";
    case "break":    return "🔥";
    case "conceded": return "❌";
    default:         return "—";
  }
}

const SET_PLAYS = ["Stack", "Vert", "Hori", "End Zone", "Red Zone", "Set Play", "Other"];

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const tabs = [
    { id: "games",  label: "🗂 Games" },
    { id: "game",   label: "🏃 Line" },
    { id: "stats",  label: "📊 Stats" },
  ];
  return (
    <div style={{
      display: "flex", gap: 4, background: "#fff",
      borderRadius: 14, padding: 4, marginBottom: 14,
      border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "10px 4px", borderRadius: 10, border: "none",
          background: active === t.id ? "#111827" : "transparent",
          color: active === t.id ? "#fff" : "#6b7280",
          fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Player Modal ─────────────────────────────────────────────────────────────

function PlayerModal({ stat, onClose, onSaveNotes }: {
  stat: PlayerStat; onClose: () => void;
  onSaveNotes: (name: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(stat.notes || "");
  const [saving, setSaving] = useState(false);
  const rc = roleColor(stat.role);

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>{stat.name}</h2>
            {stat.role && <span style={{ ...roleBadge, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>{stat.role}</span>}
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Key stats grid */}
        <div style={statGrid}>
          <StatBox label="Points" value={stat.totalPoints} />
          <StatBox label="Time" value={fmtTime(stat.totalSeconds)} />
          <StatBox label="Hold%" value={`${stat.holdRate}%`} color="#16a34a" />
          <StatBox label="Break%" value={`${stat.breakRate}%`} color="#2563eb" />
          <StatBox label="O Hold%" value={`${stat.oHoldRate}%`} color="#0369a1" />
          <StatBox label="D Break%" value={`${stat.dBreakRate}%`} color="#7c3aed" />
          <StatBox label="Avg dur" value={fmtTime(stat.avgPointDuration)} />
          {stat.setPlayCount > 0 && <StatBox label="Set Play%" value={`${stat.setPlaySuccessRate}%`} color="#d97706" />}
        </div>

        {/* Raw counts */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14, fontSize: 13, color: "#6b7280" }}>
          <span>O: {stat.oPoints}</span>
          <span>D: {stat.dPoints}</span>
          <span style={{ color: "#16a34a" }}>✅ {stat.holds} holds</span>
          <span style={{ color: "#2563eb" }}>🔥 {stat.breaks} breaks</span>
          <span style={{ color: "#dc2626" }}>❌ {stat.conceded} conceded</span>
        </div>

        {/* Day 1 vs 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <DayCard day={1} s={stat.day1} />
          <DayCard day={2} s={stat.day2} />
        </div>

        {/* Recent points */}
        {stat.recentPoints.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>Recent Points</div>
            {stat.recentPoints.map((pt, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 8px", borderRadius: 8, background: "#f9fafb", marginBottom: 3, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: "#111827", minWidth: 26 }}>#{pt.pointNumber}</span>
                <span style={{ color: "#6b7280" }}>D{pt.day}</span>
                <span style={{ color: "#4b5563" }}>{pt.lineType}/{pt.possessionType}</span>
                {pt.setPlay && <span style={{ color: "#d97706", fontWeight: 600 }}>🎯{pt.setPlay}</span>}
                <span style={{ marginLeft: "auto", fontWeight: 700, color: resultColor(pt.result) }}>{resultEmoji(pt.result)} {pt.result}</span>
                <span style={{ color: "#9ca3af" }}>{fmtTime(pt.durationSec)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div style={sectionLabel}>Notes / TLDR</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Add notes..." style={{ ...inputStyle, resize: "vertical" as const }} />
        <button onClick={async () => { setSaving(true); await onSaveNotes(stat.name, notes); setSaving(false); }}
          disabled={saving} style={{ ...primaryBtn, marginTop: 8, fontSize: 13 }}>
          {saving ? "Saving…" : "Save Notes"}
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || "#111827" }}>{value}</div>
    </div>
  );
}

function DayCard({ day, s }: { day: number; s: DayStat }) {
  const scorable = s.holds + s.conceded;
  const holdRate = scorable > 0 ? Math.round((s.holds / scorable) * 100) : 0;
  const breakRate = s.dPoints > 0 ? Math.round((s.breaks / s.dPoints) * 100) : 0;
  return (
    <div style={{ background: day === 1 ? "#eff6ff" : "#fefce8", borderRadius: 10, padding: "10px 12px", border: `1px solid ${day === 1 ? "#bfdbfe" : "#fde68a"}` }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: day === 1 ? "#1d4ed8" : "#92400e", marginBottom: 6 }}>Day {day} — {s.totalPoints} pts</div>
      <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.9 }}>
        <div>{fmtTime(s.totalSeconds)} · O:{s.oPoints} D:{s.dPoints}</div>
        <div style={{ color: "#16a34a" }}>Hold {holdRate}% ({s.holds}/{scorable})</div>
        <div style={{ color: "#2563eb" }}>Break {breakRate}% ({s.breaks}/{s.dPoints})</div>
      </div>
    </div>
  );
}

// ─── End Point Modal ──────────────────────────────────────────────────────────

function EndPointModal({ config, onClose, onSubmit }: {
  config: Record<string, string>;
  onClose: () => void;
  onSubmit: (d: { result: string; scoreUsAfter: string; scoreThemAfter: string; notes: string; setPlay: string; setPlaySuccess: boolean | null }) => void;
}) {
  const [result, setResult] = useState("hold");
  const [scoreUs, setScoreUs] = useState(config.score_us || "0");
  const [scoreThem, setScoreThem] = useState(config.score_them || "0");
  const [notes, setNotes] = useState("");
  const [setPlay, setSetPlay] = useState("");
  const [setPlaySuccess, setSetPlaySuccess] = useState<boolean | null>(null);

  // Auto-increment score based on result
  function handleResult(r: string) {
    setResult(r);
    if (r === "hold" || r === "break") {
      setScoreUs(String(Number(config.score_us || 0) + 1));
    } else if (r === "conceded") {
      setScoreThem(String(Number(config.score_them || 0) + 1));
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>End Point</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Result */}
          <div>
            <div style={fieldLabel}>Result</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["hold", "break", "conceded", "unknown"].map((r) => (
                <button key={r} onClick={() => handleResult(r)} style={{
                  padding: "7px 12px", borderRadius: 8, border: "2px solid",
                  borderColor: result === r ? resultColor(r) : "#e5e7eb",
                  background: result === r ? resultColor(r) : "#f9fafb",
                  color: result === r ? "#fff" : "#374151",
                  fontWeight: 700, cursor: "pointer", fontSize: 13,
                }}>{resultEmoji(r)} {r}</button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={fieldLabel}>Score Us</div>
              <input type="number" value={scoreUs} onChange={(e) => setScoreUs(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={fieldLabel}>Score Them</div>
              <input type="number" value={scoreThem} onChange={(e) => setScoreThem(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Set Play */}
          <div>
            <div style={fieldLabel}>Set Play Run? <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <button onClick={() => setSetPlay("")} style={{
                padding: "5px 10px", borderRadius: 8, border: "1.5px solid",
                borderColor: setPlay === "" ? "#111827" : "#e5e7eb",
                background: setPlay === "" ? "#111827" : "#f9fafb",
                color: setPlay === "" ? "#fff" : "#374151",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>None</button>
              {SET_PLAYS.map((sp) => (
                <button key={sp} onClick={() => setSetPlay(sp)} style={{
                  padding: "5px 10px", borderRadius: 8, border: "1.5px solid",
                  borderColor: setPlay === sp ? "#d97706" : "#e5e7eb",
                  background: setPlay === sp ? "#fef3c7" : "#f9fafb",
                  color: setPlay === sp ? "#92400e" : "#374151",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>🎯 {sp}</button>
              ))}
            </div>
            {setPlay && (
              <div>
                <div style={fieldLabel}>Did it succeed?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([true, false] as const).map((v) => (
                    <button key={String(v)} onClick={() => setSetPlaySuccess(v)} style={{
                      padding: "6px 14px", borderRadius: 8, border: "2px solid",
                      borderColor: setPlaySuccess === v ? (v ? "#16a34a" : "#dc2626") : "#e5e7eb",
                      background: setPlaySuccess === v ? (v ? "#dcfce7" : "#fee2e2") : "#f9fafb",
                      color: setPlaySuccess === v ? (v ? "#15803d" : "#b91c1c") : "#374151",
                      fontWeight: 700, cursor: "pointer", fontSize: 13,
                    }}>{v ? "✅ Yes" : "❌ No"}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div style={fieldLabel}>Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></div>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this point..." style={inputStyle} />
          </div>

          <button onClick={() => onSubmit({ result, scoreUsAfter: scoreUs, scoreThemAfter: scoreThem, notes, setPlay, setPlaySuccess })}
            style={{ ...primaryBtn, background: "#dc2626", fontSize: 15, marginTop: 2 }}>
            ■ End Point
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BenchChip ────────────────────────────────────────────────────────────────

function BenchChip({ player, rc, stat, onAdd, onInfo }: {
  player: Player; rc: { bg: string; border: string; color: string };
  stat?: PlayerStat; onAdd: () => void; onInfo: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ display: "flex" }}>
        <button onClick={onAdd} title="Add to line" style={{
          padding: "7px 11px", borderRadius: "999px 0 0 999px",
          border: `1px solid ${rc.border}`, borderRight: "none",
          background: rc.bg, color: rc.color, cursor: "pointer", fontWeight: 600, fontSize: 13,
        }}>{player.Name}</button>
        <button onClick={onInfo} title="Stats" style={{
          padding: "7px 7px", borderRadius: "0 999px 999px 0",
          border: `1px solid ${rc.border}`, background: rc.bg,
          color: rc.color, cursor: "pointer", fontSize: 11,
        }}>📊</button>
      </div>
      {stat && stat.totalPoints > 0 && (
        <span style={{ fontSize: 10, color: "#9ca3af" }}>
          {stat.totalPoints}pts · {stat.holdRate}% hold
        </span>
      )}
    </div>
  );
}

// ─── Game Tab ─────────────────────────────────────────────────────────────────

function GameTab({ data, playerStats, onRefresh, onEndGame }: {
  data: DashboardData; playerStats: PlayerStat[];
  onRefresh: () => void; onEndGame: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lineType, setLineType] = useState(data.config.line_type || "O");
  const [possessionType, setPossessionType] = useState(data.config.possession_type || "Receive");
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showEndGame, setShowEndGame] = useState(false);
  const [endGameNotes, setEndGameNotes] = useState("");
  const [endGameScoreUs, setEndGameScoreUs] = useState(data.config.score_us || "0");
  const [endGameScoreThem, setEndGameScoreThem] = useState(data.config.score_them || "0");

  const isInProgress = (data.config.current_point_status || "").toLowerCase() === "in progress";

  const { oBench, dBench } = useMemo(() => {
    const sel = new Set(selected);
    const bench = data.availablePlayers.filter((p) => !sel.has(p.Name));
    return {
      oBench: bench.filter((p) => p.PreferredLine !== "D").sort((a, b) => a.Name.localeCompare(b.Name)),
      dBench: bench.filter((p) => p.PreferredLine === "D").sort((a, b) => a.Name.localeCompare(b.Name)),
    };
  }, [data.availablePlayers, selected]);

  function autoLine() {
    const sel = new Set(selected);
    const pool = data.availablePlayers.filter((p) => !sel.has(p.Name));
    const preferred = pool.filter((p) => p.PreferredLine === lineType);
    const others = pool.filter((p) => p.PreferredLine !== lineType);
    const picks = [...preferred, ...others].slice(0, 7 - selected.length).map((p) => p.Name);
    setSelected((prev) => [...prev, ...picks]);
  }

  async function startPoint() {
    setLoading(true);
    try {
      const res = await fetch("/api/start-point", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: selected, lineType, possessionType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onRefresh();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function endPoint(fd: { result: string; scoreUsAfter: string; scoreThemAfter: string; notes: string; setPlay: string; setPlaySuccess: boolean | null }) {
    setShowEndModal(false);
    setLoading(true);
    try {
      const res = await fetch("/api/end-point", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: fd.result, scoreUsAfter: Number(fd.scoreUsAfter), scoreThemAfter: Number(fd.scoreThemAfter), notes: fd.notes, setPlay: fd.setPlay, setPlaySuccess: fd.setPlaySuccess }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      alert(`${resultEmoji(fd.result)} Point ended · ${fmtTime(json.durationSec)}`);
      setSelected([]);
      await onRefresh();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function saveNotes(name: string, notes: string) {
    await fetch("/api/update-player", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, notes }) });
    await onRefresh();
  }

  async function resetGame() {
    if (!confirm("Reset this game? Deletes all its points.")) return;
    setLoading(true);
    try {
      await fetch("/api/reset-game", { method: "POST" });
      setSelected([]);
      await onRefresh();
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function endGame() {
    setLoading(true);
    try {
      const res = await fetch("/api/end-game", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalScoreUs: Number(endGameScoreUs),
          finalScoreThem: Number(endGameScoreThem),
          notes: endGameNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      alert(`Game saved! ${json.outcome} · ${json.finalScoreUs}–${json.finalScoreThem} 🎉`);
      await onRefresh();
      onEndGame(); // navigate back to Games tab
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {selectedPlayer && <PlayerModal stat={selectedPlayer} onClose={() => setSelectedPlayer(null)} onSaveNotes={saveNotes} />}
      {showEndModal && <EndPointModal config={data.config} onClose={() => setShowEndModal(false)} onSubmit={endPoint} />}

      {/* Score bar */}
      <div style={{ ...card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "12px 16px" }}>
        {data.currentGame && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", flexBasis: "100%" }}>
            🗂 {data.currentGame.Name}{data.currentGame.Opponent ? ` vs ${data.currentGame.Opponent}` : ""}{data.currentGame.Tournament ? ` · ${data.currentGame.Tournament}` : ""}
          </div>
        )}
        <div>
          <div style={label}>Score</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#111827" }}>
            {data.config.score_us || 0} – {data.config.score_them || 0}
          </div>
        </div>
        <div>
          <div style={label}>Point</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#111827" }}>#{data.config.current_point_number || 1}</div>
        </div>
        <div>
          <div style={label}>Status</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: isInProgress ? "#d97706" : "#16a34a", background: isInProgress ? "#fef3c7" : "#dcfce7", padding: "3px 10px", borderRadius: 999 }}>
            {isInProgress ? "▶ In Progress" : "● Ready"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <select value={lineType} onChange={(e) => setLineType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="O">O Line</option>
            <option value="D">D Line</option>
          </select>
          <select value={possessionType} onChange={(e) => setPossessionType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="Receive">Receive</option>
            <option value="Pull">Pull</option>
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={startPoint} disabled={loading || isInProgress || selected.length !== 7} style={primaryBtn}>▶ Start</button>
        <button onClick={() => setShowEndModal(true)} disabled={loading || !isInProgress} style={dangerBtn}>■ End</button>
        <button onClick={() => setSelected([])} disabled={loading} style={ghostBtn}>Clear</button>
        <button onClick={autoLine} disabled={loading || selected.length >= 7} style={{ ...ghostBtn, background: "#d1fae5", color: "#065f46" }}>⚡ Auto {lineType}</button>
        <button onClick={onRefresh} disabled={loading} style={ghostBtn}>↺</button>
        <button onClick={resetGame} disabled={loading} style={{ ...ghostBtn, background: "#fce7f3", color: "#9d174d" }}>⚠ Reset</button>
      </div>

      {/* Current Line */}
      <div style={{ ...card, padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>CURRENT LINE ({selected.length}/7)</div>
        <div style={chipWrap}>
          {selected.map((name) => {
            const p = data.availablePlayers.find((pl) => pl.Name === name);
            const rc = roleColor(p?.Role || "");
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <button onClick={() => setSelected((s) => s.filter((n) => n !== name))}
                  onDoubleClick={() => { const st = playerStats.find((s) => s.name === name); if (st) setSelectedPlayer(st); }}
                  title="Click remove · Double-click stats"
                  style={{ ...selectedChip, background: rc.bg, border: `1.5px solid ${rc.border}`, color: rc.color }}>
                  {name}
                </button>
                {p?.Role && <span style={{ fontSize: 9, color: rc.color, fontWeight: 700 }}>{p.Role}</span>}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 7 - selected.length) }).map((_, i) => (
            <div key={i} style={emptyChip}>Empty</div>
          ))}
        </div>
      </div>

      {/* Bench */}
      <div style={{ ...card, padding: "12px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
          BENCH ({oBench.length + dBench.length})
          <span style={{ marginLeft: 10, fontWeight: 400, fontSize: 11 }}>
            {[{ role: "handler", label: "Handler" }, { role: "cutter", label: "Cutter" }, { role: "hybrid", label: "Hybrid" }].map(({ role, label }) => {
              const rc = roleColor(role);
              return <span key={role} style={{ ...roleBadge, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color, marginRight: 4 }}>{label}</span>;
            })}
          </span>
        </div>
        {dBench.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", marginBottom: 5 }}>D LINE</div>
            <div style={{ ...chipWrap, marginBottom: 10 }}>
              {dBench.map((p) => <BenchChip key={p.Name} player={p} rc={roleColor(p.Role)} stat={playerStats.find((s) => s.name === p.Name)} onAdd={() => { if (!selected.includes(p.Name) && selected.length < 7) setSelected((s) => [...s, p.Name]); }} onInfo={() => { const st = playerStats.find((s) => s.name === p.Name); if (st) setSelectedPlayer(st); }} />)}
            </div>
          </>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 5 }}>O LINE</div>
        <div style={chipWrap}>
          {oBench.map((p) => <BenchChip key={p.Name} player={p} rc={roleColor(p.Role)} stat={playerStats.find((s) => s.name === p.Name)} onAdd={() => { if (!selected.includes(p.Name) && selected.length < 7) setSelected((s) => [...s, p.Name]); }} onInfo={() => { const st = playerStats.find((s) => s.name === p.Name); if (st) setSelectedPlayer(st); }} />)}
        </div>
      </div>

      {/* End Game */}
      {data.currentGame && !showEndGame && (
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <button
            onClick={() => {
              setEndGameScoreUs(data.config.score_us || "0");
              setEndGameScoreThem(data.config.score_them || "0");
              setShowEndGame(true);
            }}
            disabled={loading}
            style={{ ...ghostBtn, color: "#7c3aed", background: "#ede9fe", border: "1px solid #c4b5fd", width: "100%", padding: "12px" }}
          >
            🏁 End &amp; Save Game
          </button>
        </div>
      )}

      {data.currentGame && showEndGame && (
        <div style={{ ...card, border: "2px solid #7c3aed", background: "#faf5ff", marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#5b21b6", marginBottom: 12 }}>
            🏁 End &amp; Save Game
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {data.currentGame.Name}{data.currentGame.Opponent ? ` vs ${data.currentGame.Opponent}` : ""}
            <br />All point data is already saved. This just marks the game as complete.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={fieldLabel}>Final Score — Us</div>
              <input type="number" value={endGameScoreUs}
                onChange={(e) => setEndGameScoreUs(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={fieldLabel}>Final Score — Them</div>
              <input type="number" value={endGameScoreThem}
                onChange={(e) => setEndGameScoreThem(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>Game Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></div>
            <input type="text" value={endGameNotes}
              onChange={(e) => setEndGameNotes(e.target.value)}
              placeholder="e.g. Great second half, strong D performance"
              style={inputStyle} />
          </div>

          {/* Outcome preview */}
          {endGameScoreUs !== "" && endGameScoreThem !== "" && (
            <div style={{
              textAlign: "center", marginBottom: 14, padding: "10px",
              borderRadius: 10, fontWeight: 800, fontSize: 20,
              background: Number(endGameScoreUs) > Number(endGameScoreThem) ? "#dcfce7"
                : Number(endGameScoreUs) < Number(endGameScoreThem) ? "#fee2e2" : "#f3f4f6",
              color: Number(endGameScoreUs) > Number(endGameScoreThem) ? "#15803d"
                : Number(endGameScoreUs) < Number(endGameScoreThem) ? "#b91c1c" : "#374151",
            }}>
              {Number(endGameScoreUs) > Number(endGameScoreThem) ? "🏆 Win"
                : Number(endGameScoreUs) < Number(endGameScoreThem) ? "💔 Loss" : "🤝 Draw"}
              {" · "}{endGameScoreUs} – {endGameScoreThem}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={endGame} disabled={loading}
              style={{ ...primaryBtn, background: "#7c3aed", flex: 1, padding: "12px" }}>
              {loading ? "Saving…" : "✅ Confirm End Game"}
            </button>
            <button onClick={() => setShowEndGame(false)} disabled={loading} style={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sortable Stats Table ─────────────────────────────────────────────────────

type SortKey = "name" | "totalPoints" | "totalSeconds" | "holdRate" | "breakRate" | "oHoldRate" | "dBreakRate" | "avgPointDuration";

const COLUMNS: { key: SortKey; label: string; color?: string }[] = [
  { key: "name",             label: "Player" },
  { key: "totalPoints",      label: "Pts" },
  { key: "totalSeconds",     label: "Time" },
  { key: "holdRate",         label: "Hold%",  color: "#16a34a" },
  { key: "breakRate",        label: "Break%", color: "#2563eb" },
  { key: "oHoldRate",        label: "O%" },
  { key: "dBreakRate",       label: "D%" },
  { key: "avgPointDuration", label: "Avg" },
];

function SortableStatsTable({ playerStats, onOpenPlayer }: {
  playerStats: PlayerStat[];
  onOpenPlayer: (s: PlayerStat) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("totalPoints");
  const [asc, setAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setAsc((v) => !v);
    } else {
      setSortKey(key);
      // numeric cols default desc, name defaults asc
      setAsc(key === "name");
    }
  }

  const sorted = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") {
        diff = a.name.localeCompare(b.name);
      } else {
        diff = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return asc ? diff : -diff;
    });
  }, [playerStats, sortKey, asc]);

  function cellValue(p: PlayerStat, key: SortKey): string {
    switch (key) {
      case "name":             return p.name;
      case "totalPoints":      return String(p.totalPoints);
      case "totalSeconds":     return fmtTime(p.totalSeconds);
      case "holdRate":         return `${p.holdRate}%`;
      case "breakRate":        return `${p.breakRate}%`;
      case "oHoldRate":        return `${p.oHoldRate}%`;
      case "dBreakRate":       return `${p.dBreakRate}%`;
      case "avgPointDuration": return fmtTime(p.avgPointDuration);
    }
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
            {COLUMNS.map((col) => {
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    ...thTd,
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    color: active ? "#111827" : "#6b7280",
                    background: active ? "#f0f9ff" : "#f9fafb",
                    borderBottom: active ? "2px solid #2563eb" : "2px solid #e5e7eb",
                  }}
                >
                  {col.label}
                  <span style={{ marginLeft: 3, fontSize: 10, opacity: active ? 1 : 0.3 }}>
                    {active ? (asc ? "▲" : "▼") : "⇅"}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const rc = roleColor(p.role);
            return (
              <tr
                key={p.name}
                onClick={() => onOpenPlayer(p)}
                className="stats-row"
                style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}
              >
                <td style={{ ...thTd, minWidth: 110 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  {p.role && (
                    <span style={{ ...roleBadge, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color, fontSize: 9 }}>
                      {p.role}
                    </span>
                  )}
                </td>
                {COLUMNS.slice(1).map((col) => (
                  <td
                    key={col.key}
                    style={{
                      ...thTd,
                      color: sortKey === col.key ? "#111827" : (col.color || "#374151"),
                      fontWeight: (sortKey === col.key || col.color) ? 700 : 400,
                      background: sortKey === col.key ? "#f8faff" : undefined,
                    }}
                  >
                    {cellValue(p, col.key)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ allGames, allPoints, defaultGameId, onOpenPlayer }: {
  allGames: Array<{ GameID: string; Name: string; Date: string; Opponent: string; Tournament: string; Status: string; ScoreUs: string; ScoreThem: string }>;
  allPoints: Array<Record<string, string>>;
  defaultGameId: string;
  onOpenPlayer: (s: PlayerStat) => void;
}) {
  const [selectedGameId, setSelectedGameId] = useState(defaultGameId || "all");
  const [dayFilter, setDayFilter] = useState<"all" | "1" | "2">("all");
  const [view, setView] = useState<"team" | "players" | "setplays" | "points">("team");
  const [statsCache, setStatsCache] = useState<Record<string, PlayerStat[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = selectedGameId;
    if (statsCache[key]) return;
    setLoading(true);
    const url = key === "all" ? "/api/player-stats" : `/api/player-stats?gameId=${key}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setStatsCache((prev) => ({ ...prev, [key]: Array.isArray(data) ? data : [] }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedGameId]); // eslint-disable-line react-hooks/exhaustive-deps

  const playerStats = statsCache[selectedGameId] || [];

  const gamePoints = useMemo(() => {
    const pts = selectedGameId === "all"
      ? allPoints
      : allPoints.filter((p) => (p.GameID || "") === selectedGameId);
    if (dayFilter === "all") return pts;
    return pts.filter((p) => {
      const gameDay = (p.GameDay || "").trim();
      return gameDay ? gameDay === dayFilter : dayFilter === "1";
    });
  }, [allPoints, selectedGameId, dayFilter]);

  const filteredStats = useMemo<PlayerStat[]>(() => {
    if (dayFilter === "all") return playerStats;
    return playerStats.map((p) => {
      const d = dayFilter === "1" ? p.day1 : p.day2;
      const scorable = d.holds + d.conceded;
      const holdRate   = scorable > 0  ? Math.round((d.holds  / scorable)  * 100) : 0;
      const breakRate  = d.dPoints > 0 ? Math.round((d.breaks / d.dPoints) * 100) : 0;
      const oHoldRate  = d.oPoints > 0 ? Math.round((d.holds  / d.oPoints) * 100) : 0;
      const dBreakRate = d.dPoints > 0 ? Math.round((d.breaks / d.dPoints) * 100) : 0;
      const avgDur     = d.totalPoints > 0 ? Math.round(d.totalSeconds / d.totalPoints) : 0;
      return {
        ...p,
        totalPoints: d.totalPoints, totalSeconds: d.totalSeconds,
        totalMinutes: Number((d.totalSeconds / 60).toFixed(1)),
        oPoints: d.oPoints, dPoints: d.dPoints,
        holds: d.holds, breaks: d.breaks, conceded: d.conceded,
        holdRate, breakRate, oHoldRate, dBreakRate, avgPointDuration: avgDur,
        recentPoints: p.recentPoints.filter((rp) => String(rp.day) === dayFilter),
      };
    });
  }, [playerStats, dayFilter]);

  const team = useMemo(() => {
    const sum = { pts: 0, holds: 0, breaks: 0, conceded: 0, oPts: 0, dPts: 0 };
    for (const p of filteredStats) {
      sum.pts += p.totalPoints; sum.holds += p.holds; sum.breaks += p.breaks;
      sum.conceded += p.conceded; sum.oPts += p.oPoints; sum.dPts += p.dPoints;
    }
    const div = (n: number) => Math.round(n / 7);
    const t = { pts: div(sum.pts), holds: div(sum.holds), breaks: div(sum.breaks), conceded: div(sum.conceded), oPts: div(sum.oPts), dPts: div(sum.dPts) };
    const scorable = t.holds + t.conceded;
    return { ...t, holdRate: scorable > 0 ? Math.round((t.holds / scorable) * 100) : 0, breakRate: t.dPts > 0 ? Math.round((t.breaks / t.dPts) * 100) : 0 };
  }, [filteredStats]);

  const setPlayStats = useMemo(() => {
    const map: Record<string, { total: number; success: number }> = {};
    for (const p of filteredStats) {
      for (const rp of p.recentPoints) {
        if (!rp.setPlay) continue;
        if (!map[rp.setPlay]) map[rp.setPlay] = { total: 0, success: 0 };
        map[rp.setPlay].total += 1;
        if (rp.setPlaySuccess === "yes") map[rp.setPlay].success += 1;
      }
    }
    return Object.entries(map).map(([name, v]) => ({
      name, total: Math.round(v.total / 7), success: Math.round(v.success / 7),
      rate: v.total > 0 ? Math.round((v.success / v.total) * 100) : 0,
    }));
  }, [filteredStats]);

  const subTabs: { id: typeof view; label: string }[] = [
    { id: "team",     label: "🏆 Team" },
    { id: "players",  label: "👤 Players" },
    { id: "setplays", label: "🎯 Plays" },
    { id: "points",   label: "📋 Points" },
  ];

  return (
    <div>
      {/* Game selector */}
      <div style={{ ...card, padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 8, letterSpacing: "0.05em" }}>GAME</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => { setSelectedGameId("all"); setStatsCache({}); }} style={{
            padding: "6px 12px", borderRadius: 8, border: "1.5px solid",
            borderColor: selectedGameId === "all" ? "#111827" : "#e5e7eb",
            background: selectedGameId === "all" ? "#111827" : "#f9fafb",
            color: selectedGameId === "all" ? "#fff" : "#374151",
            fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>All Games</button>
          {allGames.filter((g) => g.GameID).map((g) => {
            const active = selectedGameId === g.GameID;
            const isCompleted = (g.Status || "").toLowerCase() === "completed";
            return (
              <button key={g.GameID} onClick={() => { setSelectedGameId(g.GameID); setStatsCache({}); }} style={{
                padding: "6px 12px", borderRadius: 8, border: "1.5px solid",
                borderColor: active ? "#2563eb" : "#e5e7eb",
                background: active ? "#2563eb" : "#f9fafb",
                color: active ? "#fff" : "#374151",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                opacity: isCompleted ? 0.8 : 1,
              }}>
                {g.Name}{g.Opponent ? ` vs ${g.Opponent}` : ""}{isCompleted ? ` · ${g.ScoreUs}–${g.ScoreThem}` : ""}
              </button>
            );
          })}
        </div>

        {/* Day filter */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {(["all", "1", "2"] as const).map((d) => (
            <button key={d} onClick={() => setDayFilter(d)} style={{
              padding: "4px 12px", borderRadius: 6, border: "1.5px solid",
              borderColor: dayFilter === d ? "#7c3aed" : "#e5e7eb",
              background: dayFilter === d ? "#ede9fe" : "#f9fafb",
              color: dayFilter === d ? "#5b21b6" : "#6b7280",
              fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>{d === "all" ? "All Days" : `Day ${d}`}</button>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            padding: "7px 12px", borderRadius: 8, border: "none", whiteSpace: "nowrap",
            background: view === t.id ? "#111827" : "#e5e7eb",
            color: view === t.id ? "#fff" : "#374151",
            fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", color: "#6b7280", padding: 24 }}>Loading stats…</div>}

      {!loading && view === "team" && (
        <div>
          <div style={statGrid}>
            <StatBox label="Total Pts" value={team.pts} />
            <StatBox label="Hold%"     value={`${team.holdRate}%`}  color="#16a34a" />
            <StatBox label="Break%"    value={`${team.breakRate}%`} color="#2563eb" />
            <StatBox label="Holds"     value={team.holds}    color="#16a34a" />
            <StatBox label="Breaks"    value={team.breaks}   color="#2563eb" />
            <StatBox label="Conceded"  value={team.conceded} color="#dc2626" />
          </div>
          {dayFilter === "all" && playerStats.length > 0 && (() => {
            const sumDay = (key: "day1" | "day2") => {
              const s = { pts: 0, holds: 0, breaks: 0, conceded: 0, dPts: 0 };
              for (const p of playerStats) {
                s.pts += p[key].totalPoints; s.holds += p[key].holds;
                s.breaks += p[key].breaks; s.conceded += p[key].conceded; s.dPts += p[key].dPoints;
              }
              const div = (n: number) => Math.round(n / 7);
              const t = { pts: div(s.pts), holds: div(s.holds), breaks: div(s.breaks), conceded: div(s.conceded), dPts: div(s.dPts) };
              const sc = t.holds + t.conceded;
              return { ...t, holdRate: sc > 0 ? Math.round((t.holds / sc) * 100) : 0, breakRate: t.dPts > 0 ? Math.round((t.breaks / t.dPts) * 100) : 0 };
            };
            const d1 = sumDay("day1"); const d2 = sumDay("day2");
            if (d1.pts === 0 && d2.pts === 0) return null;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                {([["Day 1", d1, "#eff6ff", "#bfdbfe", "#1d4ed8"], ["Day 2", d2, "#fefce8", "#fde68a", "#92400e"]] as const).map(([label, s, bg, border, col]) => (
                  <div key={label} style={{ ...card, background: bg, border: `1px solid ${border}` }}>
                    <div style={{ fontWeight: 700, color: col, marginBottom: 8 }}>{label} — {s.pts} pts</div>
                    <div style={{ fontSize: 13, lineHeight: 2 }}>
                      <div style={{ color: "#16a34a" }}>Hold {s.holdRate}% ({s.holds}/{s.holds + s.conceded})</div>
                      <div style={{ color: "#2563eb" }}>Break {s.breakRate}% ({s.breaks}/{s.dPts})</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {!loading && view === "players" && (
        <SortableStatsTable playerStats={filteredStats} onOpenPlayer={onOpenPlayer} />
      )}

      {!loading && view === "setplays" && (
        setPlayStats.length === 0 ? (
          <div style={{ color: "#6b7280", textAlign: "center", padding: 32, fontSize: 14 }}>No set plays recorded yet.</div>
        ) : (
          setPlayStats.map((sp) => (
            <div key={sp.name} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", flex: 1 }}>🎯 {sp.name}</span>
              <span style={{ color: "#6b7280", fontSize: 13 }}>{sp.success}/{sp.total} runs</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: sp.rate >= 70 ? "#16a34a" : sp.rate >= 50 ? "#d97706" : "#dc2626" }}>{sp.rate}%</span>
            </div>
          ))
        )
      )}

      {!loading && view === "points" && (
        gamePoints.length === 0 ? (
          <div style={{ ...card, color: "#6b7280", textAlign: "center", padding: 32 }}>No points for this selection.</div>
        ) : (
          [...gamePoints].sort((a, b) => Number(b.PointNumber || 0) - Number(a.PointNumber || 0)).map((pt) => {
            const res = (pt.Result || "").toLowerCase();
            const dur = Number(pt.DurationSec || 0);
            return (
              <div key={pt.PointID || pt.PointNumber} style={{ ...card, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, color: "#111827", minWidth: 32 }}>#{pt.PointNumber}</span>
                  <span style={{ fontWeight: 700, fontSize: 11, padding: "2px 7px", borderRadius: 999, background: pt.LineType === "O" ? "#dbeafe" : "#fce7f3", color: pt.LineType === "O" ? "#1e40af" : "#9d174d" }}>{pt.LineType}</span>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>{pt.PossessionType}</span>
                  {pt.SetPlay && <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>🎯 {pt.SetPlay}{pt.SetPlaySuccess === "yes" ? " ✅" : pt.SetPlaySuccess === "no" ? " ❌" : ""}</span>}
                  <span style={{ marginLeft: "auto", fontWeight: 700, color: resultColor(res) }}>{resultEmoji(res)} {pt.Result || "—"}</span>
                  {dur > 0 && <span style={{ color: "#9ca3af", fontSize: 12 }}>{fmtTime(dur)}</span>}
                </div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{pt.PlayersCSV}</div>
                {pt.Notes && <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>"{pt.Notes}"</div>}
              </div>
            );
          })
        )
      )}
    </div>
  );
}

// ─── Games Tab ────────────────────────────────────────────────────────────────

function GamesTab({ data, onRefresh, onSwitchToGame }: {
  data: DashboardData; onRefresh: () => void;
  onSwitchToGame: (gameId: string) => void;
}) {
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tournament, setTournament] = useState("");
  const [loading, setLoading] = useState(false);

  async function createGame() {
    if (!name.trim()) return alert("Enter a game name.");
    setLoading(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, opponent, date, tournament }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setName(""); setOpponent("");
      await onRefresh();
      onSwitchToGame(json.gameId); // auto-navigate to Line tab for new game
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function switchGame(gameId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/games/switch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await onRefresh();
      onSwitchToGame(gameId); // navigate to Line tab
    } catch (err) { alert(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {/* Create new game */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>➕ New Game</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={fieldLabel}>Game Name *</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Day 1 Pool A" style={inputStyle} />
          </div>
          <div>
            <div style={fieldLabel}>Opponent</div>
            <input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Melbourne Mojo" style={inputStyle} />
          </div>
          <div>
            <div style={fieldLabel}>Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={fieldLabel}>Tournament</div>
            <input value={tournament} onChange={(e) => setTournament(e.target.value)} placeholder="e.g. AUC 2025" style={inputStyle} />
          </div>
        </div>
        <button onClick={createGame} disabled={loading} style={{ ...primaryBtn, marginTop: 12 }}>
          ➕ Create & Start Game
        </button>
      </div>

      {/* Game list */}
      <div style={{ fontWeight: 700, fontSize: 12, color: "#9ca3af", marginBottom: 8, letterSpacing: "0.05em" }}>ALL GAMES</div>
      {data.games.length === 0 ? (
        <div style={{ color: "#9ca3af", textAlign: "center", padding: 32, fontSize: 14 }}>
          No games yet — create one above to get started.
        </div>
      ) : (
        [...data.games].reverse().map((g) => {
          const isActive = g.GameID === data.config.current_game_id;
          const isCompleted = (g.Status || "").toLowerCase() === "completed";
          const scoreUs    = Number(g.ScoreUs || 0);
          const scoreThem  = Number(g.ScoreThem || 0);
          const outcome = isCompleted
            ? (scoreUs > scoreThem ? "🏆 Win" : scoreUs < scoreThem ? "💔 Loss" : "🤝 Draw")
            : null;
          return (
            <div key={g.GameID} style={{
              ...card, padding: "14px 16px", marginBottom: 8,
              border: isActive ? "2px solid #111827" : "1px solid #e5e7eb",
              background: isActive ? "#f8fafc" : "#fff",
              opacity: isCompleted && !isActive ? 0.85 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: 15, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {isActive && <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 7px", borderRadius: 999 }}>● ACTIVE</span>}
                    {isCompleted && <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "2px 7px", borderRadius: 999 }}>✓ Done</span>}
                    {g.Name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                    {g.Opponent && `vs ${g.Opponent}  ·  `}{g.Date}{g.Tournament ? `  ·  ${g.Tournament}` : ""}
                  </div>
                  {isActive && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 6 }}>
                      {data.config.score_us || 0} – {data.config.score_them || 0}
                      <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
                        Point #{data.config.current_point_number || 1}
                      </span>
                    </div>
                  )}
                  {isCompleted && (
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 6 }}>
                      <span style={{ color: scoreUs > scoreThem ? "#15803d" : scoreUs < scoreThem ? "#b91c1c" : "#374151" }}>
                        {outcome}
                      </span>
                      <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
                        {scoreUs} – {scoreThem}
                      </span>
                    </div>
                  )}
                </div>
                {isActive ? (
                  <button onClick={() => onSwitchToGame(g.GameID)} style={{ ...primaryBtn, fontSize: 13, padding: "8px 14px" }}>
                    🏃 Play →
                  </button>
                ) : !isCompleted ? (
                  <button onClick={() => switchGame(g.GameID)} disabled={loading} style={{ ...ghostBtn, fontSize: 12, padding: "6px 12px" }}>
                    Switch →
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [tab, setTab] = useState("games");
  const [openPlayer, setOpenPlayer] = useState<PlayerStat | null>(null);

  async function load() {
    const [d, s] = await Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/player-stats").then((r) => r.json()),
    ]);
    setData(d);
    setPlayerStats(Array.isArray(s) ? s : []);
  }

  useEffect(() => {
    load().catch((e) => alert(e.message));
  }, []);

  if (!data) return <main style={pageStyle}><div style={{ textAlign: "center", paddingTop: 60, color: "#6b7280" }}>Loading…</div></main>;

  return (
    <main style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>🏃 Line Caller</h1>
        {data.currentGame && tab !== "games" && (
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, maxWidth: 160, textAlign: "right", lineHeight: 1.3 }}>
            {data.currentGame.Name}
            {data.currentGame.Opponent ? ` vs ${data.currentGame.Opponent}` : ""}
          </span>
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />

      {openPlayer && (
        <PlayerModal stat={openPlayer} onClose={() => setOpenPlayer(null)}
          onSaveNotes={async (name, notes) => {
            await fetch("/api/update-player", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, notes }) });
            await load();
          }} />
      )}

      {tab === "games" && (
        <GamesTab
          data={data}
          onRefresh={load}
          onSwitchToGame={async (gameId) => {
            // If it's already the active game, just go to Line tab; otherwise switch first
            if (gameId !== data.config.current_game_id) {
              await fetch("/api/games/switch", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId }),
              });
              await load();
            }
            setTab("game");
          }}
        />
      )}
      {tab === "game"   && <GameTab data={data} playerStats={playerStats} onRefresh={load} onEndGame={() => setTab("games")} />}
      {tab === "stats"  && <StatsTab allGames={data.games} allPoints={data.latestPoints} defaultGameId={data.config.current_game_id || ""} onOpenPlayer={setOpenPlayer} />}
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 720, margin: "0 auto", padding: "14px 14px 40px",
  fontFamily: "system-ui, -apple-system, Arial, sans-serif",
  background: "#f3f4f6", minHeight: "100vh", color: "#111827",
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "14px 16px",
  border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 10,
};
const label: React.CSSProperties = { color: "#9ca3af", fontSize: 11, fontWeight: 600, marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const fieldLabel: React.CSSProperties = { color: "#374151", fontSize: 13, fontWeight: 600, marginBottom: 5 };
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.04em" };
const inputStyle: React.CSSProperties = { padding: "8px 11px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#111827", fontSize: 14, width: "100%", boxSizing: "border-box" as const };
const chipWrap: React.CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap" as const };
const selectedChip: React.CSSProperties = { padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontWeight: 600, fontSize: 13, border: "1.5px solid #86efac", background: "#dcfce7", color: "#166534" };
const emptyChip: React.CSSProperties = { padding: "7px 13px", borderRadius: 999, background: "#f3f4f6", color: "#9ca3af", border: "1px dashed #d1d5db", fontSize: 13 };
const primaryBtn: React.CSSProperties = { padding: "9px 15px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 };
const dangerBtn: React.CSSProperties = { ...primaryBtn, background: "#dc2626" };
const ghostBtn: React.CSSProperties = { ...primaryBtn, background: "#e5e7eb", color: "#111827" };
const thTd: React.CSSProperties = { padding: "9px 8px", color: "#111827", fontSize: 13, textAlign: "left" as const, verticalAlign: "middle" as const };
const roleBadge: React.CSSProperties = { display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700 };
const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 };
const modalBox: React.CSSProperties = { background: "#fff", borderRadius: 18, padding: 20, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" };
const closeBtn: React.CSSProperties = { background: "#f3f4f6", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, color: "#374151", flexShrink: 0 };
const statGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))", gap: 7, marginBottom: 12 };
