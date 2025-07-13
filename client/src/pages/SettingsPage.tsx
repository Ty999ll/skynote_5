import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Bell, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Book
} from 'lucide-react';

interface UserSettings {
  profile: {
    displayName: string;
    bio: string;
    currentlyReading: string;
    favoriteQuote: string;
    isProfilePublic: boolean;
  };
 
  reading: {
    yearlyGoal: number;
    preferredGenres: string[];
    readingReminders: boolean;
    shareProgress: boolean;
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  // const { theme, toggleTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: userSettings, isLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/settings`],
    enabled: !!user?.id,
  });

  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      currentlyReading: user?.currentlyReading || '',
      favoriteQuote: user?.favoriteQuote || '',
      isProfilePublic: true,
    },
   

    reading: {
      yearlyGoal: 24,
      preferredGenres: ['Fiction', 'Mystery'],
      readingReminders: true,
      shareProgress: true,
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<UserSettings>) => {
      return apiRequest('PUT', `/api/users/${user?.id}/settings`, updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/settings`] });
      toast({
        title: "Settings updated",
        description: "Your settings have been successfully saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest('PUT', `/api/users/${user?.id}`, profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
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

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(settings.profile);
  };

  const updateSetting = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Biography', 'History', 'Self-Help', 'Poetry',
    'Thriller', 'Horror', 'Young Adult', 'Children', 'Classic'
  ];

  const tabs = [
    { id: 'profile', label: 'Profile Customization', icon: User },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const renderProfileSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={settings.profile.displayName}
              onChange={(e) => updateSetting('profile', 'displayName', e.target.value)}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentlyReading">Currently Reading</Label>
            <Input
              id="currentlyReading"
              value={settings.profile.currentlyReading}
              onChange={(e) => updateSetting('profile', 'currentlyReading', e.target.value)}
              placeholder="What book are you reading?"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={settings.profile.bio}
            onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
            placeholder="Tell us about yourself..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="favoriteQuote">Favorite Quote</Label>
          <Textarea
            id="favoriteQuote"
            value={settings.profile.favoriteQuote}
            onChange={(e) => updateSetting('profile', 'favoriteQuote', e.target.value)}
            placeholder="Your favorite book quote..."
            className="min-h-[80px]"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Public Profile</Label>
            <p className="text-sm text-gray-500">Make your profile visible to everyone</p>
          </div>
          <Switch
            checked={settings.profile.isProfilePublic}
            onCheckedChange={(checked) => updateSetting('profile', 'isProfilePublic', checked)}
          />
        </div>

        <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </CardContent>
    </Card>
  );

          <Separator />


  const renderReadingSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="w-5 h-5" />
          Reading Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="yearlyGoal">Yearly Reading Goal</Label>
            <Input
              id="yearlyGoal"
              type="number"
              value={settings.reading.yearlyGoal}
              onChange={(e) => updateSetting('reading', 'yearlyGoal', parseInt(e.target.value) || 0)}
              placeholder="Number of books per year"
              min="1"
              max="365"
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Genres</Label>
            <Select
              value={settings.reading.preferredGenres[0] || ''}
              onValueChange={(value) => updateSetting('reading', 'preferredGenres', [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your favorite genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reading Reminders</Label>
              <p className="text-sm text-gray-500">Get reminders to keep up with your reading goal</p>
            </div>
            <Switch
              checked={settings.reading.readingReminders}
              onCheckedChange={(checked) => updateSetting('reading', 'readingReminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Share Progress</Label>
              <p className="text-sm text-gray-500">Automatically share reading milestones</p>
            </div>
            <Switch
              checked={settings.reading.shareProgress}
              onCheckedChange={(checked) => updateSetting('reading', 'shareProgress', checked)}
            />
          </div>
        </div>

        <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Reading Preferences'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
        return renderReadingSettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Settings Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}