"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
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
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-4">
        Create a new office space for your team
      </h1>
      <p className="text-center text-gray-400 mb-10">
        Space name* (Appears at the end of URL)
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <input
          type="text"
          value={spaceName}
          onChange={(e) => setSpaceName(e.target.value)}
          placeholder="yourspacename"
          className="w-full h-14 px-5 bg-[#35354e] border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500
          focus:outline-none focus:ring-4 focus:ring-green-500/30 focus:border-green-500
          transition-all duration-300 ease-in-out text-base font-medium text-center"
          required
        />
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-gray-600/50 px-5 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-gray-600/80"
          >
            <ArrowLeft className="w-4 h-4 inline-block mr-2" />
            Back
          </button>
          <button
            type="submit"
            disabled={!spaceName.trim()}
            className="flex items-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Create space</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
