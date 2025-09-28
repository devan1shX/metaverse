'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-apple-light-bg dark:bg-apple-dark-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <Sparkles className="w-12 h-12 text-apple-light-label dark:text-apple-dark-label animate-pulse" strokeWidth={1.5} />
      </motion.div>
    </div>
  )
}
