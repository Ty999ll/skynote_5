import { useQuery } from '@tanstack/react-query';

export interface Achievement {
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

export const useAchievements = () => {
  return useQuery<Achievement[]>({
    queryKey: ['/api/achievements'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserAchievements = (userId: number) => {
  return useQuery<Achievement[]>({
    queryKey: [`/api/users/${userId}/achievements`],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUserStats = (userId: number) => {
  return useQuery({
    queryKey: [`/api/users/${userId}/stats`],
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
