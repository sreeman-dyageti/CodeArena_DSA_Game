import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import api from "../api/index.js";
import { Target, Hand, BookOpen, Brain, Calculator, Trophy, Rocket, Coins, Zap, Lock, ArrowRight } from "lucide-react";

const TOPIC_CONFIGS = [
  {
    id: "Arrays",
    icon: <Target size={36} color="currentColor" />,
    color: "#FF6B9D",
    shadow: "#A8235A",
    glow: "rgba(255,107,157,.45)",
    description: "Foundation of DSA. Master arrays before anything else.",
    difficulty: "Beginner",
    companies: ["Google", "Amazon", "Microsoft"],
  },
  {
    id: "Two Pointers",
    icon: <Hand size={36} color="currentColor" />,
    color: "#FF9F43",
    shadow: "#CC7213",
    glow: "rgba(255,159,67,.4)",
    description: "Eliminate nested loops. O(n) solutions to hard problems.",
    difficulty: "Intermediate",
    companies: ["Meta", "Apple", "Netflix"],
  },
  {
    id: "Sliding Window",
    icon: <BookOpen size={36} color="currentColor" />,
    color: "#00CEC9",
    shadow: "#007B79",
    glow: "rgba(0,206,201,.4)",
    description: "Subarray and substring problems. Interview favourite.",
    difficulty: "Intermediate",
    companies: ["Amazon", "Google", "Uber"],
  },
];

// Stars background
const STARS = Array.from({ length: 28 }, () => ({
  w: 1 + Math.random() * 2.5,
  l: Math.random() * 100,
  t: Math.random() * 100,
  d: 1.5 + Math.random() * 3,
  dl: Math.random() * 4,
}));

