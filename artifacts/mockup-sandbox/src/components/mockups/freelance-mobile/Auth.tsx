import React, { useState } from 'react';
import { PhoneFrame } from './_shared/PhoneFrame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Apple } from 'lucide-react';
import './_group.css';

export function Auth() {
  const [tab, setTab] = useState<'signin'|'signup'>('signin');
  const [role, setRole] = useState<'hiring'|'freelancer'>('hiring');

  return (
    <PhoneFrame dir="ltr" className="bg-[var(--fm-bg-light)]">
      <div className="min-h-full flex flex-col text-[var(--fm-text-light)] px-6 pt-8 pb-12">
        <h1 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-[var(--fm-primary)] to-[var(--fm-primary-blue)]">
          Khidma
        </h1>

        {/* Tabs */}
        <div className="flex mb-8 border-b border-gray-200">
          <button 
            className={`flex-1 pb-3 text-lg font-semibold transition-all ${tab === 'signin' ? 'text-[var(--fm-primary)] border-b-2 border-[var(--fm-primary)]' : 'text-gray-400'}`}
            onClick={() => setTab('signin')}
          >
            Sign In
          </button>
          <button 
            className={`flex-1 pb-3 text-lg font-semibold transition-all ${tab === 'signup' ? 'text-[var(--fm-primary)] border-b-2 border-[var(--fm-primary)]' : 'text-gray-400'}`}
            onClick={() => setTab('signup')}
          >
            Sign Up
          </button>
        </div>

        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Mail className="h-5 w-5" />
              </div>
              <Input 
                type="email" 
                placeholder="Email address" 
                className="h-14 pl-11 bg-white border-gray-200 rounded-2xl text-base focus-visible:ring-[var(--fm-primary)]"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-5 w-5" />
              </div>
              <Input 
                type="password" 
                placeholder="Password" 
                className="h-14 pl-11 bg-white border-gray-200 rounded-2xl text-base focus-visible:ring-[var(--fm-primary)]"
              />
            </div>
            
            {tab === 'signin' && (
              <div className="flex justify-end">
                <a href="#" className="text-sm font-medium text-[var(--fm-primary)] hover:underline">Forgot password?</a>
              </div>
            )}
          </div>

          <Button 
            className="w-full h-14 text-lg font-bold rounded-2xl text-white border-none shadow-[0_8px_20px_rgba(91,62,255,0.25)] hover:opacity-90 transition-opacity"
            style={{ background: 'var(--fm-gradient-brand)' }}
          >
            Continue
          </Button>

          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or continue with</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 bg-white rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50">
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 40.009 -11.514 38.989 -14.754 38.989 C -19.444 38.989 -23.494 41.689 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
              Google
            </Button>
            <Button variant="outline" className="h-12 bg-white rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50">
              <Apple className="w-5 h-5 mr-2" />
              Apple
            </Button>
          </div>
        </div>

        {tab === 'signup' && (
          <div className="mt-8 bg-gray-50 p-1.5 rounded-2xl flex relative">
            <button 
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all z-10 ${role === 'hiring' ? 'bg-white text-[var(--fm-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('hiring')}
            >
              I'm hiring
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all z-10 ${role === 'freelancer' ? 'bg-white text-[var(--fm-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('freelancer')}
            >
              I'm a freelancer
            </button>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
