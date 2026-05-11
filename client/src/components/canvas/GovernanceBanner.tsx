import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, InfoIcon, CheckCircle2, Zap } from "lucide-react";

export default function GovernanceBanner() {
  const [isPostSnapshot, setIsPostSnapshot] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const snapshotDate = new Date("2026-03-31T23:59:59Z");
      const startDate = new Date("2025-10-01T00:00:00Z");
      const now = new Date();
      const difference = snapshotDate.getTime() - now.getTime();
      const totalDuration = snapshotDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();

      if (difference > 0) {
        setIsPostSnapshot(false);
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        });
        setProgress(Math.min((elapsed / totalDuration) * 100, 100));
      } else {
        setIsPostSnapshot(true);
        setProgress(100);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  if (isPostSnapshot) {
    return (
      <Card
        className="border border-primary/30 shadow-[0_0_20px_rgba(9,211,255,0.10)] bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent"
        data-testid="governance-banner"
      >
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Snapshot Complete</h3>
                <p className="text-xs text-muted-foreground">Governance points locked · Token airdrop incoming</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFBDFC]/10 border border-[#FFBDFC]/20">
              <Zap className="w-3.5 h-3.5 text-[#FFBDFC]" />
              <span className="text-xs font-semibold text-[#FFBDFC]">Phase 2: Territory Wars — Q2 2026</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border border-primary/30 shadow-[0_0_20px_rgba(9,211,255,0.10)] bg-gradient-to-r from-primary/10 to-purple-500/5"
      data-testid="governance-banner"
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-primary">Earn Governance Points Daily</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">Only original minters earn points for 350M token airdrop</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              <span className="font-bold text-primary">{timeLeft.days}d</span> : {timeLeft.hours}h : {timeLeft.minutes}m
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Snapshot in</span>
              <span className="font-medium">March 31, 2026</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
