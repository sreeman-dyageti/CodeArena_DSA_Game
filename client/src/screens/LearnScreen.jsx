import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/index.js";

// Hardcoded YouTube links per topic for MVP
const VIDEOS = {
  "Arrays": [
    { title: "Arrays Full Introduction", channel: "NeetCode", dur: "12:34", url: "https://www.youtube.com/watch?v=QJNwK2uJyGs" },
    { title: "Arrays in DSA Explained", channel: "Abdul Bari", dur: "18:20", url: "https://www.youtube.com/watch?v=AT14lCXuMKI" },
    { title: "Top Array Problems", channel: "takeUforward", dur: "22:05", url: "https://www.youtube.com/watch?v=37E9ckMDdTk" },
  ],
  "Two Pointers": [
    { title: "Two Pointers Technique", channel: "NeetCode", dur: "10:14", url: "https://www.youtube.com/watch?v=On3r4I1p7mM" },
    { title: "Two Pointer Pattern Explained", channel: "takeUforward", dur: "15:30", url: "https://www.youtube.com/watch?v=jBiyd7v0XnI" },
    { title: "Two Pointers — All Problems", channel: "TechDose", dur: "20:00", url: "https://www.youtube.com/watch?v=VEPCm3BZers" },
  ],
  "Sliding Window": [
    { title: "Sliding Window Full Introduction", channel: "NeetCode", dur: "14:22", url: "https://www.youtube.com/watch?v=p-ss2JNynmw" },
    { title: "Sliding Window Explained Simply", channel: "Abdul Bari", dur: "18:20", url: "https://www.youtube.com/watch?v=MK-NZ4hN7rs" },
    { title: "Top 10 Sliding Window Problems", channel: "TechDose", dur: "22:05", url: "https://www.youtube.com/watch?v=GcW4mgmgSbw" },
  ],
};

const DEFAULT_VIDEOS = [
  { title: "DSA Full Course", channel: "Abdul Bari", dur: "20:00", url: "https://www.youtube.com/watch?v=0IAPZzGSbME" },
];

