import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen, Star, Plus, Clock, TrendingUp } from 'lucide-react';
import { Book } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const BookDiscoveryPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: trendingBooks = [] } = useQuery<Book[]>({
    queryKey: ['/api/books/trending'],
    staleTime: 10 * 60 * 1000,
  });

  const { data: recentBooks = [] } = useQuery<Book[]>({
    queryKey: ['/api/books/recent'],
    staleTime: 5 * 60 * 1000,
  });

  const searchBooks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addToReadingListMutation = useMutation({
    mutationFn: async ({ book, status }: { book: Book; status: 'want-to-read' | 'reading' }) => {
      const token = localStorage.getItem('skynote_token');
      
      // First, ensure the book exists in our database
      let bookId = book.id;
      
      if (!bookId) {
        // Book is from search results, need to create it first
        const createBookResponse = await fetch('/api/books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
          body: JSON.stringify({
            title: book.title,
            author: book.author,
            isbn: book.isbn || '',
            coverUrl: book.coverUrl || '',
            description: book.description || '',
            averageRating: book.averageRating || '0',
            ratingsCount: book.ratingsCount || 0,
            openLibraryKey: book.openLibraryKey || null,
          }),
        });

        if (!createBookResponse.ok) {
          throw new Error('Failed to save book to database');
        }

        const createdBook = await createBookResponse.json();
        bookId = createdBook.id;
      }

      // Now create the book log
      const response = await fetch('/api/book-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          bookId,
          status,
          progress: status === 'reading' ? 0 : 0,
          startDate: status === 'reading' ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add book to reading list');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      const statusText = variables.status === 'want-to-read' ? 'Want to Read' : 'Currently Reading';
      toast({
        title: "Book Added",
        description: `Book added to ${statusText} list successfully!`,
      });
      
      // Invalidate reading progress queries to refresh the Reading Progress page
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'book-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'reading-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add book to reading list. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addToReadingList = (book: Book, status: 'want-to-read' | 'reading') => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add books to your reading list.",
        variant: "destructive",
      });
      return;
    }

    addToReadingListMutation.mutate({ book, status });
  };

  const BookCard: React.FC<{ book: Book; showAddButton?: boolean }> = ({ book, showAddButton = true }) => (
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`${book.title} cover`}
              className="w-20 h-28 object-cover rounded flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
              {book.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              by {book.author}
            </p>
            
            {book.averageRating && (
              <div className="flex items-center space-x-1 mb-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-700">
                  {book.averageRating}
                </span>
                <span className="text-xs text-gray-500">
                  ({book.ratingsCount} reviews)
                </span>
              </div>
            )}

            {book.description && (
              <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                {book.description}
              </p>
            )}

            {showAddButton && (
              <div className="flex flex-col space-y-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToReadingList(book, 'want-to-read')}
                  className="flex items-center justify-center space-x-2 w-full"
                  disabled={addToReadingListMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                  <span>Want to Read</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => addToReadingList(book, 'reading')}
                  className="flex items-center justify-center space-x-2 w-full"
                  disabled={addToReadingListMutation.isPending}
                >
                  <Clock className="w-4 h-4" />
                  <span>Start Reading</span>
                </Button>
              </div>
            )}
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
            Discover Books
          </h1>
          <p className="text-gray-600">
            Find your next great read from our extensive book collection
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search for books, authors, genres..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchBooks(e.target.value);
              }}
              className="pl-10 text-lg h-12"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Search Results
              {isSearching && (
                <span className="ml-2 text-sm text-gray-500">(Searching...)</span>
              )}
            </h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : !isSearching && (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No books found matching your search.</p>
                <p className="text-sm">Try different keywords or browse our collections below.</p>
              </div>
            )}
          </div>
        )}

        {/* Book Collections */}
        <Tabs defaultValue="trending" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="trending" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Trending</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Recent</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Trending Books
              </h2>
              <p className="text-gray-600 mb-6">
                Popular books that readers are talking about right now
              </p>
              {trendingBooks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No trending books available right now.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Recently Added
              </h2>
              <p className="text-gray-600 mb-6">
                New books that have been recently added to our collection
              </p>
              {recentBooks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent books available.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};