export default function MapScreen() {
  const navigate = useNavigate();
  const { track } = useParams();
  const { user } = useAuth();
  
  const [levels, setLevels] = useState([]);
  const [completedLevelIds, setCompletedLevelIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch all levels
        const { data: levelsData } = await api.get("/api/levels");
        setLevels(levelsData.levels || []);

        // Fetch user's completed levels
        try {
          const { data: progressData } = await api.get("/api/levels/progress/completed");
          setCompletedLevelIds(progressData.completedLevelIds || []);
        } catch (err) {
          console.error("Failed to fetch progress:", err);
        }
      } catch (err) {
        console.error("Failed to load levels:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Calculate which topics are unlocked based on completed levels
  const getTopicsWithStatus = () => {
    return TOPIC_CONFIGS.map((config, topicIndex) => {
      // Get levels in this topic
      const topicLevels = levels.filter(l => l.topic === config.id);
      
      if (topicIndex === 0) {
        // First topic is always unlocked
        return { ...config, locked: false, levels: topicLevels.length };
      }
      
      // Check if all levels in previous topic are completed
      const prevTopic = TOPIC_CONFIGS[topicIndex - 1];
      const prevTopicLevels = levels.filter(l => l.topic === prevTopic.id);
      const prevTopicComplete = prevTopicLevels.length > 0 && 
        prevTopicLevels.every(l => completedLevelIds.includes(l.id));
      
      return {
        ...config,
        locked: !prevTopicComplete,
        levels: topicLevels.length
      };
    });
  };

  const topicsWithStatus = getTopicsWithStatus();

  return (
    <div style={s.bg}>
      {/* Stars */}
      {STARS.map((st, i) => (
        <div key={i} style={{ position:"absolute", borderRadius:"50%", width:st.w, height:st.w, background:"#fff", left:st.l+"%", top:st.t+"%", opacity:.12, animation:`twinkle ${st.d}s ease-in-out infinite ${st.dl}s`, pointerEvents:"none" }} />
      ))}

      {/* Blobs */}
      <div style={{ position:"absolute", top:"5%", left:"-5%", width:200, height:200, borderRadius:"50%", background:"rgba(108,92,231,.15)", filter:"blur(50px)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"10%", right:"-5%", width:180, height:180, borderRadius:"50%", background:"rgba(0,206,201,.1)", filter:"blur(45px)", pointerEvents:"none" }} />

      {/* Top bar */}
      <div style={s.topBar}>
        <button onClick={() => navigate("/")} style={s.backBtn} aria-label="Back">
          <ArrowRight size={20} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div style={{ textAlign:"center" }}>
          <div style={s.topTitle}>
            {track === "dsa" ? (
              <><Brain size={20} style={{ marginRight: 6, display: "inline" }} />DSA Arena</>
            ) : (
              <><Calculator size={20} style={{ marginRight: 6, display: "inline" }} />Aptitude Arena</>
            )}
          </div>
          <div style={s.topSub}>Choose a topic to begin</div>
        </div>
        <button onClick={() => navigate("/leaderboard")} style={s.backBtn} aria-label="Leaderboard">
          <Trophy size={20} />
        </button>
      </div>

      {/* User strip */}
      {user && (
        <div style={s.userStrip}>
          <Rocket size={14} color="currentColor" />
          <span style={s.username}>{user.username}</span>
          <span style={s.divider}>│</span>
          <Coins size={13} color="#FDCB6E" />
          <span style={s.credits}>{user.credits ?? 0} credits</span>
          <span style={s.divider}>│</span>
          <Zap size={12} color="#A29BFE" />
          <span style={s.elo}>{user.elo ?? 1000} ELO</span>
        </div>
      )}

      {/* Topic cards */}
      <div style={s.cardsWrap}>
        <p style={s.subtitle}>
          Complete topics in order. Each topic unlocks after finishing the previous one.
        </p>

        <div style={s.cardGrid}>
          {topicsWithStatus.map((topic, i) => (
            <div key={topic.id} style={{ ...s.card, opacity: topic.locked ? 0.55 : 1, cursor: topic.locked ? "not-allowed" : "pointer" }}
              onClick={() => !topic.locked && navigate(`/topic/${encodeURIComponent(topic.id)}`)}>

              {/* Lock overlay */}
              {topic.locked && (
                <div style={s.lockOverlay}>
                  <div style={s.lockIcon}>
                    <Lock size={32} color="currentColor" />
                  </div>
                  <div style={s.lockText}>Complete {TOPIC_CONFIGS[i-1]?.id} first</div>
                </div>
              )}

              {/* Card glow border */}
              <div style={{ ...s.cardBorder, borderColor: topic.locked ? "rgba(255,255,255,.08)" : `${topic.color}44`, boxShadow: topic.locked ? "none" : `0 0 30px ${topic.color}22` }} />

              {/* Icon circle */}
              <div style={{ ...s.iconCircle, background: topic.locked ? "rgba(255,255,255,.08)" : `radial-gradient(circle at 35% 35%,${topic.color},${topic.shadow})`, boxShadow: topic.locked ? "none" : `0 8px 24px ${topic.color}55` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "currentColor" }}>
                  {topic.icon}
                </div>
              </div>

              {/* Topic name */}
              <h3 style={{ ...s.topicName, color: topic.locked ? "rgba(255,255,255,.35)" : "#fff" }}>
                {topic.id}
              </h3>

              {/* Description */}
              <p style={s.topicDesc}>{topic.description}</p>

              {/* Difficulty + levels row */}
              <div style={s.metaRow}>
                <span style={{ ...s.metaBadge, background: topic.locked ? "rgba(255,255,255,.06)" : `${topic.color}22`, color: topic.locked ? "rgba(255,255,255,.25)" : topic.color }}>
                  {topic.difficulty}
                </span>
                <span style={{ ...s.metaBadge, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.45)" }}>
                  {topic.levels} problems
                </span>
              </div>

              {/* Company logos */}
              <div style={s.companiesRow}>
                <span style={s.companiesLabel}>Asked at:</span>
                {topic.companies.map(c => (
                  <span key={c} style={s.companyChip}>{c}</span>
                ))}
              </div>

              {/* CTA */}
              {!topic.locked && (
                <div style={{ ...s.startBtn, background:`linear-gradient(135deg,${topic.color},${topic.shadow})`, boxShadow:`0 5px 0 ${topic.shadow}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  Start Topic
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes twinkle{0%,100%{opacity:.08}50%{opacity:.5}}
        *{box-sizing:border-box} body{margin:0}
      `}</style>
    </div>
  );
}

const s = {
  bg:{ minHeight:"100vh", background:"linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)", fontFamily:"'Nunito',sans-serif", color:"#fff", position:"relative", display:"flex", flexDirection:"column" },
  topBar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 20px", background:"rgba(0,0,0,.3)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0, position:"relative", zIndex:10 },
  backBtn:{ background:"none", border:"none", color:"rgba(255,255,255,.65)", cursor:"pointer", fontSize:20, padding:"4px 8px" },
  topTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:19, color:"#fff", letterSpacing:1 },
  topSub:{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700 },
  userStrip:{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"10px 20px", background:"rgba(0,0,0,.15)", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0, position:"relative", zIndex:9 },
  username:{ color:"#fff", fontWeight:800, fontSize:13 },
  divider:{ color:"rgba(255,255,255,.2)", fontSize:14 },
  credits:{ color:"#FDCB6E", fontWeight:900, fontSize:13 },
  elo:{ color:"#A29BFE", fontWeight:800, fontSize:12 },
  cardsWrap:{ flex:1, overflowY:"auto", padding:"24px 20px 40px", position:"relative", zIndex:8 },
  subtitle:{ textAlign:"center", color:"rgba(255,255,255,.45)", fontSize:13, fontWeight:700, marginBottom:24, lineHeight:1.6 },
  cardGrid:{ display:"flex", flexDirection:"column", gap:16, maxWidth:560, margin:"0 auto" },
  card:{ background:"rgba(255,255,255,.04)", borderRadius:24, padding:"24px 22px", position:"relative", overflow:"hidden", transition:"transform .2s, background .2s" },
  cardBorder:{ position:"absolute", inset:0, borderRadius:24, border:"1.5px solid", pointerEvents:"none" },
  lockOverlay:{ position:"absolute", inset:0, background:"rgba(8,6,28,.7)", borderRadius:24, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:5, backdropFilter:"blur(4px)" },
  lockIcon:{ fontSize:32, marginBottom:8 },
  lockText:{ color:"rgba(255,255,255,.5)", fontSize:13, fontWeight:700 },
  iconCircle:{ width:72, height:72, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 },
  topicName:{ fontFamily:"'Fredoka One',cursive", fontSize:24, margin:"0 0 8px", letterSpacing:.5 },
  topicDesc:{ color:"rgba(255,255,255,.55)", fontSize:13, fontWeight:600, lineHeight:1.7, margin:"0 0 14px" },
  metaRow:{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" },
  metaBadge:{ fontSize:12, fontWeight:800, padding:"4px 12px", borderRadius:20 },
  companiesRow:{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:16 },
  companiesLabel:{ color:"rgba(255,255,255,.3)", fontSize:11, fontWeight:700 },
  companyChip:{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"2px 9px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.55)" },
  startBtn:{ display:"inline-block", borderRadius:14, padding:"10px 22px", fontFamily:"'Fredoka One',cursive", fontSize:15, color:"#fff", letterSpacing:.5 },
};
