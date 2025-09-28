"use client";

import { useState } from "react";
import Image from "next/image";
import { X, CheckCircle } from "lucide-react";

const avatarOptions = ["avatar-2.png", "avatar-4.png", "avatar-5.png"];

interface AvatarSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatarUrl: string) => void;
  currentAvatar: string;
}

export function AvatarSelection({
  isOpen,
  onClose,
  onSave,
  currentAvatar,
}: AvatarSelectionProps) {
  const [selected, setSelected] = useState(currentAvatar);

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#35354e] border border-gray-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Choose Your Avatar</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
          {avatarOptions.map((avatarFile) => {
            const avatarUrl = `/avatars/${avatarFile}`;
            const isSelected = selected === avatarUrl;
            return (
              <button
                key={avatarFile}
                onClick={() => setSelected(avatarUrl)}
                className={`relative aspect-square rounded-full overflow-hidden border-4 transition-all duration-200 ${
                  isSelected
                    ? "border-green-500 scale-110"
                    : "border-transparent hover:border-gray-500"
                }`}
              >
                <Image
                  src={avatarUrl}
                  alt={avatarFile}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="bg-[#2a2a3e]"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-green-600 disabled:bg-gray-600"
          disabled={!selected || selected === currentAvatar}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
