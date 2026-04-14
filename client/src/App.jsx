import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import LearnScreen from "./screens/LearnScreen";
import BattleScreen from "./screens/BattleScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ color: "#fff", padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route
        path="/map/:track"
        element={
          <ProtectedRoute>
            <MapScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learn/:levelId"
        element={
          <ProtectedRoute>
            <LearnScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/battle/:levelId"
        element={
          <ProtectedRoute>
            <BattleScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardScreen />
          </ProtectedRoute>
        }
      />
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
