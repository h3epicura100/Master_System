import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Footer } from '../../components/layout/Footer';

export function LoginPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id.trim() || !password) {
      setError('Please enter both ID and password.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      await login(id, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-between p-4">
      <div className="w-full" />

      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl border border-slate-100 my-auto">
        {/* Brand Mark */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/H3-logo.svg"
            alt="H3 Logo"
            className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-md border border-slate-100"
          />
          <div>
            <h2 className="text-2xl font-bold text-pms-text leading-tight">H3MS</h2>
            <p className="text-xs text-pms-muted font-medium">H3 Management System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="User ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter your User ID"
            autoFocus
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="text-xs font-medium text-pms-danger bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            block
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Log In'}
          </Button>
        </form>

        <Footer className="mt-4 pt-3 border-t border-slate-100 text-slate-400" />
      </div>

      <div className="w-full" />
    </div>
  );
}
