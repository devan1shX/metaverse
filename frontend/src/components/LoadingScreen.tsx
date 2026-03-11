'use client'

import { motion } from 'framer-motion'

export function LoadingScreen() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass-panel flex min-w-[240px] flex-col items-center rounded-[28px] px-10 py-9"
      >
        <div className="mb-5 flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -4, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.12,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <p className="font-display text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
          Entering space
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Syncing the world around you
        </p>
      </motion.div>
    </div>
  )
}
