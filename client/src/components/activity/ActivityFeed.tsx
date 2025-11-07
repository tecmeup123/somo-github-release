import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useWebSocketMessage, type WebSocketMessage } from "@/contexts/WebSocketContext";
import { Activity, Trophy, Zap, TrendingUp, Flame, ExternalLink } from "lucide-react";
import { ACHIEVEMENT_CONFIG } from "@shared/schema";

interface ActivityEvent {
  id: string;
  type: 'mint' | 'transfer' | 'melt' | 'achievement';
  message: string;
  timestamp: number;
  icon: JSX.Element;
  userAddress?: string;
  x?: number;
  y?: number;
  txHash?: string;
}

const MAX_ACTIVITIES = 20;

interface ActivityFeedProps {
  userAddress?: string;
}

export default function ActivityFeed({ userAddress }: ActivityFeedProps = {}) {
  const [liveActivities, setLiveActivities] = useState<ActivityEvent[]>([]);
  
  // Fetch historical transactions
  const { data: transactions } = useQuery<any[]>({
    queryKey: ['/api/transactions/recent'],
    queryFn: async () => {
      const response = await fetch('/api/transactions/recent?limit=20');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    refetchInterval: 60000, // Reduced from 30s to 60s - WebSocket provides live updates
    staleTime: 50000,
  });

  // Convert transactions to activity events with optional filtering by user
  const historicalActivities: ActivityEvent[] = (transactions || [])
    .filter(tx => {
      // If userAddress is provided, only show activities for that user
      if (!userAddress) return true;
      
      // Show if user is the sender or receiver
      return tx.toUserAddress === userAddress || tx.fromUserAddress === userAddress;
    })
    .map((tx) => {
      const shortAddr = tx.toUserAddress 
        ? `${tx.toUserAddress.slice(0, 4)}...${tx.toUserAddress.slice(-4)}`
        : 'Unknown';
      const fromAddr = tx.fromUserAddress 
        ? `${tx.fromUserAddress.slice(0, 4)}...${tx.fromUserAddress.slice(-4)}`
        : 'Unknown';
      
      const timestamp = new Date(tx.createdAt).getTime();
      
      switch (tx.type) {
        case 'mint':
          return {
            id: tx.id,
            type: 'mint',
            message: userAddress 
              ? `You minted pixel (${tx.pixelX},${tx.pixelY})`
              : `${shortAddr} minted pixel (${tx.pixelX},${tx.pixelY})`,
            timestamp,
            icon: <Zap className="w-3 h-3 text-cyan-400" />,
            userAddress: tx.toUserAddress,
            x: tx.pixelX,
            y: tx.pixelY,
            txHash: tx.txHash,
          };
        case 'transfer':
          return {
            id: tx.id,
            type: 'transfer',
            message: userAddress 
              ? (tx.fromUserAddress === userAddress 
                  ? `You transferred pixel (${tx.pixelX},${tx.pixelY}) to ${shortAddr}`
                  : `You received pixel (${tx.pixelX},${tx.pixelY}) from ${fromAddr}`)
              : `${fromAddr} → ${shortAddr} pixel (${tx.pixelX},${tx.pixelY})`,
            timestamp,
            icon: <TrendingUp className="w-3 h-3 text-blue-400" />,
            userAddress: tx.toUserAddress,
            x: tx.pixelX,
            y: tx.pixelY,
            txHash: tx.txHash,
          };
        case 'melt':
          return {
            id: tx.id,
            type: 'melt',
            message: userAddress 
              ? `You melted pixel (${tx.pixelX},${tx.pixelY})`
              : `${fromAddr} melted pixel (${tx.pixelX},${tx.pixelY})`,
            timestamp,
            icon: <Flame className="w-3 h-3 text-red-400" />,
            userAddress: tx.fromUserAddress,
            x: tx.pixelX,
            y: tx.pixelY,
            txHash: tx.txHash,
          };
        default:
          return {
            id: tx.id,
            type: 'mint',
            message: `Activity on pixel (${tx.pixelX},${tx.pixelY})`,
            timestamp,
            icon: <Activity className="w-3 h-3 text-gray-400" />,
            x: tx.pixelX,
            y: tx.pixelY,
            txHash: tx.txHash,
          };
      }
    });

  // Merge historical and live activities, filtering live activities by user if specified
  const filteredLiveActivities = userAddress 
    ? liveActivities.filter(a => a.userAddress === userAddress)
    : liveActivities;
    
  const allActivities = [...filteredLiveActivities, ...historicalActivities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ACTIVITIES);

  const handleMessage = (message: WebSocketMessage) => {
    const timestamp = Date.now();
    let newActivity: ActivityEvent | null = null;

    switch (message.type) {
      case 'pixelClaimed':
        if (message.pixel && message.user) {
          const address = message.user.address;
          const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
          newActivity = {
            id: `${timestamp}-claim`,
            type: 'mint',
            message: `${shortAddr} claimed pixel (${message.pixel.x},${message.pixel.y})`,
            timestamp,
            icon: <Zap className="w-3 h-3 text-cyan-400" />,
            userAddress: address,
            x: message.pixel.x,
            y: message.pixel.y,
          };
        }
        break;

      case 'achievement_unlocked':
        if (message.userAddress && message.achievementType) {
          const shortAddr = `${message.userAddress.slice(0, 4)}...${message.userAddress.slice(-4)}`;
          const config = ACHIEVEMENT_CONFIG[message.achievementType as keyof typeof ACHIEVEMENT_CONFIG];
          newActivity = {
            id: `${timestamp}-achievement`,
            type: 'achievement',
            message: `${shortAddr} unlocked ${config?.icon || '🏆'} ${config?.name || 'Achievement'}`,
            timestamp,
            icon: <Trophy className="w-3 h-3 text-yellow-400" />,
            userAddress: message.userAddress,
          };
        }
        break;

      case 'pixelTransferred':
        if (message.pixel && message.user) {
          const address = message.user.address;
          const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
          newActivity = {
            id: `${timestamp}-transfer`,
            type: 'transfer',
            message: `${shortAddr} received pixel (${message.pixel.x},${message.pixel.y})`,
            timestamp,
            icon: <TrendingUp className="w-3 h-3 text-blue-400" />,
            userAddress: address,
            x: message.pixel.x,
            y: message.pixel.y,
          };
        }
        break;

      case 'pixelMelted':
        if (message.pixel && message.user) {
          const shortAddr = `${message.user.slice(0, 4)}...${message.user.slice(-4)}`;
          newActivity = {
            id: `${timestamp}-melt`,
            type: 'melt',
            message: `${shortAddr} melted pixel (${message.pixel.x},${message.pixel.y})`,
            timestamp,
            icon: <Flame className="w-3 h-3 text-red-400" />,
            userAddress: message.user,
            x: message.pixel.x,
            y: message.pixel.y,
          };
        }
        break;
    }

    if (newActivity) {
      setLiveActivities(prev => {
        // Add to live activities and remove after 30 seconds
        const updated = [newActivity!, ...prev];
        // Clean up old live activities (older than 30 seconds)
        const now = Date.now();
        return updated.filter(a => now - a.timestamp < 30000);
      });
      
      // Invalidate transactions query to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
    }
  };

  useWebSocketMessage(handleMessage);

  // Auto-remove old live activities
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLiveActivities(prev => 
        prev.filter(activity => now - activity.timestamp < 30000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setLiveActivities(prev => prev.filter(a => a.id !== id));
  };

  if (allActivities.length === 0) {
    return (
      <div className="text-center py-3 text-muted-foreground" data-testid="activity-feed-empty">
        <p className="text-xs">No recent activity</p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-1 max-h-64 overflow-y-auto"
      data-testid="activity-feed"
    >
      {allActivities.map((activity) => {
        const explorerUrl = activity.txHash 
          ? `https://pudge.explorer.nervos.org/transaction/${activity.txHash}`
          : null;
        
        return (
          <div
            key={activity.id}
            className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
            data-testid={`activity-${activity.id}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {activity.icon}
              <span className="font-medium truncate">{activity.message}</span>
            </div>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-background/50 rounded transition-colors flex-shrink-0"
                data-testid={`link-activity-tx-${activity.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3 text-primary" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
