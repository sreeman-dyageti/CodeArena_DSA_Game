import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useSocket } from "../hooks/useSocket.js";
import Timer from "../components/Timer.jsx";
import ResultOverlay from "../components/ResultOverlay.jsx";

const BATTLE_SECONDS = 15 * 60; // 15 minutes

const LANGUAGE_OPTIONS = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
];

// ─── Phase states ─────────────────────────────────────────────────────────────
// "queue"     — waiting to be matched
// "battle"    — actively coding
// "result"    — battle ended
// "no_ghost"  — no ghost available and no real opponent

export default function BattleScreen() {
  const { levelId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connect, emit, on, off, connected } = useSocket();

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState("queue");
  const [problem, setProblem] = useState(location.state?.problem ?? null);
  const [roomId, setRoomId] = useState(null);
  const [opponentName, setOpponentName] = useState("...");
  const [opponentType, setOpponentType] = useState(null); // "human" | "ghost"
  const [opponentLines, setOpponentLines] = useState(0);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(BATTLE_SECONDS);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(10);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const keystrokesRef = useRef([]);
  const battleStartRef = useRef(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  // ── Connect socket on mount ────────────────────────────────────────────────
  useEffect(() => {
    connect();
  }, [connect]);

  // ── Join queue once connected ─────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !user || !levelId) return;

    emit("join_queue", {
      userId: user.id,
      levelId,
      username: user.username,
      elo: user.elo ?? 1000,
    });
  }, [connected, user, levelId, emit]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const handleQueueJoined = ({ waitSeconds: w }) => {
      setWaitSeconds(w ?? 10);
    };

    const handleMatchFound = ({ roomId: rid, problem: prob, opponentName: oName, opponentType: oType }) => {
      setRoomId(rid);
      if (prob) {
        setProblem(prob);
        // Set starter code from problem
        setCode(prob.starter_code ?? "");
      }
      setOpponentName(oName ?? "Opponent");
      setOpponentType(oType);
      battleStartRef.current = Date.now();
      keystrokesRef.current = [];
      setPhase("battle");
    };

    const handleOpponentUpdate = ({ lineCount }) => {
      setOpponentLines(lineCount ?? 0);
    };

    const handleGhostKeystroke = ({ char, timestamp_ms }) => {
      // Ghost is typing — update opponent line count based on newlines
      if (char === "\n" || char === "Enter") {
        setOpponentLines((prev) => prev + 1);
      }
    };

    const handleGhostSubmitted = () => {
      setOpponentLines((prev) => prev + 1);
    };

    const handleBattleEnd = (payload) => {
      const won = payload.winnerId === user?.id;
      setResult({ ...payload, won });
      setPhase("result");
    };

    const handleSubmitResult = ({ correct, message, late }) => {
      setIsSubmitting(false);
      if (!correct) {
        setSubmitError(message ?? "Incorrect — check your solution and try again.");
      }
      if (late) {
        setSubmitError("Opponent already solved it, but your solution was correct!");
      }
    };

    const handleNoGhost = () => {
      setPhase("no_ghost");
    };

    const handleMatchmakingError = ({ message }) => {
      console.error("Matchmaking error:", message);
    };

    const handleOpponentDisconnected = () => {
      setOpponentName("Opponent (left)");
    };

    on("queue_joined", handleQueueJoined);
    on("match_found", handleMatchFound);
    on("opponent_update", handleOpponentUpdate);
    on("ghost_keystroke", handleGhostKeystroke);
    on("ghost_submitted", handleGhostSubmitted);
    on("battle_end", handleBattleEnd);
    on("submit_result", handleSubmitResult);
    on("no_ghost_available", handleNoGhost);
    on("matchmaking_error", handleMatchmakingError);
    on("opponent_disconnected", handleOpponentDisconnected);

    return () => {
      off("queue_joined", handleQueueJoined);
      off("match_found", handleMatchFound);
      off("opponent_update", handleOpponentUpdate);
      off("ghost_keystroke", handleGhostKeystroke);
      off("ghost_submitted", handleGhostSubmitted);
      off("battle_end", handleBattleEnd);
      off("submit_result", handleSubmitResult);
      off("no_ghost_available", handleNoGhost);
      off("matchmaking_error", handleMatchmakingError);
      off("opponent_disconnected", handleOpponentDisconnected);
    };
  }, [on, off, user]);

  // ── Code editor handler ────────────────────────────────────────────────────
  const handleCodeChange = useCallback(
    (e) => {
      const newCode = e.target.value;
      setCode(newCode);
      setSubmitError("");

      // Record keystroke for ghost replay
      if (battleStartRef.current) {
        keystrokesRef.current.push({
          char: e.nativeEvent?.data ?? "",
          timestamp_ms: Date.now() - battleStartRef.current,
        });
      }

      // Emit line count to opponent (not actual code)
      if (roomId) {
        const lineCount = newCode.split("\n").length;
        emit("code_change", { roomId, lineCount });
      }
    },
    [roomId, emit]
  );

  // ── Submit solution ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!roomId || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    emit("submit_solution", {
      roomId,
      code: codeRef.current,
      language,
      keystrokes: keystrokesRef.current,
    });
  }, [roomId, isSubmitting, language, emit]);

  // ── Auto-submit on timer expire ────────────────────────────────────────────
  const handleTimerExpire = useCallback(() => {
    if (phase === "battle") handleSubmit();
  }, [phase, handleSubmit]);

  // ─── RENDER ────────────────────────────────────────────────────────────────

  // ── Waiting for match ──────────────────────────────────────────────────────
  if (phase === "queue") {
    return (
      <div style={styles.bg}>
        <div style={styles.center}>
          <div style={styles.spinIcon}>⚔️</div>
          <h2 style={styles.queueTitle}>Finding Opponent...</h2>
          <p style={styles.queueSub}>
            {connected
              ? `Matching you with a worthy challenger — up to ${waitSeconds}s wait`
              : "Connecting to server..."}
          </p>
          <div style={styles.dotRow}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
          <button style={styles.cancelBtn} onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── No ghost available ─────────────────────────────────────────────────────
  if (phase === "no_ghost") {
    return (
      <div style={styles.bg}>
        <div style={styles.center}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>👻</div>
          <h2 style={styles.queueTitle}>No Opponent Available</h2>
          <p style={styles.queueSub}>
            No ghost replay found for this level yet. Be the first to solve it and create one!
          </p>
          <button
            style={styles.primaryBtn}
            onClick={() => navigate(`/learn/${levelId}`)}
          >
            ← Back to Learn
          </button>
        </div>
      </div>
    );
  }

  // ── Result overlay ─────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return <ResultOverlay result={result} levelId={levelId} />;
  }

  // ── Active battle ──────────────────────────────────────────────────────────
  const urgent = timeLeft < 60;

  return (
    <div style={styles.bg}>
      {/* Hidden timer */}
      {phase === "battle" && (
        <Timer
          seconds={BATTLE_SECONDS}
          onTick={(t) => setTimeLeft(t)}
          onExpire={handleTimerExpire}
        />
      )}

      {/* Top bar */}
      <div style={styles.topBar}>
        {/* You */}
        <div style={styles.playerChip}>
          <div style={{ ...styles.avatar, background: "linear-gradient(135deg,#FF6B9D,#C850C0)" }}>
            {user?.username?.[0]?.toUpperCase() ?? "Y"}
          </div>
          <div>
            <div style={styles.playerName}>{user?.username ?? "You"}</div>
            <div style={{ color: "#FF6B9D", fontSize: 10, fontWeight: 800 }}>
              {user?.elo ?? 1000} ELO
            </div>
          </div>
        </div>

        {/* Timer */}
        <div
          style={{
            ...styles.timerBox,
            borderColor: urgent ? "#FF4757" : "#00CEC9",
            boxShadow: urgent ? "0 0 18px rgba(255,71,87,.5)" : "0 0 14px rgba(0,206,201,.4)",
          }}
        >
          <div
            style={{
              ...styles.timerText,
              color: urgent ? "#FF4757" : "#fff",
              animation: urgent ? "blink 1s ease-in-out infinite" : "none",
            }}
          >
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </div>
          <div style={styles.timerLabel}>TIME LEFT</div>
        </div>

        {/* Opponent */}
        <div style={{ ...styles.playerChip, flexDirection: "row-reverse" }}>
          <div style={{ ...styles.avatar, background: "linear-gradient(135deg,#FDCB6E,#FF9F43)" }}>
            {opponentType === "ghost" ? "👻" : opponentName[0]?.toUpperCase() ?? "O"}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={styles.playerName}>{opponentName}</div>
            <div style={{ color: "#FDCB6E", fontSize: 10, fontWeight: 800 }}>
              {opponentLines} lines
            </div>
          </div>
        </div>
      </div>

      {/* Opponent typing status */}
      <div style={styles.statusBar}>
        <div style={styles.greenDot} />
        <span style={styles.statusText}>
          {opponentName} is coding... ({opponentLines} lines written)
        </span>
      </div>

      {/* Main content: Problem + Editor */}
      <div style={styles.mainRow}>
        {/* LEFT — Problem */}
        <div style={styles.problemPanel}>
          {problem ? (
            <>
              <div style={styles.problemHeader}>
                <span style={styles.problemTitle}>{problem.problem_statement?.split(" ").slice(0, 5).join(" ") || "Problem"}</span>
                <span
                  style={{
                    ...styles.diffBadge,
                    background:
                      problem.difficulty === "easy"
                        ? "rgba(46,213,115,.15)"
                        : problem.difficulty === "hard"
                        ? "rgba(255,71,87,.15)"
                        : "rgba(253,203,110,.15)",
                    color:
                      problem.difficulty === "easy"
                        ? "#2ED573"
                        : problem.difficulty === "hard"
                        ? "#FF4757"
                        : "#FDCB6E",
                  }}
                >
                  {problem.difficulty}
                </span>
              </div>
              <p style={styles.problemText}>{problem.problem_statement}</p>
              {Array.isArray(problem.examples) && problem.examples.length > 0 && (
                <div style={styles.examplesSection}>
                  <div style={styles.sectionLabel}>Examples</div>
                  {problem.examples.slice(0, 2).map((ex, i) => (
                    <div key={i} style={styles.exampleBox}>
                      <div style={styles.exampleLine}>
                        <span style={styles.exLabel}>Input:</span>
                        <code style={styles.exCode}>
                          {Array.isArray(ex.args) ? ex.args.map((a) => JSON.stringify(a)).join(", ") : JSON.stringify(ex.input ?? "")}
                        </code>
                      </div>
                      <div style={styles.exampleLine}>
                        <span style={styles.exLabel}>Output:</span>
                        <code style={styles.exCode}>{JSON.stringify(ex.expected ?? ex.output ?? "")}</code>
                      </div>
                      {ex.explanation && (
                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginTop: 4 }}>
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {problem.constraints && (
                <div style={styles.constraintsSection}>
                  <div style={styles.sectionLabel}>Constraints</div>
                  <div style={styles.constraintsText}>{problem.constraints}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>Loading problem...</div>
          )}
        </div>

        {/* RIGHT — Editor */}
        <div style={styles.editorPanel}>
          {/* Editor top bar */}
          <div style={styles.editorTopBar}>
            <div style={styles.trafficLights}>
              {["#FF5F56", "#FFBD2E", "#27C93F"].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <span style={styles.editorFilename}>solution.js</span>
            {/* Language selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.langSelect}
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <textarea
            value={code}
            onChange={handleCodeChange}
            onKeyDown={(e) => {
              // Tab inserts 2 spaces
              if (e.key === "Tab") {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const newCode = code.substring(0, start) + "  " + code.substring(end);
                setCode(newCode);
                setTimeout(() => {
                  e.target.selectionStart = start + 2;
                  e.target.selectionEnd = start + 2;
                }, 0);
              }
            }}
            style={styles.textarea}
            spellCheck={false}
            placeholder="// Write your solution here..."
          />

          {/* Error message */}
          {submitError && (
            <div style={styles.errorBanner}>
              ❌ {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            style={{
              ...styles.submitBtn,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "⏳ Judging..." : "🚀 Submit Solution"}
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes dotBounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes popIn { from{transform:scale(.82);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes spinIcon { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#0C0A1E 0%,#17103A 45%,#0B1530 100%)",
    fontFamily: "'Nunito', sans-serif",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: 24,
    textAlign: "center",
  },
  spinIcon: {
    fontSize: 60,
    marginBottom: 18,
    display: "inline-block",
    animation: "spinIcon 3s linear infinite",
  },
  queueTitle: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: 30,
    color: "#fff",
    margin: "0 0 8px",
  },
  queueSub: {
    color: "rgba(255,255,255,.5)",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 28,
    maxWidth: 340,
  },
  dotRow: { display: "flex", gap: 8, marginBottom: 32 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#00CEC9",
    animation: "dotBounce 1.2s ease-in-out infinite",
  },
  cancelBtn: {
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 12,
    padding: "10px 28px",
    color: "rgba(255,255,255,.7)",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  primaryBtn: {
    background: "linear-gradient(135deg,#FF6B9D,#C850C0)",
    border: "none",
    borderRadius: 16,
    padding: "14px 32px",
    fontFamily: "'Fredoka One', cursive",
    fontSize: 17,
    color: "#fff",
    cursor: "pointer",
    marginTop: 16,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "rgba(0,0,0,.45)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(255,255,255,.07)",
    flexShrink: 0,
  },
  playerChip: { display: "flex", alignItems: "center", gap: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 900,
    flexShrink: 0,
  },
  playerName: { color: "#fff", fontSize: 13, fontWeight: 900 },
  timerBox: {
    background: "rgba(0,0,0,.4)",
    border: "2px solid #00CEC9",
    borderRadius: 16,
    padding: "6px 18px",
    textAlign: "center",
    minWidth: 90,
  },
  timerText: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: 28,
    color: "#fff",
    letterSpacing: 2,
  },
  timerLabel: { fontSize: 9, color: "rgba(255,255,255,.4)", fontWeight: 800, letterSpacing: 1.5 },
  statusBar: {
    padding: "5px 16px",
    background: "rgba(0,0,0,.18)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid rgba(255,255,255,.04)",
    flexShrink: 0,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#2ED573",
    boxShadow: "0 0 7px #2ED573",
    flexShrink: 0,
  },
  statusText: { color: "rgba(255,255,255,.45)", fontSize: 12, fontWeight: 700 },
  mainRow: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    minHeight: 0,
  },
  problemPanel: {
    width: "40%",
    overflowY: "auto",
    padding: "16px",
    borderRight: "1px solid rgba(255,255,255,.06)",
    background: "rgba(0,0,0,.15)",
  },
  problemHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  problemTitle: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: 16,
    color: "#fff",
    letterSpacing: 0.5,
  },
  diffBadge: {
    fontSize: 11,
    fontWeight: 800,
    padding: "2px 10px",
    borderRadius: 8,
  },
  problemText: {
    color: "rgba(255,255,255,.75)",
    fontSize: 13,
    lineHeight: 1.8,
    margin: "0 0 16px",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "rgba(255,255,255,.35)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  examplesSection: { marginBottom: 14 },
  exampleBox: {
    background: "rgba(0,0,0,.3)",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 8,
    border: "1px solid rgba(255,255,255,.06)",
  },
  exampleLine: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 3 },
  exLabel: { color: "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 800, minWidth: 44 },
  exCode: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#A8FF78",
    background: "rgba(0,0,0,.25)",
    borderRadius: 4,
    padding: "1px 6px",
  },
  constraintsSection: { marginBottom: 8 },
  constraintsText: {
    color: "rgba(255,255,255,.5)",
    fontSize: 12,
    lineHeight: 1.9,
    fontFamily: "monospace",
  },
  editorPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "10px 14px",
    gap: 9,
  },
  editorTopBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 12px",
    background: "rgba(0,0,0,.4)",
    borderRadius: "12px 12px 0 0",
    flexShrink: 0,
  },
  trafficLights: { display: "flex", gap: 5 },
  editorFilename: { color: "rgba(255,255,255,.35)", fontSize: 11, fontWeight: 700, flex: 1 },
  langSelect: {
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.15)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
    padding: "3px 8px",
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  textarea: {
    flex: 1,
    background: "rgba(0,0,0,.5)",
    border: "none",
    borderRadius: "0 0 12px 12px",
    color: "#E2E2E2",
    padding: "12px 14px",
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    lineHeight: 1.7,
    outline: "none",
    resize: "none",
    minHeight: 300,
    caretColor: "#55EFC4",
  },
  errorBanner: {
    background: "rgba(255,71,87,.15)",
    border: "1px solid rgba(255,71,87,.4)",
    borderRadius: 10,
    padding: "8px 14px",
    color: "#FF6B81",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  submitBtn: {
    background: "linear-gradient(135deg,#2ED573,#00B894)",
    border: "none",
    borderRadius: 14,
    padding: "14px",
    fontFamily: "'Fredoka One', cursive",
    fontSize: 18,
    color: "#fff",
    boxShadow: "0 6px 0 #007A55",
    letterSpacing: 1,
    flexShrink: 0,
  },
};
