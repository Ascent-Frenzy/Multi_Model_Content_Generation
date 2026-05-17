'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRegister } from '@/lib/api/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await register.mutateAsync({ email, password });
      router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-black px-4">
      <Card className="w-full max-w-md bg-surface-slate border border-white/10 rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display text-white">Create Account</CardTitle>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-text">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-canvas-black border-white/20 rounded-sm text-white placeholder:text-secondary-text focus:border-jelly-mint"
              />
            </div>
            {error && (
              <p className="text-sm text-ultraviolet">{error}</p>
            )}
            <Button
              type="submit"
              disabled={register.isPending}
              className="w-full bg-jelly-mint text-black font-bold rounded-xl hover:bg-jelly-mint/80 transition-colors"
            >
              {register.isPending ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-secondary-text">
            Already have an account?{' '}
            <Link href="/login" className="text-jelly-mint hover:text-deep-link-blue transition-colors">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
