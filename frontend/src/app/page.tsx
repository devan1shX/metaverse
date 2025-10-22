'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { MetaverseGame } from '@/components/MetaverseGame'
import { LoadingScreen } from '@/components/LoadingScreen'
import { motion } from 'framer-motion'

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // While checking for user, show a loading screen
  if (loading || !user) {
    return <LoadingScreen />;
  }

  // If user exists, show the game
  return (
    <main className="min-h-screen">
      <motion.div
        key="game"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="h-screen"
      >
        <MetaverseGame />
      </motion.div>
    </main>
  );
}
