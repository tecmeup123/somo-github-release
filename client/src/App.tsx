import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Home from "@/pages/home";
import MyPixels from "@/pages/my-pixels";
import Leaderboard from "@/pages/leaderboard";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import MobileOptimizations from "@/components/MobileOptimizations";
import ConnectionStatus from "@/components/ConnectionStatus";

// Lazy load landing page to code-split framer-motion (~60KB)
const Landing = lazy(() => import("@/pages/landing"));

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        }>
          <Landing />
        </Suspense>
      </Route>
      <Route path="/app">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path="/my-pixels">
        <ProtectedRoute>
          <MyPixels />
        </ProtectedRoute>
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute>
          <Leaderboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <div className="dark min-h-screen">
              <MobileOptimizations />
              <ConnectionStatus />
              <Toaster />
              <Router />
            </div>
          </TooltipProvider>
        </WebSocketProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
