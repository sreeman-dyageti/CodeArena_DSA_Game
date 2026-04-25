import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/index.js";

// Fixed node positions for the candy-crush winding path (15 nodes)
const NODE_POSITIONS = [
  { cx: 180, cy: 680 }, // 1  Arrays
  { cx: 280, cy: 600 }, // 2
  { cx: 100, cy: 520 }, // 3
  { cx: 260, cy: 440 }, // 4
  { cx: 120, cy: 360 }, // 5
  { cx: 270, cy: 290 }, // 6  Two Pointers
  { cx: 100, cy: 220 }, // 7
  { cx: 260, cy: 155 }, // 8
  { cx: 120, cy: 90  }, // 9
  { cx: 260, cy: 30  }, // 10
  { cx: 100, cy: -30 }, // 11 Sliding Window
  { cx: 260, cy: -95 }, // 12
  { cx: 100, cy: -160},// 13
  { cx: 260, cy: -225},// 14
  { cx: 180, cy: -290},// 15 BOSS
];

const TOPIC_COLORS = {
  "Arrays":        { color: "#FF6B9D", shadow: "#A8235A" },
  "Two Pointers":  { color: "#FF9F43", shadow: "#CC7213" },
  "Sliding Window":{ color: "#00CEC9", shadow: "#007B79" },
};

const BOSS_COLOR = { color: "#E17055", shadow: "#9B3E2A" };

const NR = 36; // node radius
const W  = 360;

