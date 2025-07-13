import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Flag,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ContentReport {
  id: number;
  reporterId?: number;
  postId: number;
  reason: string;
  description?: string;
  status: string;
  reviewedBy?: number;
  createdAt: string;
}

const AdminPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reports');

  // Check if user is admin
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Card className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600">
              You need admin privileges to access this page.
            </p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const { data: reports = [], isLoading: reportsLoading } = useQuery<ContentReport[]>({
    queryKey: ['/api/admin/reports'],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 0, // Always fetch fresh data
  });

  interface LeaderboardUser {
    id: number;
    displayName: string;
    username: string;
    points: number;
    followersCount: number;
    isAdmin: boolean;
  }

  const { data: leaderboard = [] } = useQuery<LeaderboardUser[]>({
    queryKey: ['/api/leaderboard', 20],
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time stats
    staleTime: 0,
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: number; status: string }) => {
      return apiRequest('PUT', `/api/admin/reports/${reportId}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      
      const actionText = variables.status === 'approved' ? 'approved and post deleted' : 'updated';
      toast({
        title: 'Success',
        description: `Report ${actionText} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update report status.',
        variant: 'destructive',
      });
    },
  });

  const handleReportAction = (reportId: number, status: string) => {
    updateReportMutation.mutate({ reportId, status });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Approved</Badge>;
      case 'denied':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Denied</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderReportsTab = () => (
    <div className="space-y-6">
      {/* Reports Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {reports.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending Reports</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {reports.filter(r => r.status === 'resolved').length}
            </div>
            <div className="text-sm text-gray-500">Resolved Reports</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Flag className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {reports.length}
            </div>
            <div className="text-sm text-gray-500">Total Reports</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="text-center py-8">
              <div className="loading-pulse">Loading reports...</div>
            </div>
          ) : reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Post ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {report.reporterId ? `User ${report.reporterId}` : 'Guest'}
                    </TableCell>
                    <TableCell>{report.postId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.reason}</div>
                        {report.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {report.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(report.createdAt))} ago
                    </TableCell>
                    <TableCell>
                      {report.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReportAction(report.id, 'denied')}
                            disabled={updateReportMutation.isPending}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleReportAction(report.id, 'approved')}
                            disabled={updateReportMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Approve & Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No reports found
              </h3>
              <p className="text-gray-600">
                All content is clean! No reports to review.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((user: any, index: number) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'bg-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.points.toLocaleString()}</TableCell>
                    <TableCell>{user.followersCount}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-600">
                The leaderboard is empty.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{leaderboard.length}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {leaderboard.filter((user: any) => user.isAdmin).length}
            </div>
            <div className="text-sm text-gray-500">Admin Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {reports.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending Moderation</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {((reports.filter(r => r.status === 'resolved').length / Math.max(reports.length, 1)) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Resolution Rate</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <div className="font-medium text-green-900">Content Moderation</div>
                  <div className="text-sm text-green-700">All systems operational</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-500" />
                <div>
                  <div className="font-medium text-blue-900">User Management</div>
                  <div className="text-sm text-blue-700">Running smoothly</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-purple-500" />
                <div>
                  <div className="font-medium text-purple-900">Analytics</div>
                  <div className="text-sm text-purple-700">Data collection active</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">Online</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage content, users, and monitor platform health
          </p>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="reports">Content Reports</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            {renderReportsTab()}
          </TabsContent>

          <TabsContent value="users">
            {renderUsersTab()}
          </TabsContent>

          <TabsContent value="analytics">
            {renderAnalyticsTab()}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminPage;
