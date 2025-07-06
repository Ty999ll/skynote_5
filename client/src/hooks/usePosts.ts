import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Post {
  id: number;
  userId: number;
  type: string;
  title?: string;
  content: string;
  imageUrl?: string;
  rating?: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatar?: string;
  };
  book?: {
    id: number;
    title: string;
    author: string;
    coverUrl?: string;
  };
}

export const usePosts = (type?: string) => {
  return useQuery<Post[]>({
    queryKey: ['/api/posts/feed', type],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useUserPosts = (userId: number) => {
  return useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useLikedPosts = (userId: number) => {
  return useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/liked-posts`],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUserReposts = (userId: number) => {
  return useQuery<Post[]>({
    queryKey: [`/api/users/${userId}/reposts`],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest('POST', '/api/posts', postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest('POST', `/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
    },
  });
};

export const useRepost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, comment }: { postId: number; comment?: string }) => {
      return apiRequest('POST', `/api/posts/${postId}/repost`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
    },
  });
};
