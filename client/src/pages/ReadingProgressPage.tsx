import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Clock, Star, Calendar, Target, TrendingUp } from 'lucide-react';
import { BookLog, Book } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export const ReadingProgressPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<BookLog | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: bookLogs = [] } = useQuery<BookLog[]>({
    queryKey: ['/api/users', user?.id, 'book-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('skynote_token');
      const response = await fetch(`/api/users/${user?.id}/book-logs`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error('Failed to fetch book logs:', response.status);
        return [];
      }
      
      return response.json();
    },
    enabled: !!user,
  });

  type ReadingStats = {
    yearlyGoal: number;
    // add other stats properties if needed
  };

  const { data: readingStats } = useQuery<ReadingStats>({
    queryKey: ['/api/users', user?.id, 'reading-stats'],
    enabled: !!user,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ logId, updates }: { logId: number; updates: Partial<BookLog> }) => {
      const token = localStorage.getItem('skynote_token');
      const response = await fetch(`/api/book-logs/${logId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'book-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'reading-stats'] });
      setSelectedLog(null);
      setIsUpdating(false);
    },
  });

  const currentlyReading = Array.isArray(bookLogs) ? bookLogs.filter(log => log.status === 'reading') : [];
  const wantToRead = Array.isArray(bookLogs) ? bookLogs.filter(log => log.status === 'want-to-read') : [];
  const finished = Array.isArray(bookLogs) ? bookLogs.filter(log => log.status === 'finished') : [];

  const updateProgress = (logId: number, progress: number) => {
    const status = progress >= 100 ? 'finished' : 'reading';
    updateProgressMutation.mutate({
      logId,
      updates: {
        progress,
        status,
        finishDate: progress >= 100 ? new Date().toISOString() : undefined,
      },
    });
  };

  const changeStatus = (logId: number, newStatus: 'want-to-read' | 'reading' | 'finished') => {
    const updates: any = { status: newStatus };
    
    if (newStatus === 'reading') {
      updates.progress = 0;
      updates.startDate = new Date().toISOString();
    } else if (newStatus === 'finished') {
      updates.progress = 100;
      updates.finishDate = new Date().toISOString();
    } else if (newStatus === 'want-to-read') {
      updates.progress = 0;
      updates.startDate = null;
      updates.finishDate = null;
    }
    
    updateProgressMutation.mutate({ logId, updates });
  };



  const BookLogCard: React.FC<{ log: BookLog }> = ({ log }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          {log.book?.coverUrl ? (
            <img
              src={log.book.coverUrl}
              alt={`${log.book.title} cover`}
              className="w-16 h-22 object-cover rounded flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-22 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
              {log.book?.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              by {log.book?.author}
            </p>
            
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant={
                  log.status === 'reading' ? 'default' :
                  log.status === 'finished' ? 'secondary' : 'outline'
                }
              >
                {log.status === 'want-to-read' ? 'Want to Read' :
                 log.status === 'reading' ? 'Reading' : 'Finished'}
              </Badge>
              {log.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{log.rating}/5</span>
                </div>
              )}
            </div>

            {log.status === 'reading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{log.progress}%</span>
                </div>
                <Progress value={log.progress} className="h-2" />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateProgress(log.id, Math.min(log.progress + 10, 100))}
                  >
                    +10%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLog(log)}
                  >
                    Update
                  </Button>
                </div>
              </div>
            )}



            {log.finishDate && (
              <p className="text-xs text-gray-500 mt-2">
                Finished on {new Date(log.finishDate).toLocaleDateString()}
              </p>
            )}

            {/* Status transition buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {log.status === 'want-to-read' && (
                <Button
                  size="sm"
                  onClick={() => changeStatus(log.id, 'reading')}
                  className="text-xs"
                >
                </Button>
              )}
              {log.status === 'reading' && (
                <Button
                  size="sm"
                  onClick={() => changeStatus(log.id, 'finished')}
                  className="text-xs"
                >
                  Mark Finished
                </Button>
              )}
              {(log.status === 'reading' || log.status === 'finished') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(log.id, 'want-to-read')}
                  className="text-xs"
                >
                  Move to Want to Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({
    title, value, icon, color
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reading Progress
          </h1>
          <p className="text-gray-600">
            Track your reading journey and manage your book collection
          </p>
        </div>

        {/* Reading Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Currently Reading"
            value={currentlyReading.length}
            icon={<BookOpen className="w-6 h-6 text-white" />}
            color="bg-blue-500"
          />
          <StatsCard
            title="Want to Read"
            value={wantToRead.length}
            icon={<Target className="w-6 h-6 text-white" />}
            color="bg-yellow-500"
          />
          <StatsCard
            title="Books Finished"
            value={finished.length}
            icon={<Star className="w-6 h-6 text-white" />}
            color="bg-green-500"
          />
          <StatsCard
            title="Reading Goal"
            value={readingStats?.yearlyGoal || 12}
            icon={<TrendingUp className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
        </div>

        {/* Book Lists */}
        <Tabs defaultValue="reading" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="reading">
              Currently Reading ({currentlyReading.length})
            </TabsTrigger>
            <TabsTrigger value="want-to-read">
              Want to Read ({wantToRead.length})
            </TabsTrigger>
            <TabsTrigger value="finished">
              Finished ({finished.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reading" className="space-y-4">
            {currentlyReading.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentlyReading.map((log) => (
                  <BookLogCard key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No books currently being read</p>
                <p className="text-sm">Start reading from your "Want to Read" list or discover new books!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="want-to-read" className="space-y-4">
            {wantToRead.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {wantToRead.map((log) => (
                  <BookLogCard key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No books in your reading list</p>
                <p className="text-sm">Discover new books and add them to your want-to-read list!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finished" className="space-y-4">
            {finished.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {finished.map((log) => (
                  <BookLogCard key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No finished books yet</p>
                <p className="text-sm">Complete your first book to see it here!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Update Progress Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Update Reading Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="progress">Progress (%)</Label>
                  <Input
                    id="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedLog.progress}
                    onChange={(e) => {
                      const progress = parseInt(e.target.value);
                      if (!isNaN(progress)) {
                        setSelectedLog({ ...selectedLog, progress });
                      }
                    }}
                  />
                </div>
                
                {selectedLog.progress >= 100 && (
                  <div>
                    <Label htmlFor="rating">Rating (1-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      defaultValue={selectedLog.rating || ''}
                      onChange={(e) => {
                        const rating = parseInt(e.target.value);
                        if (!isNaN(rating)) {
                          setSelectedLog({ ...selectedLog, rating });
                        }
                      }}
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    onClick={() => updateProgressMutation.mutate({
                      logId: selectedLog.id,
                      updates: {
                        progress: selectedLog.progress,
                        rating: selectedLog.rating,
                        status: selectedLog.progress >= 100 ? 'finished' : 'reading',
                        finishDate: selectedLog.progress >= 100 ? new Date().toISOString() : undefined,
                      },
                    })}
                    disabled={updateProgressMutation.isPending}
                  >
                    {updateProgressMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLog(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};