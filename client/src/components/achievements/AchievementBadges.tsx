import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { ACHIEVEMENT_CONFIG, ACHIEVEMENT_TYPES, type AchievementType } from "@shared/schema";

interface UserAchievement {
  id: string;
  userId: string;
  achievementType: AchievementType;
  unlockedAt: string;
}

interface AchievementBadgesProps {
  userAddress: string;
}

export default function AchievementBadges({ userAddress }: AchievementBadgesProps) {
  const { data: achievements = [] } = useQuery<UserAchievement[]>({
    queryKey: [`/api/users/${userAddress}/achievements`],
    enabled: !!userAddress,
  });

  if (achievements.length === 0) {
    return null;
  }

  return (
    <div className="p-3" data-testid="achievements-section">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-3 h-3 text-yellow-500" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Achievements</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {achievements.map((achievement) => {
          const config = ACHIEVEMENT_CONFIG[achievement.achievementType as keyof typeof ACHIEVEMENT_CONFIG];
          if (!config) return null;
          
          return (
            <div
              key={achievement.id}
              className="group relative inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full text-xs hover:from-yellow-500/30 hover:to-orange-500/30 transition-all cursor-default"
              data-testid={`achievement-badge-${achievement.achievementType}`}
            >
              <span className="text-sm">{config.icon}</span>
              <span className="font-semibold text-yellow-200">{config.name}</span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-yellow-500/50 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {config.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
