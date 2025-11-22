'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <p className="text-indigo-600 font-semibold">Loading...</p>
      </motion.div>
    </div>
  )
}
