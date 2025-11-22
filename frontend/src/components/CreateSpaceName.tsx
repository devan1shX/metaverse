"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface CreateSpaceNameProps {
  onBack: () => void;
  onConfirm: (spaceName: string) => void;
}

export default function CreateSpaceName({
  onBack,
  onConfirm,
}: CreateSpaceNameProps) {
  const [spaceName, setSpaceName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spaceName.trim()) {
      onConfirm(spaceName.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="w-full max-w-lg"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Name Your Space
        </h1>
        <p className="text-gray-600">
          Choose a unique name for your team's virtual space
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Space Name
          </label>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="e.g., Team Headquarters, Innovation Hub"
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            transition-all duration-200 text-base"
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            This name will appear in your space URL
          </p>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            disabled={!spaceName.trim()}
            className="btn-success text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Create space</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