export default function MapScreen() {
  const navigate = useNavigate();
  const { track } = useParams();

  const [levels, setLevels]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  // For MVP: unlock first 3, rest locked (will use real progress in Phase 2)
  const [unlockedUpTo] = useState(3);

  useEffect(() => {
    api.get("/api/levels")
      .then(({ data }) => setLevels(data.levels || []))
      .catch(() => setError("Failed to load levels"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ ...bg, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ color:"rgba(255,255,255,.6)", fontSize:16, fontWeight:700 }}>Loading map...</div>
    </div>
  );

  if (error) return (
    <div style={{ ...bg, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ color:"#FF6B81", fontSize:15 }}>{error}</div>
    </div>
  );

  // Total map height based on number of levels
  const mapH = Math.max(720, levels.length * 70 + 100);
  // Shift all positions down so they start from bottom
  const shift = mapH - 720;
  const positions = NODE_POSITIONS.map(p => ({ cx: p.cx, cy: p.cy + shift }));

  // Build SVG path segments between nodes
  const pathSegments = positions.map((pos, i) => {
    if (i === 0) return null;
    const p = positions[i - 1];
    const mx = (p.cx + pos.cx) / 2;
    const my = (p.cy + pos.cy) / 2;
    return { d: `M${p.cx} ${p.cy} Q${mx} ${my} ${pos.cx} ${pos.cy}`, done: i < unlockedUpTo };
  }).filter(Boolean);

  return (
    <div style={{ ...bg, display:"flex", flexDirection:"column", height:"100vh" }}>

      {/* Top bar */}
      <div style={styles.topBar}>
        <button onClick={() => navigate("/")} style={styles.backBtn}>←</button>
        <div style={{ textAlign:"center" }}>
          <div style={styles.topTitle}>
            {track === "dsa" ? "🧠 DSA Arena" : "📐 Aptitude Arena"}
          </div>
          <div style={styles.topSub}>
            {levels.length} levels · {unlockedUpTo} unlocked
          </div>
        </div>
        <button onClick={() => navigate("/leaderboard")} style={styles.backBtn}>🏆</button>
      </div>

      {/* Progress bar */}
      <div style={styles.progressWrap}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={styles.progressLabel}>PROGRESS</span>
          <span style={styles.progressVal}>{unlockedUpTo - 1} / {levels.length} completed</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${((unlockedUpTo - 1) / Math.max(levels.length, 1)) * 100}%` }} />
        </div>
      </div>

      {/* Scrollable map */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        <div style={{ position:"relative", width:W, height:mapH, margin:"0 auto" }}>

          {/* Blobs */}
          <div style={{ position:"absolute", top:200, left:40, width:100, height:100, borderRadius:"50%", background:"rgba(162,155,254,.06)", filter:"blur(20px)", pointerEvents:"none" }} />

          {/* SVG paths */}
          <svg style={{ position:"absolute", top:0, left:0, width:W, height:mapH, pointerEvents:"none" }}
            viewBox={`0 0 ${W} ${mapH}`}>
            {pathSegments.map((seg, i) => (
              <g key={i}>
                <path d={seg.d} stroke="rgba(255,255,255,.07)" strokeWidth={5} fill="none" strokeDasharray="10 8" />
                {seg.done && <path d={seg.d} stroke="rgba(255,215,0,.28)" strokeWidth={5} fill="none" strokeDasharray="10 8" />}
              </g>
            ))}
          </svg>

          {/* Nodes */}
          {levels.map((lv, i) => {
            const pos     = positions[i] || { cx: 180, cy: 100 };
            const locked  = i >= unlockedUpTo;
            const current = i === unlockedUpTo - 1;
            const done    = i < unlockedUpTo - 1;
            const isBoss  = i === levels.length - 1;
            const themeKey = Object.keys(TOPIC_COLORS).find(k => lv.topic.includes(k.split(" ")[0]));
            const theme   = isBoss ? BOSS_COLOR : (TOPIC_COLORS[themeKey] || { color:"#A29BFE", shadow:"#5549CC" });

            return (
              <div key={lv.id} style={{ position:"absolute", left: pos.cx - NR, top: pos.cy - NR, width: NR*2, height: NR*2, zIndex: current ? 5 : 3 }}>

                {/* Glow ring for current node */}
                {current && (
                  <div style={{ position:"absolute", inset:-10, borderRadius:"50%", border:`2.5px solid ${theme.color}`, boxShadow:`0 0 18px ${theme.color}66`, pointerEvents:"none", animation:"glowPulse 2s ease-in-out infinite" }} />
                )}

                {/* Boss crown */}
                {isBoss && !locked && (
                  <div style={{ position:"absolute", top:-24, left:"50%", transform:"translateX(-50%)", fontSize:18 }}>👑</div>
                )}

                <button
                  disabled={locked}
                  onClick={() => !locked && navigate(`/learn/${lv.id}`)}
                  style={{
                    width:"100%", height:"100%", borderRadius:"50%", border: current ? "2px solid rgba(255,255,255,.4)" : "none",
                    background: locked
                      ? "linear-gradient(135deg,#2E2850 0%,#1C1840 100%)"
                      : `radial-gradient(circle at 32% 30%,${theme.color} 0%,${theme.shadow} 100%)`,
                    boxShadow: locked
                      ? "0 6px 0 rgba(0,0,0,.5)"
                      : `0 7px 0 ${theme.shadow},0 10px 22px ${theme.color}44,inset 0 2px 0 rgba(255,255,255,.25)`,
                    cursor: locked ? "not-allowed" : "pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    position:"relative", overflow:"hidden",
                    animation: current ? "nodeBounce 1.8s ease-in-out infinite" : "none",
                    transition:"transform .2s",
                  }}
                  onMouseEnter={e => { if(!locked) e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {/* Gloss */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"48%", background:"rgba(255,255,255,.15)", borderRadius:"50% 50% 0 0", pointerEvents:"none" }} />
                  {locked
                    ? <span style={{ fontSize:20, opacity:.45 }}>🔒</span>
                    : <span style={{ fontSize: isBoss ? 28 : 20, filter:`drop-shadow(0 2px 4px ${theme.shadow})` }}>
                        {isBoss ? "⚡" : lv.order_num}
                      </span>
                  }
                </button>

                {/* Stars for completed */}
                {done && (
                  <div style={{ position:"absolute", bottom:-20, left:"50%", transform:"translateX(-50%)", display:"flex", gap:1 }}>
                    {[1,2,3].map(s => <span key={s} style={{ fontSize:10, opacity: s <= 2 ? 1 : .2 }}>⭐</span>)}
                  </div>
                )}

                {/* Label below node */}
                <div style={{ position:"absolute", top: done ? 86 : 78, left:"50%", transform:"translateX(-50%)", textAlign:"center", whiteSpace:"nowrap", pointerEvents:"none" }}>
                  <div style={{ fontSize:10, fontWeight:900, color: locked ? "rgba(255,255,255,.25)" : "#fff", textShadow: locked ? "none" : "0 1px 6px rgba(0,0,0,.7)", fontFamily:"'Nunito',sans-serif" }}>
                    {lv.topic}
                  </div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", fontWeight:700 }}>{lv.sub_topic}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap');
        @keyframes nodeBounce{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-18px) scale(1.1)}65%{transform:translateY(-7px) scale(1.05)}}
        @keyframes glowPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        *{box-sizing:border-box} body{margin:0}
      `}</style>
    </div>
  );
}

const bg = { background:"linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)", fontFamily:"'Nunito',sans-serif", color:"#fff" };

const styles = {
  topBar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 18px", background:"rgba(0,0,0,.3)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,.07)", zIndex:10, flexShrink:0 },
  backBtn:{ background:"none", border:"none", color:"rgba(255,255,255,.65)", cursor:"pointer", fontSize:20, padding:"4px 8px" },
  topTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:18, color:"#fff", letterSpacing:1 },
  topSub:{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 },
  progressWrap:{ padding:"10px 20px 4px", flexShrink:0 },
  progressLabel:{ color:"rgba(255,255,255,.45)", fontSize:11, fontWeight:800, letterSpacing:1 },
  progressVal:{ color:"#FDCB6E", fontSize:11, fontWeight:900 },
  progressTrack:{ background:"rgba(255,255,255,.09)", borderRadius:20, height:9, overflow:"hidden" },
  progressFill:{ height:"100%", borderRadius:20, background:"linear-gradient(90deg,#FF6B9D,#FF9F43,#FDCB6E)", boxShadow:"0 0 12px rgba(255,159,67,.6)", transition:"width .4s ease" },
};
