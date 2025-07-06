/**
 * Quiz System - The most complex feature we built!
 * 
 * Authors: Both Nicole Muraguri (ID: 161061) & Tyrell Stephenson (ID: 166880)
 * Week 3-4: This took us FOREVER to get right. The timer logic was a nightmare.
 * 
 * Nicole handled the UI/UX while Tyrell debugged the backend quiz submission endpoints.
 * We literally stayed up until 3 AM testing different quiz scenarios.
 * The real literature questions were Tyrell's idea - he's actually read most of these books!
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuizCard } from '@/components/Quiz/QuizCard';
import { Clock, Users, Trophy, BookOpen, Plus, Search, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Quiz {
  id: number;
  title: string;
  description: string;
  bookId?: number;
  bookTitle?: string;
  author?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  timeLimit: number;
  participantCount: number;
  averageScore: number;
  createdBy: string;
  createdAt: string;
}

interface QuizQuestion {
  id: number;
  quizId: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  order: number;
  createdAt: string;
}

interface CreateQuizForm {
  title: string;
  description: string;
  bookId?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

export const QuizPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizExpired, setQuizExpired] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    pointsEarned: number;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['/api/quizzes'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: myQuizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['/api/quizzes/my', user?.id],
    enabled: !!user,
  });

  const { data: quizQuestions = [] } = useQuery<QuizQuestion[]>({
    queryKey: [`/api/quizzes/${selectedQuiz?.id}/questions`],
    enabled: !!selectedQuiz,
  });

  // Initialize answers array when questions are loaded
  useEffect(() => {
    if (quizQuestions.length > 0 && selectedQuiz && answers.length === 0) {
      setAnswers(new Array(quizQuestions.length).fill(-1));
    }
  }, [quizQuestions.length, selectedQuiz, answers.length]);

  // Timer functionality
  useEffect(() => {
    if (selectedQuiz && quizStartTime && !quizExpired) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000);
        const remaining = selectedQuiz.timeLimit * 60 - elapsed; // timeLimit is in minutes
        
        if (remaining <= 0) {
          setQuizExpired(true);
          setTimeRemaining(0);
          clearInterval(timer);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [selectedQuiz, quizStartTime, quizExpired]);

  const createQuizMutation = useMutation({
    mutationFn: async (quiz: CreateQuizForm) => {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quiz),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quizzes'] });
      setShowCreateForm(false);
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({ quizId, answers, timeSpent }: { quizId: number; answers: number[]; timeSpent: number }) => {
      const response = await apiRequest('POST', `/api/quizzes/${quizId}/submit`, { answers, timeSpent });
      return response.json();
    },
    onSuccess: (result) => {
      // Calculate correct answers for display
      let correctCount = 0;
      answers.forEach((answer, index) => {
        if (answer === quizQuestions[index]?.correctAnswer) {
          correctCount++;
        }
      });

      setQuizResults({
        score: result.score,
        pointsEarned: result.pointsEarned,
        correctAnswers: correctCount,
        totalQuestions: quizQuestions.length,
      });

      // Invalidate queries to update points in leaderboard and user profile
      queryClient.invalidateQueries({ queryKey: ['/api/quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id] });
      }
    },
  });

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (quiz.bookTitle && quiz.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTakeQuiz = (quizId: number) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      setSelectedQuiz(quiz);
      setCurrentQuestion(0);
      setQuizStartTime(new Date());
      setTimeRemaining(quiz.timeLimit * 60); // Initialize timer
      setQuizExpired(false);
      // Set answers array after questions are loaded
    }
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    if (selectedQuiz && quizStartTime) {
      const timeSpent = Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000);
      submitQuizMutation.mutate({
        quizId: selectedQuiz.id,
        answers,
        timeSpent,
      });
    }
  };

  const CreateQuizForm: React.FC = () => {
    const [formData, setFormData] = useState<CreateQuizForm>({
      title: '',
      description: '',
      difficulty: 'medium',
      timeLimit: 15,
      questions: [
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
        }
      ],
    });

    const addQuestion = () => {
      setFormData({
        ...formData,
        questions: [
          ...formData.questions,
          {
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
          }
        ],
      });
    };

    const updateQuestion = (index: number, field: string, value: any) => {
      const newQuestions = [...formData.questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      setFormData({ ...formData, questions: newQuestions });
    };

    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
      const newQuestions = [...formData.questions];
      newQuestions[questionIndex].options[optionIndex] = value;
      setFormData({ ...formData, questions: newQuestions });
    };

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                  setFormData({ ...formData, difficulty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your quiz"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
            <Input
              id="timeLimit"
              type="number"
              min="5"
              max="120"
              value={formData.timeLimit}
              onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg">Questions</Label>
              <Button onClick={addQuestion} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            {formData.questions.map((question, questionIndex) => (
              <Card key={questionIndex} className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`question-${questionIndex}`}>
                      Question {questionIndex + 1}
                    </Label>
                    <Input
                      id={`question-${questionIndex}`}
                      value={question.question}
                      onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                      placeholder="Enter your question"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={question.correctAnswer === optionIndex}
                          onChange={() => updateQuestion(questionIndex, 'correctAnswer', optionIndex)}
                        />
                        <Input
                          value={option}
                          onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => createQuizMutation.mutate(formData)}
              disabled={createQuizMutation.isPending}
            >
              {createQuizMutation.isPending ? 'Creating...' : 'Create Quiz'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (showCreateForm) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <CreateQuizForm />
        </div>
      </MainLayout>
    );
  }

  // Quiz Results Display
  if (quizResults) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
              <p className="text-gray-600">Great job on completing the quiz</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {quizResults.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {quizResults.totalQuestions - quizResults.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Incorrect Answers</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {quizResults.pointsEarned}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Points Earned</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {quizResults.score}%
                </div>
                <div className="text-gray-600">Your Score</div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => {
                    setQuizResults(null);
                    setSelectedQuiz(null);
                    setCurrentQuestion(0);
                    setAnswers([]);
                    setQuizStartTime(null);
                    setTimeRemaining(null);
                    setQuizExpired(false);
                  }}
                >
                  Take Another Quiz
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedQuiz) {
                      setQuizResults(null);
                      handleTakeQuiz(selectedQuiz.id);
                    }
                  }}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (selectedQuiz && quizQuestions.length > 0) {
    const currentQ = quizQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
    


    // Safety check for currentQ
    if (!currentQ) {
      return (
        <MainLayout>
          <div className="max-w-4xl mx-auto p-6">
            <Card>
              <CardContent className="text-center p-8">
                <p>Loading question... (Debug: Index {currentQuestion} of {quizQuestions.length})</p>
                <pre className="text-xs mt-2 text-left overflow-auto max-h-32">
                  {JSON.stringify({ currentQuestion, quizQuestions }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      );
    }

    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{selectedQuiz.title}</CardTitle>
                <Badge>{selectedQuiz.difficulty}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {quizQuestions.length}
                </p>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className={`text-sm font-medium ${timeRemaining !== null && timeRemaining < 300 ? 'text-red-500' : 'text-gray-600'}`}>
                    {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{currentQ?.question || 'Question not found'}</h3>
                <div className="space-y-2">
                  {currentQ?.options && Array.isArray(currentQ.options) ? currentQ.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        answers[currentQuestion] === index ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        checked={answers[currentQuestion] === index}
                        onChange={() => handleAnswerSelect(currentQuestion, index)}
                        className="mr-3"
                      />
                      <span>{option}</span>
                    </label>
                  )) : (
                    <p className="text-gray-500">No options available</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                
                {currentQuestion < quizQuestions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    disabled={answers[currentQuestion] === -1}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={answers.includes(-1) || submitQuizMutation.isPending || quizExpired}
                  >
                    {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quiz Expiration Modal */}
          {quizExpired && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                  <CardTitle className="text-red-600">Time's Up!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-600">
                    The quiz time limit has been reached. You can try again to improve your score.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedQuiz(null);
                        setQuizExpired(false);
                        setTimeRemaining(null);
                        setQuizStartTime(null);
                      }}
                    >
                      Back to Quizzes
                    </Button>
                    <Button
                      onClick={() => handleTakeQuiz(selectedQuiz.id)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Book Quizzes
            </h1>
            <p className="text-gray-600">
              Test your knowledge and create quizzes for fellow readers
            </p>
          </div>
          {user && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all">All Quizzes</TabsTrigger>
            {user && <TabsTrigger value="my">My Quizzes</TabsTrigger>}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {filteredQuizzes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuizzes.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    onTakeQuiz={handleTakeQuiz}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No quizzes found</p>
                <p className="text-sm">Be the first to create a quiz!</p>
              </div>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="my" className="space-y-6">
              {myQuizzes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onTakeQuiz={handleTakeQuiz}
                      onViewResults={(quizId) => {
                        // Navigate to quiz results
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">You haven't created any quizzes yet</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};