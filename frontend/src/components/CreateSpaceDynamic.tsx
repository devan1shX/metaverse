"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Building2, Coffee, Sparkles, ArrowRight } from "lucide-react";

interface CreateSpaceDynamicProps {
  onBack: () => void;
  onConfirm: (employees: number, includeMeetingRoom: boolean, includeLounge: boolean) => void;
  isGenerating: boolean;
}

export default function CreateSpaceDynamic({
  onBack,
  onConfirm,
  isGenerating,
}: CreateSpaceDynamicProps) {
  const [employees, setEmployees] = useState(10); // Default to a small team
  const [includeMeetingRoom, setIncludeMeetingRoom] = useState(true);
  const [includeLounge, setIncludeLounge] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className="w-full max-w-2xl"
    >
      <div className="text-center mb-8">
        <p className="surface-label mb-3">Dynamic Office</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-2">
          Design your Workspace
        </h1>
        <p className="text-[var(--text-muted)]">
          Tell us how big your team is, and our algorithm will perfectly scale a pristine 
          office environment for you automatically.
        </p>
      </div>

      <div className="card p-8 mb-8 space-y-8 relative overflow-hidden">
        {isGenerating && (
          <div className="absolute inset-0 bg-[rgba(15,21,32,0.8)] backdrop-blur-md z-10 flex flex-col items-center justify-center rounded-2xl">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent mb-4"></div>
            <h3 className="text-lg font-medium text-[var(--accent-strong)] flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Generating Metaverse...
            </h3>
            <p className="text-sm text-[var(--text-soft)] mt-2">Placing desks, adding walls, brewing coffee...</p>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-4">
            <Users className="w-4 h-4" />
            Team Size ({employees} Employees)
          </label>
          <input
            type="range"
            min="3"
            max="150"
            value={employees}
            onChange={(e) => setEmployees(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent) ${
                (employees / 150) * 100
              }%, var(--bg-hover) ${(employees / 150) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-[var(--text-soft)] mt-2 font-medium">
            <span>Startup (3)</span>
            <span>Scale-up (50)</span>
            <span>Enterprise (150)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${includeMeetingRoom ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Include Meeting Room</p>
                <p className="text-xs text-[var(--text-soft)]">Adds a collaborative space for your team</p>
              </div>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={includeMeetingRoom}
                onChange={() => setIncludeMeetingRoom(!includeMeetingRoom)}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:after:bg-white"></div>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${includeLounge ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-500'}`}>
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Include Lounge Area</p>
                <p className="text-xs text-[var(--text-soft)]">Adds a cozy break space with sofas and coffee</p>
              </div>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={includeLounge}
                onChange={() => setIncludeLounge(!includeLounge)}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:after:bg-white"></div>
            </div>
          </label>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex gap-4 items-start">
           <div className="bg-[rgba(239,188,130,0.1)] p-2 rounded-lg text-[var(--accent)] shrink-0 mt-1">
             <Building2 className="w-5 h-5" />
           </div>
           <div>
             <h4 className="font-medium text-[var(--text-primary)] mb-1">What happens next?</h4>
             <p className="text-sm text-[var(--text-muted)] leading-relaxed">
               We will use an AI-assisted procedural engine to stitch modular Tiled map chunks together.
               This generates {employees} working desks {includeMeetingRoom ? "+ Meeting Room " : ""}{includeLounge ? "+ Lounge " : ""} 
               automatically! 
             </p>
           </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="btn-ghost"
        >
          Back
        </button>
        <button
          onClick={() => onConfirm(employees, includeMeetingRoom, includeLounge)}
          disabled={isGenerating}
          className="btn-success flex items-center gap-2"
        >
          Generate Dynamic Map
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
