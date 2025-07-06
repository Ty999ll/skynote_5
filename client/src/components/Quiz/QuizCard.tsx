import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Trophy, Book } from 'lucide-react';

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

interface QuizCardProps {
  quiz: Quiz;
  onTakeQuiz: (quizId: number) => void;
  onViewResults?: (quizId: number) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, onTakeQuiz, onViewResults }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {quiz.title}
            </CardTitle>
            {quiz.bookTitle && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Book className="w-4 h-4 mr-1" />
                <span className="font-medium">{quiz.bookTitle}</span>
                {quiz.author && <span className="ml-1">by {quiz.author}</span>}
              </div>
            )}
          </div>
          <Badge className={getDifficultyColor(quiz.difficulty)}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {quiz.description}
        </p>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{quiz.timeLimit} min</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{quiz.participantCount} taken</span>
            </div>
            <div className="flex items-center">
              <Trophy className="w-4 h-4 mr-1" />
              <span>{quiz.averageScore}% avg</span>
            </div>
          </div>
          <span className="text-xs">
            {quiz.questionCount} questions
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Created by <span className="font-medium">{quiz.createdBy}</span>
          </div>
          <div className="flex space-x-2">
            {onViewResults && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewResults(quiz.id)}
              >
                Results
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onTakeQuiz(quiz.id)}
              className="bg-primary hover:bg-primary/90"
            >
              Take Quiz
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};