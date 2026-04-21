import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

const STARS = Array.from({ length: 30 }, () => ({
  w: 1 + Math.random() * 3,
  l: Math.random() * 100,
  t: Math.random() * 100,
  d: 1.5 + Math.random() * 3,
  dl: Math.random() * 4,
}));

function Stars() {
  return STARS.map((s, i) => (
    <div key={i} style={{ position:"absolute", borderRadius:"50%", width:s.w, height:s.w, background:"#fff", left:s.l+"%", top:s.t+"%", opacity:0.15, animation:`twinkle ${s.d}s ease-in-out infinite ${s.dl}s`, pointerEvents:"none", zIndex:0 }} />
  ));
}

function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        await login(form.email, form.password);
      } else {
        if (!form.username.trim()) { setError("Username is required"); setLoading(false); return; }
        await register(form.username, form.email, form.password);
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ms.backdrop} onClick={onClose}>
      <div style={ms.card} onClick={e => e.stopPropagation()}>
        <button style={ms.closeBtn} onClick={onClose}>✕</button>
        <div style={ms.tabRow}>
          {["login","register"].map(t => (
            <button key={t} style={{ ...ms.tabBtn, color: tab===t ? "#FF6B9D" : "rgba(255,255,255,.4)", borderBottom: `2px solid ${tab===t ? "#FF6B9D" : "transparent"}` }}
              onClick={() => { setTab(t); setError(""); }}>
              {t === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {tab === "register" && (
            <input style={ms.input} type="text" placeholder="Username" value={form.username} onChange={set("username")} required autoFocus />
          )}
          <input style={ms.input} type="email" placeholder="Email" value={form.email} onChange={set("email")} required autoFocus={tab==="login"} />
          <input style={ms.input} type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={set("password")} required minLength={6} />
          {error && <div style={ms.errorBox}>{error}</div>}
          <button type="submit" disabled={loading} style={{ ...ms.submitBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait..." : tab === "login" ? "⚔️ Enter Arena" : "🚀 Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const handleTrack = (track) => {
    if (!user) { setShowAuth(true); return; }
    navigate(`/map/${track}`);
  };

  return (
    <div style={s.bg}>
      <Stars />
      <div style={{ position:"absolute", top:"6%", left:"-4%", width:220, height:220, borderRadius:"50%", background:"rgba(108,92,231,.18)", filter:"blur(55px)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"8%", right:"-4%", width:190, height:190, borderRadius:"50%", background:"rgba(0,206,201,.12)", filter:"blur(50px)", pointerEvents:"none" }} />

      {/* Nav */}
      <div style={s.nav}>
        <span style={s.navLogo}>⚔️ CodeArena</span>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {user ? (
            <>
              <button style={s.navBtn} onClick={() => navigate("/leaderboard")}>🏆 Leaderboard</button>
              <div style={s.userChip}>
                <span style={{ fontSize:14 }}>🚀</span>
                <span style={{ color:"#fff", fontWeight:800, fontSize:13 }}>{user.username}</span>
                <span style={{ color:"#FDCB6E", fontWeight:900, fontSize:12 }}>💰 {user.credits ?? 0}</span>
              </div>
              <button style={s.navBtnGhost} onClick={logout}>Logout</button>
            </>
          ) : (
            <button style={s.navBtn} onClick={() => setShowAuth(true)}>Login / Register</button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={s.hero}>
        <div style={{ fontSize:64, filter:"drop-shadow(0 0 24px rgba(255,107,157,.65))", marginBottom:8, animation:"floatY 3.5s ease-in-out infinite" }}>⚔️</div>
        <h1 style={s.heroTitle}>CODE ARENA</h1>
        <p style={s.heroSub}>Battle · Learn · Conquer</p>
        <p style={s.heroDesc}>Real-time 1v1 DSA battles. Learn a concept, enter the arena,<br />beat your opponent. Climb the weekly leaderboard.</p>

        {user && (
          <div style={s.statsStrip}>
            <span style={{ fontSize:18 }}>🚀</span>
            <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>{user.username}</span>
            <span style={s.div}>│</span>
            <span style={{ fontSize:16 }}>💰</span>
            <span style={{ color:"#FDCB6E", fontWeight:900, fontSize:15 }}>{user.credits ?? 0}</span>
            <span style={{ color:"rgba(255,255,255,.4)", fontSize:12, fontWeight:600 }}>credits</span>
            <span style={s.div}>│</span>
            <span style={{ fontSize:14 }}>⚡</span>
            <span style={{ color:"#A29BFE", fontWeight:800, fontSize:13 }}>{user.elo ?? 1000} ELO</span>
          </div>
        )}

        <p style={s.chooseLabel}>Choose Your Arena</p>
        <div style={s.cardRow}>
          {[
            { id:"dsa", icon:"🧠", title:"DSA", sub:"Data Structures\n& Algorithms", bg:"linear-gradient(148deg,#FF6B9D 0%,#C850C0 100%)", shadow:"#8B1A8B", glow:"rgba(200,80,192,.45)", info:"3 Topics · 15 Battles" },
            { id:"aptitude", icon:"📐", title:"Aptitude", sub:"Quant · Verbal\nReasoning", bg:"linear-gradient(148deg,#00CEC9 0%,#0984E3 100%)", shadow:"#055A9E", glow:"rgba(9,132,227,.4)", info:"Coming Soon" },
          ].map(t => (
            <button key={t.id} onClick={() => handleTrack(t.id)} disabled={t.id==="aptitude"}
              style={{ ...s.trackCard, background:t.bg, boxShadow:`0 8px 0 ${t.shadow}, 0 14px 35px ${t.glow}`, opacity: t.id==="aptitude" ? 0.6 : 1, cursor: t.id==="aptitude" ? "not-allowed" : "pointer" }}>
              <div style={{ fontSize:52, marginBottom:8, filter:"drop-shadow(0 4px 8px rgba(0,0,0,.3))" }}>{t.icon}</div>
              <div style={s.cardTitle}>{t.title}</div>
              <div style={s.cardSub}>{t.sub}</div>
              <div style={s.cardBadge}>{t.info}</div>
            </button>
          ))}
        </div>

        <button style={s.lbBtn} onClick={() => user ? navigate("/leaderboard") : setShowAuth(true)}>
          <span style={{ fontSize:20 }}>🏆</span>
          <span style={s.shimmerGold}>Weekly Leaderboard</span>
        </button>

        {!user && (
          <p style={{ color:"rgba(255,255,255,.35)", fontSize:13, fontWeight:700, marginTop:16 }}>
            <button style={{ background:"none", border:"none", color:"#FF6B9D", cursor:"pointer", fontWeight:800, fontSize:13, textDecoration:"underline" }} onClick={() => setShowAuth(true)}>
              Login or register
            </button>{" "}to start battling
          </p>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes twinkle{0%,100%{opacity:.1}50%{opacity:.9}}
        @keyframes shimmer{to{background-position:200% center}}
        *{box-sizing:border-box} body{margin:0}
        input::placeholder{color:rgba(255,255,255,.3)}
        input:focus{outline:none;border-color:rgba(255,107,157,.5)!important}
      `}</style>
    </div>
  );
}

const s = {
  bg:{ minHeight:"100vh", background:"linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)", fontFamily:"'Nunito',sans-serif", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" },
  nav:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", background:"rgba(0,0,0,.25)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,.07)", position:"relative", zIndex:10, flexShrink:0 },
  navLogo:{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#fff", letterSpacing:1 },
  navBtn:{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.18)", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  navBtnGhost:{ background:"none", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:"8px 14px", color:"rgba(255,255,255,.45)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  userChip:{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:20, padding:"6px 14px", display:"flex", alignItems:"center", gap:8 },
  hero:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px 40px", position:"relative", zIndex:1, textAlign:"center" },
  heroTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:52, letterSpacing:4, margin:"0 0 8px", background:"linear-gradient(135deg,#FF6B9D 0%,#FF9F43 55%,#FDCB6E 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1 },
  heroSub:{ color:"rgba(255,255,255,.45)", fontSize:12, letterSpacing:4, textTransform:"uppercase", fontWeight:700, margin:"0 0 16px" },
  heroDesc:{ color:"rgba(255,255,255,.55)", fontSize:14, fontWeight:600, lineHeight:1.8, margin:"0 0 24px", maxWidth:400 },
  statsStrip:{ background:"rgba(255,255,255,.07)", backdropFilter:"blur(14px)", borderRadius:24, padding:"10px 22px", marginBottom:28, display:"flex", alignItems:"center", gap:10, border:"1px solid rgba(255,255,255,.12)" },
  div:{ color:"rgba(255,255,255,.2)", fontSize:16 },
  chooseLabel:{ color:"rgba(255,255,255,.75)", fontSize:16, fontWeight:700, marginBottom:16 },
  cardRow:{ display:"flex", gap:16, marginBottom:24 },
  trackCard:{ border:"none", borderRadius:28, padding:"26px 20px", color:"#fff", width:152, display:"flex", flexDirection:"column", alignItems:"center", fontFamily:"'Nunito',sans-serif" },
  cardTitle:{ fontFamily:"'Fredoka One',cursive", fontSize:24, letterSpacing:1, marginBottom:4 },
  cardSub:{ fontSize:12, opacity:0.88, fontWeight:700, lineHeight:1.45, whiteSpace:"pre-line", marginBottom:14 },
  cardBadge:{ background:"rgba(0,0,0,.22)", borderRadius:12, padding:"5px 10px", fontSize:11, fontWeight:800, letterSpacing:0.5 },
  lbBtn:{ background:"rgba(255,255,255,.07)", border:"1.5px solid rgba(255,215,0,.3)", borderRadius:20, padding:"12px 28px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15 },
  shimmerGold:{ background:"linear-gradient(90deg,#FFD700 0%,#FFFBE0 40%,#FFD700 70%,#FFA500 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 2.5s linear infinite" },
};

const ms = {
  backdrop:{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:20 },
  card:{ background:"#12103A", border:"1px solid rgba(255,255,255,.12)", borderRadius:24, padding:"32px 28px", width:"100%", maxWidth:360, position:"relative", fontFamily:"'Nunito',sans-serif" },
  tabRow:{ display:"flex", marginBottom:24, borderBottom:"1px solid rgba(255,255,255,.08)" },
  tabBtn:{ flex:1, background:"none", border:"none", padding:"10px 0", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", marginBottom:-1 },
  input:{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.13)", borderRadius:12, padding:"12px 16px", color:"#fff", fontSize:14, fontFamily:"'Nunito',sans-serif", width:"100%" },
  errorBox:{ background:"rgba(255,71,87,.15)", border:"1px solid rgba(255,71,87,.35)", borderRadius:10, padding:"8px 14px", color:"#FF6B81", fontSize:13, fontWeight:700 },
  submitBtn:{ background:"linear-gradient(135deg,#FF6B9D,#C850C0)", border:"none", borderRadius:14, padding:14, fontFamily:"'Fredoka One',cursive", fontSize:18, color:"#fff", cursor:"pointer", boxShadow:"0 6px 0 #8B1A8B", width:"100%" },
  closeBtn:{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.4)", fontSize:18, cursor:"pointer" },
};
