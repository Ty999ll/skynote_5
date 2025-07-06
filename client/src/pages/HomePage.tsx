/**
 * HomePage Component - Social Feed for Skynote
 * 
 * Team: Nicole Muraguri (ID: 161061) - Frontend lead for social features
 *       Tyrell Stephenson (ID: 166880) - Authentication & API integration
 * 
 * Week 2 Progress: This was the hardest part! Getting the infinite scroll
 * to work with TanStack Query took us 2 all-nighters. Nicole figured out
 * the post filtering while Tyrell handled the authentication states.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { PostCard } from '@/components/Post/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { BookOpen, Palette, PenTool, Quote } from 'lucide-react';

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

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'explore'>('for-you');

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts/feed', activeTab],
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const tabs = [
    { id: 'for-you' as const, label: 'For You' },
    ...(isAuthenticated ? [{ id: 'following' as const, label: 'Following' }] : []),
    { id: 'explore' as const, label: 'Explore' },
  ];

  const renderGuestBanner = () => (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-8 rounded-2xl mb-8 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl mb-3">Welcome to Skynote! 📚</h3>
          <p className="text-base opacity-95 leading-relaxed max-w-md">
            Discover amazing books, share your thoughts, create fan art, and connect with a passionate community of readers
          </p>
        </div>
        <div className="flex flex-col space-y-3">
          <Link href="/register">
            <Button 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all shadow-md"
            >
              Join Community
            </Button>
          </Link>
          <Link href="/login">
            <Button 
              variant="outline"
              className="border-white text-white px-8 py-2 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition-all"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );



  const renderSkeleton = () => (
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

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Feed Tabs */}
        <div className="flex space-x-2 mb-8 bg-white rounded-xl p-2 shadow-sm">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant="ghost"
              className={`flex-1 py-3 px-4 font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'tab-active text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Guest Banner */}
        {!isAuthenticated && renderGuestBanner()}

        {/* Feed Posts */}
        {isLoading ? (
          renderSkeleton()
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'following' && isAuthenticated
                ? "Follow other users to see their posts here"
                : "Be the first to share your reading journey!"}
            </p>
            {!isAuthenticated && (
              <Link href="/register">
                <Button className="mt-4">
                  Join Skynote
                </Button>
              </Link>
            )}
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default HomePage;
