import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { PostCard } from '@/components/Post/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { Lock, User, Edit2, UserPlus, UserMinus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const profileEditSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name must be less than 50 characters'),
  bio: z.string().max(200, 'Bio must be less than 200 characters').optional(),
  currentlyReading: z.string().max(100, 'Currently reading must be less than 100 characters').optional(),
  favoriteQuote: z.string().max(200, 'Favorite quote must be less than 200 characters').optional(),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

interface User {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  currentlyReading?: string;
  favoriteQuote?: string;
  points: number;
  followersCount: number;
  followingCount: number;
}

interface Post {
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
  user: User;
  book?: {
    id: number;
    title: string;
    author: string;
    coverUrl?: string;
  };
}

const ProfilePage: React.FC = () => {
  const params = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'likes' | 'reposts' | 'following'>('posts');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const profileUserId = params.userId ? parseInt(params.userId) : currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  const { data: profileUser, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${profileUserId}`],
    enabled: !!profileUserId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: [`/api/users/${profileUserId}/posts`],
    enabled: !!profileUserId && activeTab === 'posts',
  });

  const { data: likedPosts = [], isLoading: likedLoading } = useQuery<Post[]>({
    queryKey: [`/api/users/${profileUserId}/liked-posts`],
    enabled: !!profileUserId && activeTab === 'likes' && isAuthenticated && isOwnProfile,
  });

  const { data: following = [], isLoading: followingLoading } = useQuery<User[]>({
    queryKey: [`/api/users/${profileUserId}/following`],
    enabled: !!profileUserId && activeTab === 'following',
  });

  const { data: userReposts = [], isLoading: repostsLoading } = useQuery<Post[]>({
    queryKey: [`/api/users/${profileUserId}/reposts`],
    enabled: !!profileUserId && activeTab === 'reposts',
  });

  const { data: isFollowing, isLoading: followStatusLoading } = useQuery<{ following: boolean }>({
    queryKey: [`/api/users/${profileUserId}/follow-status`],
    enabled: !!profileUserId && !isOwnProfile && isAuthenticated,
  });

  const editProfileMutation = useMutation({
    mutationFn: async (data: ProfileEditFormData) => {
      return apiRequest('PUT', `/api/users/${profileUserId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}`] });
      setIsEditDialogOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/users/${profileUserId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}/follow-status`] });
      toast({
        title: "Success",
        description: `You are now following ${profileUser?.displayName}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/users/${profileUserId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}/follow-status`] });
      toast({
        title: "Success",
        description: `You unfollowed ${profileUser?.displayName}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfollow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      displayName: profileUser?.displayName || '',
      bio: profileUser?.bio || '',
      currentlyReading: profileUser?.currentlyReading || '',
      favoriteQuote: profileUser?.favoriteQuote || '',
    },
  });

  const onSubmit = (data: ProfileEditFormData) => {
    editProfileMutation.mutate(data);
  };

  if (userLoading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Card className="p-8 mb-6">
            <div className="flex items-start space-x-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!profileUser) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Card className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              User not found
            </h3>
            <p className="text-gray-600">
              The user you're looking for doesn't exist.
            </p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    { id: 'posts' as const, label: 'Posts' },
    ...(isAuthenticated && isOwnProfile ? [{ id: 'likes' as const, label: 'Likes' }] : []),
    { id: 'reposts' as const, label: 'Reposts' },
    { id: 'following' as const, label: 'Following' },
  ];

  const renderGuestLimitation = (tabName: string) => (
    <div className="text-center py-12 border-t border-gray-200">
      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h4 className="font-semibold text-gray-700 mb-2">Sign up to see more</h4>
      <p className="text-sm text-gray-500 mb-4">
        Create an account to view {tabName} and interact with content
      </p>
      <Link href="/register">
        <Button>
          Join Skynote
        </Button>
      </Link>
    </div>
  );

  const renderTabContent = () => {
    const isLoading = activeTab === 'posts' ? postsLoading : 
                     activeTab === 'likes' ? likedLoading : 
                     followingLoading;

    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      );
    }

    switch (activeTab) {
      case 'posts':
        return posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts yet</p>
          </div>
        );

      case 'likes':
        if (!isAuthenticated || !isOwnProfile) {
          return renderGuestLimitation('liked posts');
        }
        return likedPosts.length > 0 ? (
          <div className="space-y-6">
            {likedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No liked posts yet</p>
          </div>
        );

      case 'reposts':
        if (repostsLoading) {
          return (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-64 w-full rounded-lg mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          );
        }
        return userReposts.length > 0 ? (
          <div className="space-y-6">
            {userReposts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No reposts yet</p>
          </div>
        );

      case 'following':
        if (!isAuthenticated && !isOwnProfile) {
          return renderGuestLimitation('following list');
        }
        return following.length > 0 ? (
          <div className="space-y-4">
            {following.map((user) => (
              <div key={user.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg">
                <Link href={`/profile/${user.id}`}>
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.displayName} avatar`}
                      className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                      <span className="text-white font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <Link href={`/profile/${user.id}`}>
                    <h4 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">{user.displayName}</h4>
                  </Link>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.points} points</p>
                  <p className="text-xs text-gray-500">{user.followersCount} followers</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Not following anyone yet</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <Card className="p-8 mb-6">
          <div className="flex items-start space-x-6">
            {/* Profile Avatar */}
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt={`${profileUser.displayName} avatar`}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-medium">
                  {profileUser.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {profileUser.displayName}
              </h2>
              <p className="text-gray-600 mb-3">@{profileUser.username}</p>
              
              {profileUser.bio && (
                <p className="text-gray-700 mb-4">{profileUser.bio}</p>
              )}
              
              {(profileUser.currentlyReading || profileUser.favoriteQuote) && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {profileUser.currentlyReading && (
                    <>
                      <p className="text-sm text-gray-600 mb-1">Currently Reading</p>
                      <p className="font-medium text-gray-900 mb-2">{profileUser.currentlyReading}</p>
                    </>
                  )}
                  {profileUser.favoriteQuote && (
                    <>
                      <p className="text-sm text-gray-600 mb-1">Favorite Quote</p>
                      <p className="text-sm text-gray-700 italic">"{profileUser.favoriteQuote}"</p>
                    </>
                  )}
                </div>
              )}
              
              {/* Stats */}
              <div className="flex space-x-6 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-semibold text-gray-900">{profileUser.points}</span> points
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{profileUser.followersCount}</span> followers
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{profileUser.followingCount}</span> following
                </div>
              </div>
              
              {/* Action Buttons */}
              {isOwnProfile ? (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="displayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your display name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell us about yourself..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="currentlyReading"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currently Reading</FormLabel>
                              <FormControl>
                                <Input placeholder="What book are you reading?" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="favoriteQuote"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Favorite Quote</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Your favorite book quote..."
                                  className="min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={editProfileMutation.isPending}>
                            {editProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex space-x-2">
                  {isAuthenticated ? (
                    <Button 
                      onClick={() => isFollowing?.following ? unfollowMutation.mutate() : followMutation.mutate()}
                      disabled={followMutation.isPending || unfollowMutation.isPending || followStatusLoading}
                      variant={isFollowing?.following ? "outline" : "default"}
                      className="flex items-center space-x-2"
                    >
                      {isFollowing?.following ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>{unfollowMutation.isPending ? 'Unfollowing...' : 'Unfollow'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{followMutation.isPending ? 'Following...' : 'Follow'}</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button variant="outline">
                        Sign up to follow
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Profile Tabs */}
        <Card className="mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant="ghost"
                className={`flex-1 py-4 px-6 font-medium rounded-none border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <CardContent className="p-6">
            {renderTabContent()}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
