import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
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

const registerSchema = z.object({
  displayName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phoneNumber: z.string().optional(),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your password')
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const destination = useMemo(() => (location.state as { from?: Location })?.from?.pathname ?? '/', [location.state]);

  const passwordForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' }
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

  async function submitRegister(values: RegisterValues) {
    setError(null);
    try {
      await auth.register(values.displayName, values.email, values.password, values.confirmPassword, values.phoneNumber);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
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
              <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">Your sales operation, ready for its next move.</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
                Create your team account or sign in to manage customers, products, invoices, and inventory with real API-backed data.
              </p>
            </div>

          </div>
        </section>

        <Card className="flex flex-col justify-center p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/5 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {mode === 'login' ? <Sparkles className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {mode === 'login' ? 'Protected access' : 'New team account'}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{mode === 'login' ? 'Use your password or continue with Google to access the command center.' : 'Get started with a Viewer account. An administrator can update your role later.'}</p>
          </div>

          {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}

          {mode === 'register' ? <form className="space-y-4" onSubmit={registerForm.handleSubmit(submitRegister)}>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label><Input {...registerForm.register('displayName')} placeholder="Jane Wanjiku" />{registerForm.formState.errors.displayName ? <p className="text-xs text-rose-500">{registerForm.formState.errors.displayName.message}</p> : null}</div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label><Input {...registerForm.register('email')} type="email" placeholder="jane@company.co.ke" />{registerForm.formState.errors.email ? <p className="text-xs text-rose-500">{registerForm.formState.errors.email.message}</p> : null}</div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone <span className="font-normal text-slate-400">(optional)</span></label><Input {...registerForm.register('phoneNumber')} placeholder="+254 700 000 000" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label><Input {...registerForm.register('password')} type="password" />{registerForm.formState.errors.password ? <p className="text-xs text-rose-500">{registerForm.formState.errors.password.message}</p> : null}</div><div className="space-y-2"><label className="text-sm font-medium text-slate-700 dark:text-slate-200">Confirm password</label><Input {...registerForm.register('confirmPassword')} type="password" />{registerForm.formState.errors.confirmPassword ? <p className="text-xs text-rose-500">{registerForm.formState.errors.confirmPassword.message}</p> : null}</div></div>
            <Button type="submit" variant="primary" className="w-full">Create account <ArrowRight className="h-4 w-4" /></Button>
          </form> : <form className="space-y-4" onSubmit={passwordForm.handleSubmit(submitPassword)}>
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
          </form>}

          {mode === 'login' ? <div className="relative my-6">
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-200 dark:border-white/10" />
            <div className="relative mx-auto w-max bg-white px-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:bg-slate-950/90 dark:text-slate-400">Or continue with Google</div>
          </div> : null}

          {mode === 'login' ? <div className="w-full">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div> : null}

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            {mode === 'login' ? 'New to Nurtured Choice?' : 'Already have an account?'}{' '}
            <button type="button" className="font-semibold text-[#c9473b] hover:text-[#a83b31]" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in instead'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
