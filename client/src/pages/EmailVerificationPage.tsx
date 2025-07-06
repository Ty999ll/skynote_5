import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EmailVerificationPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Verify email with the token
    fetch(`/api/auth/verify-email?token=${token}`, {
      method: 'GET',
    })
      .then(response => response.json())
      .then(data => {
        if (data.message === 'Email verified successfully!') {
          setStatus('success');
          setMessage('Your email has been verified successfully! You can now log in.');
          toast({
            title: "Email Verified",
            description: "Your account is now active. You can log in.",
          });
          // Redirect to login after 3 seconds
          setTimeout(() => {
            setLocation('/auth/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Email verification failed.');
        }
      })
      .catch(error => {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      });
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Redirecting to login page in 3 seconds...
              </p>
              <Button 
                onClick={() => setLocation('/auth/login')}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-2">
              <Button 
                onClick={() => setLocation('/auth/register')}
                className="w-full"
                variant="outline"
              >
                Back to Registration
              </Button>
              <Button 
                onClick={() => setLocation('/auth/login')}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}