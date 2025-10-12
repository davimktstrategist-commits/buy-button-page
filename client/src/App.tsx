import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SoundProvider } from "@/contexts/SoundContext";
import Landing from "@/pages/Landing";
import Game from "@/pages/Game";
import AdminDashboard from "@/pages/AdminDashboard";
import Admin2 from "@/pages/Admin2";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/game" component={Game} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin2" component={Admin2} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SoundProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </SoundProvider>
    </QueryClientProvider>
  );
}

export default App;
