import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import TopicScreen from "./screens/TopicScreen";
import LearnScreen from "./screens/LearnScreen";
import BattleScreen from "./screens/BattleScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight:"100vh", background:"#0C0A1E", display:"flex",
        alignItems:"center", justifyContent:"center",
        color:"rgba(255,255,255,.5)", fontSize:14,
        fontFamily:"'Nunito',sans-serif", fontWeight:700
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeScreen />} />

      {/* Protected */}
      <Route path="/map/:track" element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
      <Route path="/topic/:topicName" element={<ProtectedRoute><TopicScreen /></ProtectedRoute>} />
      <Route path="/learn/:levelId" element={<ProtectedRoute><LearnScreen /></ProtectedRoute>} />
      <Route path="/battle/:levelId" element={<ProtectedRoute><BattleScreen /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardScreen /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
