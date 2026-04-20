import { useNavigate } from "react-router-dom";

/**
 * Props:
 *   result  — { won: bool, winnerId, winnerName, loserId, loserName,
 *               durationMs, creditsAwarded: { winner, loser } }
 *   levelId — to go back to learn screen
 */
export default function ResultOverlay({ result, levelId }) {
  const navigate = useNavigate();
  const won = result?.won ?? false;

  const creditsEarned = won
    ? result?.creditsAwarded?.winner ?? 250
    : result?.creditsAwarded?.loser ?? 50;

  const seconds = result?.durationMs ? Math.round(result.durationMs / 1000) : 0;
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  const timeStr = `${minutes}:${secs}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.icon}>{won ? "🏆" : "💪"}</div>

        {/* Title */}
        <h2 style={{ ...styles.title, color: won ? "#2ED573" : "#FF6B9D" }}>
          {won ? "You Won!" : "Good Fight!"}
        </h2>

        {/* Subtitle */}
        <p style={styles.sub}>
          {won
            ? `You beat ${result?.loserName ?? "your opponent"}!`
            : `${result?.winnerName ?? "Opponent"} solved it first.`}
        </p>

        {/* Stats row */}
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <div style={styles.statVal}>+{creditsEarned}</div>
            <div style={styles.statLbl}>Credits</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statVal}>{timeStr}</div>
            <div style={styles.statLbl}>Time</div>
          </div>
          <div style={styles.stat}>
            <div style={{ ...styles.statVal, color: won ? "#2ED573" : "#FF6B9D" }}>
              {won ? "WIN" : "LOSS"}
            </div>
            <div style={styles.statLbl}>Result</div>
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.btnCol}>
          <button
            style={styles.primaryBtn}
            onClick={() => navigate(`/map/dsa`)}
          >
            🗺️ Continue Journey
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => navigate(`/learn/${levelId}`)}
          >
            🔁 Try Again
          </button>
          <button
            style={styles.ghostBtn}
            onClick={() => navigate("/leaderboard")}
          >
            🏆 View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  card: {
    background: "#12103A",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 28,
    padding: "36px 28px",
    maxWidth: 360,
    width: "100%",
    textAlign: "center",
    fontFamily: "'Nunito', sans-serif",
    animation: "popIn .45s cubic-bezier(.34,1.56,.64,1) both",
  },
  icon: { fontSize: 60, marginBottom: 8 },
  title: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: 34,
    margin: "0 0 6px",
    letterSpacing: 1,
  },
  sub: { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, margin: "0 0 24px" },
  statsRow: { display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 },
  stat: {
    flex: 1,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "12px 6px",
  },
  statVal: { color: "#FDCB6E", fontFamily: "'Fredoka One', cursive", fontSize: 22 },
  statLbl: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 800, marginTop: 2 },
  btnCol: { display: "flex", flexDirection: "column", gap: 10 },
  primaryBtn: {
    background: "linear-gradient(135deg,#FF6B9D,#C850C0)",
    border: "none",
    borderRadius: 16,
    padding: "14px",
    fontFamily: "'Fredoka One', cursive",
    fontSize: 17,
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 7px 0 #8B1A8B",
  },
  secondaryBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "12px",
    fontFamily: "'Nunito', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
  ghostBtn: {
    background: "rgba(255,215,0,0.1)",
    border: "1px solid rgba(255,215,0,0.3)",
    borderRadius: 16,
    padding: "12px",
    fontFamily: "'Nunito', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#FDCB6E",
    cursor: "pointer",
  },
};
