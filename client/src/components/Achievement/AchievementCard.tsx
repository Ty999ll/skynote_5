import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Lock, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Achievement {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  requirement: any;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

interface AchievementCardProps {
  achievement: Achievement;
  isGuest?: boolean;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ 
  achievement, 
  isGuest = false 
}) => {
  const getProgressPercentage = () => {
    if (achievement.isUnlocked) return 100;
    if (!achievement.requirement?.count) return 0;
    return Math.min((achievement.progress / achievement.requirement.count) * 100, 100);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bookworm': return 'bg-secondary text-secondary-foreground';
      case 'critic': return 'bg-accent text-accent-foreground';
      case 'social': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBorderStyle = () => {
    if (isGuest) return 'border-gray-200 opacity-75';
    if (achievement.isUnlocked) return 'achievement-unlocked border-secondary';
    return 'achievement-locked border-gray-200';
  };

  const getIconElement = () => {
    const iconClass = achievement.isUnlocked ? 'text-secondary' : 'text-gray-400';
    
    // Map icon strings to actual icons based on category
    switch (achievement.category) {
      case 'bookworm':
        return <div className={`w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center ${iconClass}`}>📚</div>;
      case 'critic':
        return <div className={`w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center ${iconClass}`}>⭐</div>;
      case 'social':
        return <div className={`w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center ${iconClass}`}>👥</div>;
      default:
        return <div className={`w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center ${iconClass}`}>🏆</div>;
    }
  };

  return (
    <Card className={`achievement-card p-6 border-2 ${getBorderStyle()}`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-4">
          {getIconElement()}
          <div className="flex items-center space-x-2">
            {achievement.isUnlocked && !isGuest ? (
              <CheckCircle className="w-5 h-5 text-secondary" />
            ) : isGuest ? (
              <Lock className="w-5 h-5 text-gray-400" />
            ) : (
              <Clock className="w-5 h-5 text-gray-400" />
            )}
            <Badge variant="secondary" className={getCategoryColor(achievement.category)}>
              {achievement.points} XP
            </Badge>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 mb-2">
          {achievement.name}
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {achievement.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>
              {isGuest ? 'Sign up to track progress' : 
               achievement.isUnlocked ? 'Complete!' :
               `${achievement.progress}/${achievement.requirement?.count || 0} ${achievement.requirement?.type?.replace('_', ' ') || ''}`}
            </span>
            <span>
              {isGuest ? '0%' : `${Math.round(getProgressPercentage())}%`}
            </span>
          </div>
          <Progress 
            value={isGuest ? 0 : getProgressPercentage()} 
            className="h-2"
          />
        </div>

        {/* Status */}
        <p className="text-xs font-medium">
          {isGuest ? (
            <span className="text-gray-400">Create account to unlock</span>
          ) : achievement.isUnlocked && achievement.unlockedAt ? (
            <span className="text-secondary">
              Unlocked: {formatDistanceToNow(new Date(achievement.unlockedAt))} ago
            </span>
          ) : (
            <span className="text-purple-600">
              {getProgressPercentage() >= 90 ? 'Almost there!' : 'In progress...'}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
};