export default function LearnScreen() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("video");
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/levels/${levelId}`)
      .then(({ data }) => setLevel(data.level))
      .catch(() => setError("Failed to load level"))
      .finally(() => setLoading(false));
  }, [levelId]);

  if (loading) return (
    <div style={{ ...bg, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ color:"rgba(255,255,255,.6)", fontSize:15, fontWeight:700 }}>Loading level...</div>
    </div>
  );

  if (error || !level) return (
    <div style={{ ...bg, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", flexDirection:"column", gap:16 }}>
      <div style={{ color:"#FF6B81", fontSize:15 }}>{error || "Level not found"}</div>
      <button style={s.backBtn2} onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  const videos = VIDEOS[level.topic] || DEFAULT_VIDEOS;
  const diffColor = level.difficulty === "easy" ? "#2ED573" : level.difficulty === "hard" ? "#FF4757" : "#FDCB6E";

  return (
    <div style={{ ...bg, display:"flex", flexDirection:"column", height:"100vh" }}>

      {/* Header */}
      <div style={s.header}>
        <button onClick={() => navigate(-1)} style={s.backBtn}>←</button>
        <div style={{ flex:1 }}>
          <div style={s.headerTitle}>{level.topic} — {level.sub_topic}</div>
          <div style={s.headerSub}>Level {level.order_num} · {level.difficulty}</div>
        </div>
        <div style={{ ...s.xpBadge, background:`linear-gradient(135deg,${diffColor}33,transparent)`, border:`1px solid ${diffColor}55`, color: diffColor }}>
          +{level.difficulty === "easy" ? 100 : level.difficulty === "hard" ? 300 : 200} XP
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[
          { id:"video",   label:"📺 Watch" },
          { id:"concept", label:"📖 Concept" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...s.tabBtn, color: tab===t.id ? diffColor : "rgba(255,255,255,.35)", borderBottom: `2.5px solid ${tab===t.id ? diffColor : "transparent"}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>

        {/* ── VIDEO TAB ── */}
        {tab === "video" && (
          <div>
            <p style={s.sectionHint}>🎓 Watch these videos to understand the concept before battling:</p>
            {videos.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" style={s.videoCard}>
                <div style={s.videoThumb}>▶</div>
                <div style={{ flex:1 }}>
                  <div style={s.videoTitle}>{v.title}</div>
                  <div style={s.videoMeta}>{v.channel} · ⏱ {v.dur}</div>
                </div>
                <div style={{ fontSize:16, opacity:.5 }}>↗</div>
              </a>
            ))}

            {/* Enter battle CTA */}
            <div style={s.ctaBox}>
              <p style={s.ctaText}>✅ Watched enough? Test your skills in a real battle!</p>
              <button
                style={s.battleBtn}
                onClick={() => navigate(`/battle/${levelId}`, { state: { problem: level } })}
              >
                ⚔️ Enter Battle
              </button>
            </div>
          </div>
        )}

        {/* ── CONCEPT TAB ── */}
        {tab === "concept" && (
          <div>
            {/* Problem title */}
            <div style={s.problemHeader}>
              <span style={s.problemTitle}>
                {level.problem_statement.split(" ").slice(0, 8).join(" ")}...
              </span>
              <span style={{ ...s.diffBadge, color: diffColor, background:`${diffColor}18` }}>
                {level.difficulty}
              </span>
            </div>

            {/* Full problem */}
            <p style={s.problemText}>{level.problem_statement}</p>

            {/* Examples */}
            {Array.isArray(level.examples) && level.examples.length > 0 && (
              <>
                <div style={s.sectionLabel}>Examples</div>
                {level.examples.map((ex, i) => (
                  <div key={i} style={s.exBox}>
                    <div style={s.exRow}>
                      <span style={s.exLabel}>Input:</span>
                      <code style={s.exCode}>
                        {Array.isArray(ex.args)
                          ? ex.args.map(a => JSON.stringify(a)).join(", ")
                          : JSON.stringify(ex.input ?? "")}
                      </code>
                    </div>
                    <div style={s.exRow}>
                      <span style={s.exLabel}>Output:</span>
                      <code style={s.exCode}>{JSON.stringify(ex.expected ?? ex.output ?? "")}</code>
                    </div>
                    {ex.explanation && (
                      <div style={s.exExplanation}>{ex.explanation}</div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Constraints */}
            {level.constraints && (
              <>
                <div style={s.sectionLabel}>Constraints</div>
                <div style={s.constraintBox}>
                  {level.constraints.split("|").map((c, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>• {c.trim()}</div>
                  ))}
                </div>
              </>
            )}

            {/* Starter code */}
            {level.starter_code && (
              <>
                <div style={s.sectionLabel}>Starter Code</div>
                <pre style={s.codeBlock}>{level.starter_code}</pre>
              </>
            )}

            {/* Enter battle */}
            <div style={s.ctaBox}>
              <p style={s.ctaText}>Ready to solve this in a live battle?</p>
              <button
                style={s.battleBtn}
                onClick={() => navigate(`/battle/${levelId}`, { state: { problem: level } })}
              >
                ⚔️ Enter Battle
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        a { text-decoration: none; }
      `}</style>
    </div>
  );
}

const bg = { background:"linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)", fontFamily:"'Nunito',sans-serif", color:"#fff" };

const s = {
  header:{ padding:"12px 18px", display:"flex", alignItems:"center", gap:12, background:"rgba(0,0,0,.35)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 },
  backBtn:{ background:"none", border:"none", color:"rgba(255,255,255,.65)", cursor:"pointer", fontSize:20, padding:"4px 8px" },
  backBtn2:{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.18)", borderRadius:12, padding:"10px 22px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" },
  headerTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:17, color:"#fff", letterSpacing:.5 },
  headerSub:{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 },
  xpBadge:{ borderRadius:12, padding:"5px 12px", fontSize:12, fontWeight:900, flexShrink:0 },
  tabRow:{ display:"flex", background:"rgba(0,0,0,.22)", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0 },
  tabBtn:{ flex:1, padding:"11px 6px", border:"none", background:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, marginBottom:-1 },
  content:{ flex:1, overflowY:"auto", padding:"16px 18px" },
  sectionHint:{ color:"rgba(255,255,255,.55)", fontSize:13, fontWeight:700, marginBottom:14 },
  videoCard:{ display:"flex", alignItems:"center", gap:12, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:"12px 14px", marginBottom:10, cursor:"pointer", transition:"background .2s", color:"#fff" },
  videoThumb:{ width:50, height:38, borderRadius:10, background:"linear-gradient(135deg,#FF6B9D,#C850C0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 },
  videoTitle:{ color:"#fff", fontWeight:800, fontSize:13, marginBottom:2 },
  videoMeta:{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:700 },
  ctaBox:{ background:"rgba(255,107,157,.07)", border:"1.5px solid rgba(255,107,157,.25)", borderRadius:20, padding:"18px 20px", marginTop:16, textAlign:"center" },
  ctaText:{ color:"rgba(255,255,255,.7)", fontSize:13, fontWeight:700, marginBottom:14 },
  battleBtn:{ background:"linear-gradient(135deg,#FF6B9D,#C850C0)", border:"none", borderRadius:20, padding:"14px 36px", fontFamily:"'Fredoka One',cursive", fontSize:20, color:"#fff", cursor:"pointer", boxShadow:"0 7px 0 #8B1A8B", letterSpacing:1 },
  problemHeader:{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" },
  problemTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:"#fff" },
  diffBadge:{ fontSize:11, fontWeight:800, padding:"2px 10px", borderRadius:8 },
  problemText:{ color:"rgba(255,255,255,.75)", fontSize:13, lineHeight:1.85, marginBottom:18 },
  sectionLabel:{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.35)", letterSpacing:1, textTransform:"uppercase", marginBottom:8, marginTop:4 },
  exBox:{ background:"rgba(0,0,0,.3)", borderRadius:12, padding:"10px 14px", marginBottom:8, border:"1px solid rgba(255,255,255,.06)" },
  exRow:{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:3 },
  exLabel:{ color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:800, minWidth:46, paddingTop:2 },
  exCode:{ fontFamily:"monospace", fontSize:12, color:"#A8FF78", background:"rgba(0,0,0,.25)", borderRadius:4, padding:"2px 7px" },
  exExplanation:{ color:"rgba(255,255,255,.35)", fontSize:11, marginTop:6, fontStyle:"italic" },
  constraintBox:{ background:"rgba(0,0,0,.25)", borderRadius:10, padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,.55)", lineHeight:2, fontFamily:"monospace", marginBottom:8 },
  codeBlock:{ background:"rgba(0,0,0,.4)", borderRadius:12, padding:"14px 16px", fontFamily:"'Courier New',monospace", fontSize:12, color:"#A8FF78", lineHeight:1.8, overflowX:"auto", whiteSpace:"pre-wrap" },
};
