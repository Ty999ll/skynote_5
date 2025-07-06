import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  BookOpen, 
  Palette, 
  PenTool, 
  Quote,
  Search,
  Star,
  Upload,
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
//import { useAuth } from '@/hooks/useAuth'; 

const createPostSchema = z.object({
  type: z.enum(['review', 'fanart', 'post', 'quote']),
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  bookId: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  imageUrl: z.string().optional(),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Book {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  //const { token } = useAuth();
  const [selectedType, setSelectedType] = useState<'review' | 'fanart' | 'post' | 'quote'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      type: 'review',
      content: '',
      title: '',
      rating: 0,
    },
  });

 const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostFormData) => {
      // Remove the explicit token check and passing of token
      // The apiRequest from queryClient.ts handles getting the token from localStorage
      return apiRequest('POST', '/api/posts', data); // <-- CORRECTED CALL: No token parameter here
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/books/trending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      toast({
        title: 'Success',
        description: 'Your post has been created!',
      });
      onOpenChange(false);
      form.reset();
      setSelectedBook(null);
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post',
        variant: 'destructive',
      });
    },
  });

  const searchBooks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const books = await response.json();
        setSearchResults(books);
      }
    } catch (error) {
      console.error('Failed to search books:', error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'Error',
          description: 'Image must be smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImageFile(null);
  };

  const postTypes = [
    {
      type: 'review' as const,
      icon: BookOpen,
      label: 'Review',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary',
    },
    {
      type: 'fanart' as const,
      icon: Palette,
      label: 'Fanart',
      color: 'text-accent',
      bgColor: 'bg-accent/10', 
      borderColor: 'border-accent',
    },
    {
      type: 'post' as const,
      icon: PenTool,
      label: 'Post',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      borderColor: 'border-secondary',
    },
    {
      type: 'quote' as const,
      icon: Quote,
      label: 'Quote',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500',
    },
  ];

  const onSubmit = (data: CreatePostFormData) => {
    const postData = {
      ...data,
      type: selectedType,
      bookId: selectedBook?.id,
      book: selectedBook,
      imageUrl: uploadedImage || undefined,
    };
    
     console.log("Token in localStorage right before mutation:", localStorage.getItem('skynote_token'));

    createPostMutation.mutate(postData);
  };

  const renderStars = (rating: number, onRate?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onRate?.(i + 1)}
        className={`w-6 h-6 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        } hover:text-yellow-400 transition-colors`}
      >
        <Star className="w-full h-full" />
      </button>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create New Post
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Post Type Selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {postTypes.map((postType) => {
                const Icon = postType.icon;
                const isSelected = selectedType === postType.type;
                
                return (
                  <button
                    key={postType.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(postType.type);
                      form.setValue('type', postType.type);
                    }}
                    className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                      isSelected
                        ? `${postType.borderColor} ${postType.bgColor}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${postType.color} mb-2`} />
                    <span className="text-sm font-medium text-gray-700">
                      {postType.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Book Search */}
            <div className="space-y-4">
              <FormLabel>Search for a book</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchBooks(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setSelectedBook(book);
                        setSearchQuery(book.title);
                        setSearchResults([]);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{book.title}</p>
                        <p className="text-sm text-gray-500">{book.author}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Image Upload for Fanart */}
              {selectedType === 'fanart' && (
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (for fanart)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter image URL..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Selected Book */}
              {selectedBook && (
                <div className="p-3 bg-gray-50 rounded-lg flex items-center space-x-3">
                  {selectedBook.coverUrl ? (
                    <img
                      src={selectedBook.coverUrl}
                      alt={selectedBook.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedBook.title}</p>
                    <p className="text-sm text-gray-500">{selectedBook.author}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedBook(null);
                      setSearchQuery('');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Rating for Reviews */}
            {selectedType === 'review' && (
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <div className="flex space-x-1">
                        {renderStars(field.value || 0, field.onChange)}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Give your post a title..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === 'review' && 'Write your review'}
                    {selectedType === 'fanart' && 'Describe your artwork'}
                    {selectedType === 'post' && 'What\'s on your mind?'}
                    {selectedType === 'quote' && 'Share the quote'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder={
                        selectedType === 'review' ? 'Share your thoughts about this book...' :
                        selectedType === 'fanart' ? 'Tell us about your fan art...' :
                        selectedType === 'post' ? 'Share your thoughts...' :
                        'Share an inspiring quote...'
                      }
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload for Fanart */}
            {selectedType === 'fanart' && (
              <div className="space-y-4">
                <FormLabel>Upload Image</FormLabel>
                {uploadedImage ? (
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded fanart"
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload your fanart image
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      Choose Image
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPostMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createPostMutation.isPending ? 'Posting...' : `Post ${postTypes.find(p => p.type === selectedType)?.label}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
