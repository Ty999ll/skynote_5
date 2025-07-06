import React, { useState } from 'react';
//import { formatDistanceToNow } from 'date-fns';
import { formatPostDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  MoreHorizontal,
  Star,
  Trash2,
  Flag,
  Edit,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { CommentModal } from './CommentModal';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatar?: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
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
  book?: Book;
}

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showGuestOverlay, setShowGuestOverlay] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/posts/${post.id}/like`);
      return response.json();
    },
    onSuccess: (data) => {
      setIsLiked(data.liked);
      setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/posts/${post.id}/repost`);
      return response.json();
    },
    onSuccess: () => {
      setRepostsCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/posts`] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (reportData: { reason: string; description: string }) => {
      return apiRequest('POST', '/api/reports', {
        postId: post.id,
        reason: reportData.reason,
        description: reportData.description
      });
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. Administrators will review this content.",
      });
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    },
    onError: () => {
      toast({
        title: "Report failed",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReportPost = () => {
    setShowReportDialog(true);
  };

  const handleSubmitReport = () => {
    if (!reportReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this content.",
        variant: "destructive",
      });
      return;
    }
    
    reportMutation.mutate({
      reason: reportReason,
      description: reportDescription || `User reported this post for: ${reportReason}`
    });
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      setShowGuestOverlay(true);
      return;
    }
    likeMutation.mutate();
  };

  const handleRepost = () => {
    if (!isAuthenticated) {
      setShowGuestOverlay(true);
      return;
    }
    repostMutation.mutate();
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      setShowGuestOverlay(true);
      return;
    }
    setShowCommentModal(true);
  };

  const getPostTypeDisplay = (type: string) => {
    switch (type) {
      case 'review': return 'posted a Review';
      case 'fanart': return 'shared Fan Art';
      case 'quote': return 'shared a Quote';
      case 'post': return 'made a Post';
      default: return 'posted';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="post-card mb-6 overflow-hidden relative">
      {/* Post Header */}
      <CardContent className="p-6 pb-4">
        <div className="flex items-center space-x-3 mb-4">
          <Link href={`/profile/${post.user?.id}`}>
            {post.user?.avatar ? (
              <img
                src={post.user.avatar}
                alt={`${post.user.displayName} avatar`}
                className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                <span className="text-white font-medium">
                  {post.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${post.user?.id}`}>
              <h4 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                {post.user?.displayName || 'Unknown User'}
              </h4>
            </Link>
            <p className="text-sm text-gray-500">
              {getPostTypeDisplay(post.type)} • {formatPostDate(post.createdAt)}
            </p>
          </div>

        </div>

        {/* Post Title */}
        {post.title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {post.title}
          </h3>
        )}

        {/* Enhanced Book Information for Reviews */}
        {post.book && post.type === 'review' && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
            <div className="flex gap-4">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                {post.book.coverUrl ? (
                  <img
                    src={post.book.coverUrl}
                    alt={`${post.book.title} cover`}
                    className="w-24 h-32 object-cover rounded-lg shadow-lg ring-2 ring-white dark:ring-gray-800"
                  />
                ) : (
                  <div className="w-24 h-32 bg-gradient-to-b from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              
              {/* Book Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">
                      {post.book.title}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-300 font-medium mb-3">
                      by {post.book.author}
                    </p>
                  </div>
                </div>
                
                {/* Rating Display */}
                {post.rating && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {renderStars(post.rating)}
                    </div>
                    <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                      {post.rating}/5
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      stars
                    </span>
                  </div>
                )}
                
                {/* Review Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium">
                  <Star className="w-4 h-4 fill-current" />
                  Book Review
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular Book Information for non-reviews */}
        {post.book && post.type !== 'review' && (
          <div className="mb-4">
            {post.book.coverUrl ? (
              <img
                src={post.book.coverUrl}
                alt={`${post.book.title} cover`}
                className="w-full h-80 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">No Cover Available</span>
              </div>
            )}
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {post.book.title}
              </h3>
              <p className="text-gray-600">{post.book.author}</p>
            </div>
          </div>
        )}

        {/* Book cover and rating for reviews without specific book */}
        {post.type === 'review' && !post.book && (
          <div className="flex items-start space-x-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-20 bg-gradient-to-b from-blue-500 to-blue-700 rounded flex-shrink-0 flex items-center justify-center shadow-md">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Book Review</h4>
              {post.rating && (
                <div className="flex items-center space-x-1 mb-2">
                  {renderStars(post.rating)}
                  <span className="text-sm text-gray-600 ml-2">
                    {post.rating}/5 stars
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post Content */}
        <div className={`mb-4 ${
          post.type === 'quote' 
            ? 'text-lg italic text-gray-700 font-medium border-l-4 border-purple-400 pl-4 py-2 bg-purple-50 rounded-r-lg' 
            : 'text-gray-800'
        }`}>
          {post.type === 'quote' && (
            <span className="text-purple-600 text-2xl leading-none">"</span>
          )}
          {post.content}
          {post.type === 'quote' && (
            <span className="text-purple-600 text-2xl leading-none">"</span>
          )}
        </div>

        {/* Post Image (for fanart) */}
        {post.imageUrl && (
          <div className="mb-4">
            <img
              src={post.imageUrl}
              alt="Post content"
              className="w-full rounded-lg object-cover"
            />
          </div>
        )}
      </CardContent>

      {/* Post Actions */}
      <CardContent className="px-6 py-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-colors group ${
                isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
              disabled={likeMutation.isPending}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : 'group-hover:fill-current'}`} />
              <span className="text-sm">{likesCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.commentsCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRepost}
              className="flex items-center space-x-2 text-gray-600 hover:text-green-500 transition-colors"
              disabled={repostMutation.isPending}
            >
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm">{repostsCount}</span>
            </Button>
          </div>
          
          {/* More options menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isAuthenticated && user?.id === post.userId ? (
                <>
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-700 focus:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
              ) : isAuthenticated ? (
                <DropdownMenuItem
                  onClick={() => handleReportPost()}
                  className="text-orange-600 hover:text-orange-700 focus:text-orange-700"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report Post
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setShowGuestOverlay(true)}
                  className="text-blue-600 hover:text-blue-700 focus:text-blue-700"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Sign in to interact
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      {/* Guest Interaction Overlay */}
      {showGuestOverlay && (
        <div className="absolute inset-0 guest-overlay flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm mx-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">
              Sign up to interact
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Like, comment, and share posts with the Skynote community
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowGuestOverlay(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => window.location.href = '/login'}
                size="sm"
                className="flex-1"
              >
                Join Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <CommentModal
        open={showCommentModal}
        onOpenChange={setShowCommentModal}
        postId={post.id}
      />

      {/* Report Content Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Report Content
            </DialogTitle>
            <DialogDescription>
              Help us maintain a safe community by reporting content that violates our guidelines.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for reporting</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam or repetitive content</SelectItem>
                  <SelectItem value="harassment">Harassment or bullying</SelectItem>
                  <SelectItem value="hate_speech">Hate speech or discrimination</SelectItem>
                  <SelectItem value="inappropriate_content">Inappropriate or offensive content</SelectItem>
                  <SelectItem value="misinformation">False or misleading information</SelectItem>
                  <SelectItem value="copyright">Copyright infringement</SelectItem>
                  <SelectItem value="violence">Violence or threats</SelectItem>
                  <SelectItem value="adult_content">Adult or sexual content</SelectItem>
                  <SelectItem value="other">Other violation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="report-description">Additional details (optional)</Label>
              <Textarea
                id="report-description"
                placeholder="Provide more context about why you're reporting this content..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Reports are reviewed by our moderation team. False reports may result in account restrictions.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowReportDialog(false)}
              disabled={reportMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReport}
              disabled={!reportReason || reportMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
