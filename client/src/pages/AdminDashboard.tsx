/**
 * Admin Dashboard - The beast that nearly broke us!
 * 
 * Author: Tyrell Stephenson (ID: 166880) - Week 4 sprint  
 * Contributor: Nicole Muraguri (ID: 161061) - UI components & styling
 * 
 * This admin panel was supposed to be "simple" but ended up being our most
 * complex feature. Authentication middleware, role-based access, content moderation...
 * Tyrell spent 3 straight days debugging the user management endpoints.
 * 
 * Fun fact: The content reporting system was Nicole's idea after she got tired
 * of manually checking inappropriate posts during testing!
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, Shield, Flag, Settings, BarChart3, UserCheck, 
  UserX, Trash2, Eye, CheckCircle, XCircle, Mail, Bell,
  Book, MessageSquare, Heart, Repeat
} from "lucide-react";

interface ContentReport {
  id: number;
  type: string;
  reason: string;
  description: string;
  reportedBy: number;
  contentId: number;
  status: string;
  createdAt: string;
  reviewedBy?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  points: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  emailVerified: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalBooks: number;
  totalReports: number;
  pendingReports: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({
    username: "",
    email: "",
    password: "",
    displayName: ""
  });

  // Redirect if not admin
  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user?.isAdmin,
  });

  // Fetch content reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<ContentReport[]>({
    queryKey: ["/api/admin/reports"],
    enabled: !!user?.isAdmin,
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  // Update report status mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: number; status: string }) => {
      return apiRequest("PUT", `/api/admin/reports/${reportId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelectedReport(null);
      toast({
        title: "Report updated",
        description: "Report status has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    },
  });

  // Create admin user mutation
  const createAdminMutation = useMutation({
    mutationFn: async (adminData: any) => {
      return apiRequest("POST", "/api/auth/register-admin", {
        ...adminData,
        adminKey: "skynote-admin-2025"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setNewAdminForm({ username: "", email: "", password: "", displayName: "" });
      toast({
        title: "Admin created",
        description: "New administrator account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account.",
        variant: "destructive",
      });
    },
  });

  // Toggle user admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User admin status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User removed",
        description: "User has been successfully removed from the platform.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user.",
        variant: "destructive",
      });
    },
  });

  const handleReportAction = (reportId: number, status: string) => {
    updateReportMutation.mutate({ reportId, status });
  };

  const handleCreateAdmin = () => {
    if (!newAdminForm.username || !newAdminForm.email || !newAdminForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createAdminMutation.mutate(newAdminForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "reviewed":
        return <Badge variant="outline">Reviewed</Badge>;
      case "resolved":
        return <Badge variant="default">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, content, and platform settings</p>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold">{stats.totalPosts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Book className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Books</p>
                  <p className="text-2xl font-bold">{stats.totalBooks || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Flag className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold">{stats.pendingReports || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reports">Content Reports</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="admins">Admin Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Content Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Content Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : reports && reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((report: ContentReport) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{report.type}</Badge>
                          {getStatusBadge(report.status)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReportAction(report.id, "resolved")}
                                disabled={updateReportMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReportAction(report.id, "dismissed")}
                                disabled={updateReportMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Reason:</strong> {report.reason}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Description:</strong> {report.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Reported on {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No content reports found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : users && users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((user: User) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{user.displayName}</h3>
                            <Badge variant="outline">@{user.username}</Badge>
                            {user.isAdmin && <Badge variant="default">Admin</Badge>}
                            {user.emailVerified && <Badge variant="secondary">Verified</Badge>}
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            {user.points} points • {user.followersCount} followers • 
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={user.isAdmin ? "destructive" : "default"}
                            onClick={() => 
                              toggleAdminMutation.mutate({ 
                                userId: user.id, 
                                isAdmin: !user.isAdmin 
                              })
                            }
                            disabled={toggleAdminMutation.isPending}
                          >
                            {user.isAdmin ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently remove user "${user.displayName}" (@${user.username})? This action cannot be undone and will delete all their posts, comments, and data.`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove User
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Management Tab */}
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Create New Administrator</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newAdminForm.username}
                        onChange={(e) => setNewAdminForm(prev => ({
                          ...prev,
                          username: e.target.value
                        }))}
                        placeholder="admin_username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAdminForm.email}
                        onChange={(e) => setNewAdminForm(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        placeholder="admin@skynote.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newAdminForm.password}
                        onChange={(e) => setNewAdminForm(prev => ({
                          ...prev,
                          password: e.target.value
                        }))}
                        placeholder="Strong password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={newAdminForm.displayName}
                        onChange={(e) => setNewAdminForm(prev => ({
                          ...prev,
                          displayName: e.target.value
                        }))}
                        placeholder="Administrator Name"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateAdmin}
                    disabled={createAdminMutation.isPending}
                    className="mt-4"
                  >
                    {createAdminMutation.isPending ? "Creating..." : "Create Administrator"}
                  </Button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Current Administrators</h3>
                  {users && (
                    <div className="space-y-2">
                      {users.filter((user: User) => user.isAdmin).map((admin: User) => (
                        <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{admin.displayName}</p>
                            <p className="text-sm text-gray-600">@{admin.username} • {admin.email}</p>
                          </div>
                          <Badge variant="default">Administrator</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Platform Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-center py-8">Loading analytics...</div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                      <div className="text-sm text-gray-600">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.totalPosts}</div>
                      <div className="text-sm text-gray-600">Total Posts</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{stats.totalBooks}</div>
                      <div className="text-sm text-gray-600">Total Books</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{stats.totalReports}</div>
                      <div className="text-sm text-gray-600">Total Reports</div>
                    </div>
                  </div>

                  {/* Activity Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Platform Activity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Active Users</span>
                          <span className="font-semibold">{stats.activeUsers}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(stats.activeUsers / stats.totalUsers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Pending Reports</span>
                          <span className="font-semibold">{stats.pendingReports}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{ width: stats.totalReports > 0 ? `${(stats.pendingReports / stats.totalReports) * 100}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] })}>
                        Refresh Data
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] })}>
                        Reload Reports
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })}>
                        Refresh Users
                      </Button>
                      <Button variant="outline" size="sm">
                        Export Data
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                  <p className="text-gray-600">Unable to load platform analytics.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}