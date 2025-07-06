import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { CreatePostModal } from '@/components/Post/CreatePostModal';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Trophy, 
  User, 
  Settings, 
  Plus,
  BarChart3,
  Brain,
  LogOut,
  Search,
  Shield
} from 'lucide-react';
import skynoteLogoPath from "@assets/Illustration_1751238437347.png";

export const LeftSidebar: React.FC = () => {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Discover Books', href: '/discover', icon: Search },
    { name: 'Reading Progress', href: '/progress', icon: BarChart3 },
    { name: 'Book Quizzes', href: '/quizzes', icon: Brain },
    { name: 'Achievement Log', href: '/achievements', icon: Trophy },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Add admin navigation for admin users
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin-dashboard', icon: Shield },
  ];

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      // Show signup prompt for guests
      alert('Please sign up to create posts and unlock all features!');
      return;
    }
    setShowCreateModal(true);
  };

  return (
    <>
      <div className="fixed left-0 top-0 sidebar-width h-full bg-white border-r border-gray-200 overflow-y-auto custom-scrollbar">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={skynoteLogoPath} alt="Skynote Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Skynote</h1>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Navigation - Only visible to admin users */}
          {isAuthenticated && user?.isAdmin && (
            <>
              <div className="border-t border-gray-200 my-4"></div>
              {adminNavigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      isActive
                        ? 'text-red-600 bg-red-50'
                        : 'text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Create Button */}
        <div className="p-4 mt-auto">
          <Button
            onClick={handleCreateClick}
            className="w-full create-button text-white font-semibold py-3 px-4 rounded-full flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create !</span>
          </Button>
        </div>

        {/* User Status */}
        {isAuthenticated && user && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500">
                  {user.points} points
                </p>
              </div>
            </div>
            <Button
              onClick={() => logout()}
              variant="outline"
              size="sm"
              className="w-full text-gray-600 hover:text-gray-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}

        {/* Guest Banner */}
        {!isAuthenticated && (
          <div className="p-4 border-t border-gray-100">
            <div className="bg-gradient-to-r from-primary to-secondary text-white p-3 rounded-lg text-center">
              <p className="text-sm font-medium mb-2">Join Skynote!</p>
              <p className="text-xs opacity-90 mb-3">
                Track your reading journey and connect with fellow book lovers
              </p>
              <Link href="/login" className="block bg-white text-primary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>

      <CreatePostModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </>
  );
};
