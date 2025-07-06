import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { MainLayout } from "@/components/Layout/MainLayout";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import AchievementLogPage from "@/pages/AchievementLogPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import AdminDashboard from "@/pages/AdminDashboard";
import { BookDiscoveryPage } from "@/pages/BookDiscoveryPage";
import { ReadingProgressPage } from "@/pages/ReadingProgressPage";
import { QuizPage } from "@/pages/QuizPage";
import SettingsPage from "@/pages/SettingsPage";
import EmailVerificationPage from "@/pages/EmailVerificationPage";
import PasswordResetPage from "@/pages/PasswordResetPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/profile/:userId" component={ProfilePage} />
      <Route path="/achievements" component={AchievementLogPage} />
      <Route path="/discover" component={BookDiscoveryPage} />
      <Route path="/progress" component={ReadingProgressPage} />
      <Route path="/quizzes" component={QuizPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={LoginPage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={LoginPage} />
      <Route path="/auth/verify-email" component={EmailVerificationPage} />
      <Route path="/auth/reset-password" component={PasswordResetPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <GuestProvider>
            <Toaster />
            <Router />
          </GuestProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
