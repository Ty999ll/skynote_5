import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Star } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LeaderboardUser {
  id: number;
  displayName: string;
  username: string;
  points: number;
  avatar?: string;
}

interface TrendingBook {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
  averageRating: string;
  ratingsCount: number;
  reviewCount: number;
}

export const RightSidebar: React.FC = () => {
  const { data: leaderboard = [] } = useQuery<LeaderboardUser[]>({
    queryKey: ['/api/leaderboard'],
    staleTime: 30 * 1000, // 30 seconds - refresh frequently for real-time points
  });

  const { data: trendingBooks = [] } = useQuery<TrendingBook[]>({
    queryKey: ['/api/books/trending'],
    staleTime: 60 * 1000, // 1 minute - refresh frequently for real-time review counts
  });

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'rank-1';
      case 1: return 'rank-2';  
      case 2: return 'rank-3';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed right-0 top-0 right-sidebar-width h-full bg-white border-l border-gray-200 overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search books, users..."
            className="pl-10 w-full"
          />
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.slice(0, 5).map((user, index) => (
              <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`leaderboard-rank text-white rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(index)}`}>
                  {index + 1}
                </div>
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={`${user.displayName} avatar`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.points.toLocaleString()} points
                  </p>
                </div>
              </div>
            ))}
            
            {leaderboard.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No users yet</p>
                <p className="text-xs">Be the first to join!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Books */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Trending Books
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trendingBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors trending-item"
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`${book.title} cover`}
                    className="w-12 h-16 object-cover rounded book-cover"
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Cover</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {book.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {book.author}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-primary font-medium">
                      {book.averageRating}★
                    </span>
                    <span className="text-xs text-gray-500">
                      • {book.reviewCount || 0} reviews
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {trendingBooks.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No trending books</p>
                <p className="text-xs">Check back later!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional trending tags - NO HASHTAGS, only book-related content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Popular Genres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Fantasy</Badge>
              <Badge variant="secondary" className="text-xs">Romance</Badge>
              <Badge variant="secondary" className="text-xs">Mystery</Badge>
              <Badge variant="secondary" className="text-xs">Sci-Fi</Badge>
              <Badge variant="secondary" className="text-xs">Non-Fiction</Badge>
              <Badge variant="secondary" className="text-xs">Biography</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
