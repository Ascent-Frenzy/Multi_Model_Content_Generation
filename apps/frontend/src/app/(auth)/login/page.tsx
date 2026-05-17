'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/lib/api/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ email, password });
      router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-black px-4">
      <Card className="w-full max-w-md bg-surface-slate border border-white/10 rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display text-white">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-text">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-canvas-black border-white/20 rounded-sm text-white placeholder:text-secondary-text focus:border-jelly-mint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-text">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-canvas-black border-white/20 rounded-sm text-white placeholder:text-secondary-text focus:border-jelly-mint"
              />
            </div>
            {error && (
              <p className="text-sm text-ultraviolet">{error}</p>
            )}
            <Button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-jelly-mint text-black font-bold rounded-xl hover:bg-jelly-mint/80 transition-colors"
            >
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-secondary-text">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-jelly-mint hover:text-deep-link-blue transition-colors">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
