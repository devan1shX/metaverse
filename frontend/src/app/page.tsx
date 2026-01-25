'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user) {
      // If user exists, redirect to dashboard
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // While checking for user, show a loading screen
  return <LoadingScreen />;
}
