'use client'

import { AppleAuth } from '@/components/AppleAuth'
import { motion } from 'framer-motion'

export default function AuthPage() {
  return (
    <main className="min-h-screen">
      <motion.div
        key="auth"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AppleAuth />
      </motion.div>
    </main>
  );
}