import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/index.js";

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };
const DIFF_COLOR = { easy:"#2ED573", medium:"#FDCB6E", hard:"#FF4757" };
const DIFF_SHADOW = { easy:"#1a8a47", medium:"#CC9A33", hard:"#A82030" };

const NODE_CONFIGS = [
  { cx:180, cy:580 },
  { cx:280, cy:460 },
  { cx:100, cy:350 },
  { cx:270, cy:240 },
  { cx:160, cy:120 },
];

const NR = 40;
const W  = 380;
const MAP_H = 680;

// Stars
const STARS = Array.from({ length: 20 }, () => ({
  w: 1 + Math.random() * 2,
  l: Math.random() * 100,
  t: Math.random() * 100,
  d: 2 + Math.random() * 3,
  dl: Math.random() * 4,
}));

export default function TopicScreen() {
  const { topicName } = useParams();
  const navigate = useNavigate();
  const topic = decodeURIComponent(topicName);

  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/levels")
      .then(({ data }) => {
        // Filter to this topic only, sort easy → medium → hard
        const filtered = (data.levels || [])
          .filter(lv => lv.topic === topic)
          .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
        setLevels(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [topic]);

  // For MVP: only level 1 unlocked
  const unlockedUpTo = 1;

  // SVG paths
  const paths = NODE_CONFIGS.map((pos, i) => {
    if (i === 0) return null;
    const p = NODE_CONFIGS[i - 1];
    const mx = (p.cx + pos.cx) / 2;
    const my = (p.cy + pos.cy) / 2;
    return { d: `M${p.cx} ${p.cy} Q${mx} ${my} ${pos.cx} ${pos.cy}`, done: i < unlockedUpTo };
  }).filter(Boolean);

  const topicIcon = { "Arrays":"🎯", "Two Pointers":"✌️", "Sliding Window":"🪟" }[topic] ?? "📘";
  const topicColor = { "Arrays":"#FF6B9D", "Two Pointers":"#FF9F43", "Sliding Window":"#00CEC9" }[topic] ?? "#A29BFE";

  return (
    <div style={{ ...bg, display:"flex", flexDirection:"column", height:"100vh" }}>
      {STARS.map((st, i) => (
        <div key={i} style={{ position:"absolute", borderRadius:"50%", width:st.w, height:st.w, background:"#fff", left:st.l+"%", top:st.t+"%", opacity:.1, animation:`twinkle ${st.d}s ease-in-out infinite ${st.dl}s`, pointerEvents:"none" }} />
      ))}

      {/* Top bar */}
      <div style={s.topBar}>
        <button onClick={() => navigate(-1)} style={s.backBtn}>←</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ ...s.topTitle, color: topicColor }}>{topicIcon} {topic}</div>
          <div style={s.topSub}>Easy → Medium → Hard · {levels.length} problems</div>
        </div>
        <button onClick={() => navigate("/leaderboard")} style={s.backBtn}>🏆</button>
      </div>

      {/* Progress */}
      <div style={s.progressWrap}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={s.progressLabel}>PROGRESS</span>
          <span style={{ color: topicColor, fontSize:11, fontWeight:900 }}>
            {unlockedUpTo - 1} / {levels.length} completed
          </span>
        </div>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width:`${((unlockedUpTo-1)/Math.max(levels.length,1))*100}%`, background:`linear-gradient(90deg,${topicColor},${topicColor}88)` }} />
        </div>
      </div>

      {/* Legend */}
      <div style={s.legend}>
        {["easy","medium","hard"].map(d => (
          <div key={d} style={s.legendItem}>
            <div style={{ width:8, height:8, borderRadius:"50%", background: DIFF_COLOR[d] }} />
            <span style={{ color:"rgba(255,255,255,.45)", fontSize:11, fontWeight:700 }}>{d}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:14, fontWeight:700 }}>Loading problems...</div>
        </div>
      ) : (
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ position:"relative", width:W, height:MAP_H, margin:"0 auto" }}>

            {/* SVG paths */}
            <svg style={{ position:"absolute", top:0, left:0, width:W, height:MAP_H, pointerEvents:"none" }}
              viewBox={`0 0 ${W} ${MAP_H}`}>
              {paths.map((p, i) => (
                <g key={i}>
                  <path d={p.d} stroke="rgba(255,255,255,.07)" strokeWidth={5} fill="none" strokeDasharray="10 8" />
                  {p.done && <path d={p.d} stroke={`${topicColor}44`} strokeWidth={5} fill="none" strokeDasharray="10 8" />}
                </g>
              ))}
            </svg>

            {/* Nodes */}
            {levels.map((lv, i) => {
              const pos     = NODE_CONFIGS[i] || { cx:180, cy:100 };
              const locked  = i >= unlockedUpTo;
              const current = i === unlockedUpTo - 1;
              const done    = i < unlockedUpTo - 1;
              const dColor  = DIFF_COLOR[lv.difficulty] ?? "#A29BFE";
              const dShadow = DIFF_SHADOW[lv.difficulty] ?? "#5549CC";

              return (
                <div key={lv.id} style={{ position:"absolute", left: pos.cx - NR, top: pos.cy - NR, width: NR*2, height: NR*2, zIndex: current ? 5 : 3 }}>

                  {/* Glow ring */}
                  {current && (
                    <div style={{ position:"absolute", inset:-10, borderRadius:"50%", border:`2.5px solid ${dColor}`, boxShadow:`0 0 20px ${dColor}66`, pointerEvents:"none", animation:"glowPulse 2s ease-in-out infinite" }} />
                  )}

                  <button
                    disabled={locked}
                    onClick={() => !locked && navigate(`/learn/${lv.id}`)}
                    style={{
                      width:"100%", height:"100%", borderRadius:"50%",
                      background: locked
                        ? "linear-gradient(135deg,#2E2850,#1C1840)"
                        : `radial-gradient(circle at 32% 30%,${dColor},${dShadow})`,
                      boxShadow: locked
                        ? "0 6px 0 rgba(0,0,0,.5)"
                        : `0 7px 0 ${dShadow},0 10px 22px ${dColor}44,inset 0 2px 0 rgba(255,255,255,.25)`,
                      border: current ? `2px solid rgba(255,255,255,.4)` : "none",
                      cursor: locked ? "not-allowed" : "pointer",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      position:"relative", overflow:"hidden",
                      animation: current ? "nodeBounce 1.8s ease-in-out infinite" : "none",
                      transition:"transform .15s",
                      padding:0,
                    }}
                    onMouseEnter={e => { if(!locked) e.currentTarget.style.transform="scale(1.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
                  >
                    {/* Gloss */}
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:"48%", background:"rgba(255,255,255,.15)", borderRadius:"50% 50% 0 0", pointerEvents:"none" }} />
                    {locked
                      ? <span style={{ fontSize:22, opacity:.4 }}>🔒</span>
                      : <span style={{ fontSize:22 }}>{i+1}</span>
                    }
                  </button>

                  {/* Stars for completed */}
                  {done && (
                    <div style={{ position:"absolute", bottom:-22, left:"50%", transform:"translateX(-50%)", display:"flex", gap:1 }}>
                      {[1,2,3].map(st => <span key={st} style={{ fontSize:10, opacity: st<=2?1:.2 }}>⭐</span>)}
                    </div>
                  )}

                  {/* Label */}
                  <div style={{ position:"absolute", top: done ? 92 : 84, left:"50%", transform:"translateX(-50%)", textAlign:"center", whiteSpace:"nowrap", pointerEvents:"none" }}>
                    <div style={{ ...s.nodeLabel, color: locked ? "rgba(255,255,255,.2)" : "#fff" }}>
                      {lv.sub_topic}
                    </div>
                    <div style={{ ...s.nodeDiff, color: locked ? "rgba(255,255,255,.15)" : dColor }}>
                      {lv.difficulty}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap');
        @keyframes twinkle{0%,100%{opacity:.06}50%{opacity:.35}}
        @keyframes nodeBounce{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-18px) scale(1.1)}65%{transform:translateY(-7px) scale(1.05)}}
        @keyframes glowPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        *{box-sizing:border-box} body{margin:0}
      `}</style>
    </div>
  );
}

const bg = { background:"linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)", fontFamily:"'Nunito',sans-serif", color:"#fff", position:"relative", overflow:"hidden" };

const s = {
  topBar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 18px", background:"rgba(0,0,0,.3)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,.07)", zIndex:10, flexShrink:0 },
  backBtn:{ background:"none", border:"none", color:"rgba(255,255,255,.65)", cursor:"pointer", fontSize:20, padding:"4px 8px" },
  topTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:18, letterSpacing:.5 },
  topSub:{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 },
  progressWrap:{ padding:"10px 20px 4px", flexShrink:0 },
  progressLabel:{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:800, letterSpacing:1 },
  progressTrack:{ background:"rgba(255,255,255,.08)", borderRadius:20, height:8, overflow:"hidden" },
  progressFill:{ height:"100%", borderRadius:20, boxShadow:"0 0 10px rgba(255,159,67,.5)", transition:"width .4s ease" },
  legend:{ display:"flex", gap:16, padding:"6px 20px 8px", flexShrink:0 },
  legendItem:{ display:"flex", alignItems:"center", gap:5 },
  nodeLabel:{ fontSize:10, fontWeight:900, textShadow:"0 1px 6px rgba(0,0,0,.8)" },
  nodeDiff:{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 },
};
