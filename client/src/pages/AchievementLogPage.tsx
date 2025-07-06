import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { AchievementCard } from '@/components/Achievement/AchievementCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { Trophy } from 'lucide-react';

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

interface UserStats {
  achievementsUnlocked: number;
  totalPoints: number;
  booksRead: number;
  reviewsWritten: number;
}

const AchievementLogPage: React.FC = () => {
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'locked' | 'recent'>('all');
  
  const userId = params.userId ? parseInt(params.userId) : user?.id;

  const { data: achievements = [], isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: [`/api/users/${userId}/achievements`],
    enabled: !!userId && isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}/stats`],
    enabled: !!userId && isAuthenticated,
  });

  // Guest demo achievements
  const guestAchievements: Achievement[] = [
    {
      id: 1,
      name: "Bookworm",
      description: "Read 100 books this year",
      category: "bookworm",
      icon: "fas fa-book",
      points: 100,
      requirement: { type: "books_read", count: 100 },
      progress: 0,
      isUnlocked: false,
    },
    {
      id: 2,
      name: "Critic",
      description: "Write 50 book reviews",
      category: "critic", 
      icon: "fas fa-star",
      points: 200,
      requirement: { type: "reviews_written", count: 50 },
      progress: 0,
      isUnlocked: false,
    },
    {
      id: 3,
      name: "Social Reader",
      description: "Get 1000 followers",
      category: "social",
      icon: "fas fa-users", 
      points: 50,
      requirement: { type: "followers", count: 1000 },
      progress: 0,
      isUnlocked: false,
    },
  ];

  const filters = [
    { id: 'all' as const, label: 'All' },
    { id: 'unlocked' as const, label: 'Unlocked' },
    { id: 'locked' as const, label: 'Locked' },
    { id: 'recent' as const, label: 'Recent' },
  ];

  const filterAchievements = (achievements: Achievement[]) => {
    switch (activeFilter) {
      case 'unlocked':
        return achievements.filter(a => a.isUnlocked);
      case 'locked':
        return achievements.filter(a => !a.isUnlocked);
      case 'recent':
        return achievements
          .filter(a => a.isUnlocked && a.unlockedAt)
          .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
          .slice(0, 6);
      default:
        return achievements;
    }
  };

  const renderStatsOverview = () => {
    if (!isAuthenticated) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
            <div className="text-sm text-gray-500">Achievements Unlocked</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
            <div className="text-sm text-gray-500">Total Points</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
            <div className="text-sm text-gray-500">Books Read</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
            <div className="text-sm text-gray-500">Reviews Written</div>
          </Card>
        </div>
      );
    }

    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            {stats?.achievementsUnlocked || 0}
          </div>
          <div className="text-sm text-gray-500">Achievements Unlocked</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-secondary mb-2">
            {stats?.totalPoints?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-500">Total Points</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-accent mb-2">
            {stats?.booksRead || 0}
          </div>
          <div className="text-sm text-gray-500">Books Read</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {stats?.reviewsWritten || 0}
          </div>
          <div className="text-sm text-gray-500">Reviews Written</div>
        </Card>
      </div>
    );
  };

  const renderGuestBanner = () => (
    <div className="mt-12 skynote-gradient text-white p-8 rounded-xl text-center">
      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-90" />
      <h3 className="text-xl font-bold mb-2">Create account to track your reading achievements</h3>
      <p className="mb-6 opacity-90">
        Join thousands of readers earning badges and competing on leaderboards
      </p>
      <Link href="/register">
        <Button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
          Start Your Journey
        </Button>
      </Link>
    </div>
  );

  const achievementsToShow = isAuthenticated ? achievements : guestAchievements;
  const filteredAchievements = filterAchievements(achievementsToShow);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Achievement Log</h1>
          <p className="text-gray-600">
            Track your reading milestones and unlock new badges
          </p>
        </div>

        {/* Stats Overview */}
        {renderStatsOverview()}

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-8">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              variant={activeFilter === filter.id ? "default" : "outline"}
              className={activeFilter === filter.id ? "bg-primary text-white" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Achievement Cards Grid */}
        {achievementsLoading && isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="w-16 h-6" />
                </div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-2 w-full mb-3" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
        ) : filteredAchievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.map((achievement) => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                isGuest={!isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No achievements found
            </h3>
            <p className="text-gray-600">
              {activeFilter === 'unlocked' ? 
                "You haven't unlocked any achievements yet. Keep reading!" :
                "Start your reading journey to earn achievements!"}
            </p>
          </Card>
        )}

        {/* Guest Banner */}
        {!isAuthenticated && renderGuestBanner()}
      </div>
    </MainLayout>
  );
};

export default AchievementLogPage;
