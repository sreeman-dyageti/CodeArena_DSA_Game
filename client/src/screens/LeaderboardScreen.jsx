import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/index.js";
import { useAuth } from "../hooks/useAuth.jsx";

function msUntilNextMonday() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  next.setHours(0, 0, 0, 0);
  return next - now;
}

function fmtCountdown(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(msUntilNextMonday());

  useEffect(() => {
    api.get("/api/leaderboard/weekly")
      .then(({ data }) => setRows(data.leaderboard || []))
      .catch(err => console.error("leaderboard fetch", err))
      .finally(() => setLoading(false));
  }, []);

  // Countdown tick
  useEffect(() => {
    const t = setInterval(() => setCountdown(msUntilNextMonday()), 60_000);
    return () => clearInterval(t);
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd
  const podiumHeights = [72, 100, 56];
  const podiumColors = [
    "linear-gradient(135deg,#BDBDBD,#9E9E9E)",
    "linear-gradient(135deg,#FFD700,#FFA500)",
    "linear-gradient(135deg,#CD7F32,#A0522D)",
  ];
  const podiumShadows = ["0 -5px 0 #757575", "0 -7px 0 #CC8800,0 0 30px rgba(255,215,0,.4)", "0 -5px 0 #7B3F00"];
  const medalEmoji = ["🥈","🥇","🥉"];
  const podiumRanks = [2, 1, 3];

  return (
    <div style={{ ...bg, display:"flex", flexDirection:"column", height:"100vh" }}>

      {/* Header */}
      <div style={s.header}>
        <button onClick={() => navigate("/")} style={s.backBtn}>←</button>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={s.headerTitle}>🏆 Weekly Leaderboard</div>
          <div style={s.headerSub}>🕐 Resets in {fmtCountdown(countdown)}</div>
        </div>
        <div style={{ width:40 }} />
      </div>

      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:14, fontWeight:700 }}>Loading...</div>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div style={s.podiumWrap}>
              <div style={s.podiumRow}>
                {podiumOrder.map((entry, i) => (
                  <div key={entry?.user_id || i} style={{ textAlign:"center" }}>
                    <div style={{ fontSize: i===1 ? 28 : 24, marginBottom: 2 }}>
                      {entry?.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    {i === 1 && <div style={{ fontSize:20, marginBottom:2, filter:"drop-shadow(0 2px 6px rgba(255,215,0,.8))" }}>👑</div>}
                    <div style={{ ...s.podiumBlock, height: podiumHeights[i], width: i===1 ? 90 : 80, background: podiumColors[i], boxShadow: podiumShadows[i] }}>
                      <div style={s.podiumRank}>{podiumRanks[i]}</div>
                      <div style={s.podiumName}>{entry?.username ?? "—"}</div>
                      <div style={s.podiumCredits}>{entry?.credits_weekly ?? 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full list */}
          <div style={s.listWrap}>
            {rows.length === 0 && (
              <div style={s.emptyState}>
                No battles yet this week. Be the first to earn credits! ⚔️
              </div>
            )}
            {rows.map((row, i) => {
              const isMe = row.user_id === user?.id;
              return (
                <div key={row.user_id} style={{ ...s.listRow, background: isMe ? "rgba(255,107,157,.1)" : "rgba(255,255,255,.04)", border: `${isMe ? "1.5px" : "1px"} solid ${isMe ? "rgba(255,107,157,.35)" : "rgba(255,255,255,.06)"}` }}>
                  {/* Rank */}
                  <div style={{ ...s.rankBadge, background: i<3 ? [podiumColors[0],podiumColors[1],podiumColors[2]][i] : "rgba(255,255,255,.1)" }}>
                    {i < 3 ? ["🥈","🥇","🥉"][i] : i + 1}
                  </div>
                  {/* Avatar initial */}
                  <div style={{ ...s.avatar, background: isMe ? "linear-gradient(135deg,#FF6B9D,#C850C0)" : "rgba(255,255,255,.1)" }}>
                    {row.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  {/* Name + streak */}
                  <div style={{ flex:1 }}>
                    <div style={{ color: isMe ? "#FF6B9D" : "#fff", fontWeight:900, fontSize:13 }}>
                      {row.username}{isMe ? " (You)" : ""}
                    </div>
                    <div style={{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700 }}>
                      ⚡ {row.elo ?? 1000} ELO
                    </div>
                  </div>
                  {/* Credits */}
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:"#FDCB6E", fontSize:18 }}>
                      {row.credits_weekly ?? 0}
                    </div>
                    <div style={{ color:"rgba(255,255,255,.35)", fontSize:10, fontWeight:800 }}>credits</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
      `}</style>
    </div>
  );
}

const bg = { background:"linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)", fontFamily:"'Nunito',sans-serif", color:"#fff" };

const s = {
  header:{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12, background:"rgba(0,0,0,.3)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 },
  backBtn:{ background:"none", border:"none", color:"rgba(255,255,255,.65)", cursor:"pointer", fontSize:20, padding:"4px 8px" },
  headerTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:"#fff", letterSpacing:1 },
  headerSub:{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 },
  podiumWrap:{ padding:"18px 16px 12px", background:"rgba(0,0,0,.1)", flexShrink:0 },
  podiumRow:{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:10 },
  podiumBlock:{ borderRadius:"14px 14px 0 0", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
  podiumRank:{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#fff" },
  podiumName:{ fontSize:10, color:"rgba(255,255,255,.85)", fontWeight:800, marginTop:1 },
  podiumCredits:{ fontSize:12, color:"#fff", fontWeight:900 },
  listWrap:{ flex:1, overflowY:"auto", padding:"8px 16px 20px" },
  listRow:{ borderRadius:16, padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12 },
  rankBadge:{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Fredoka One',cursive", fontSize:13, color:"#fff", flexShrink:0 },
  avatar:{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, flexShrink:0 },
  emptyState:{ textAlign:"center", color:"rgba(255,255,255,.4)", fontSize:14, fontWeight:700, paddingTop:40 },
};
