import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password is required')
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const destination = useMemo(() => (location.state as { from?: Location })?.from?.pathname ?? '/', [location.state]);

  const passwordForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  async function submitPassword(values: LoginValues) {
    setError(null);
    try {
      await auth.loginWithPassword(values.email, values.password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    setError(null);
    setGoogleLoading(true);
    const token = credentialResponse?.credential;
    if (!token) {
      setError('Google did not return a valid token. Please try again.');
      setGoogleLoading(false);
      return;
    }

    try {
      await auth.loginWithGoogle(token);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
    setGoogleLoading(false);
  };

  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hero-panel relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.35),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_30%),linear-gradient(135deg,#0b1220,#121a2f_45%,#1f2b48)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-200">
                <ShieldCheck className="h-4 w-4" />
                Secure access
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">Welcome back to the Nurtured Choice command center.</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
                Sign in to manage customers, products, invoices, and inventory with real API-backed data and protected routes.
              </p>
            </div>

          </div>
        </section>

        <Card className="flex flex-col justify-center p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/5 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
              <Sparkles className="h-3.5 w-3.5" />
              Protected access
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Password login works immediately with the seeded admin user. Or continue with Google for instant access.</p>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}

          <form className="space-y-4" onSubmit={passwordForm.handleSubmit(submitPassword)}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
              <Input {...passwordForm.register('email')} type="email" />
              {passwordForm.formState.errors.email ? <p className="text-xs text-rose-500">{passwordForm.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
              <Input {...passwordForm.register('password')} type="password" />
              {passwordForm.formState.errors.password ? <p className="text-xs text-rose-500">{passwordForm.formState.errors.password.message}</p> : null}
            </div>
            <Button type="submit" className="w-full">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-200 dark:border-white/10" />
            <div className="relative mx-auto w-max bg-white px-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:bg-slate-950/90 dark:text-slate-400">Or continue with Google</div>
          </div>

          <div className="w-full">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>
        </Card>
      </div>
    </div>
  );
}
