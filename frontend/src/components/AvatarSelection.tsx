"use client";

import { useState } from "react";
import Image from "next/image";
import { X, CheckCircle, User } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Choose Your Avatar</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Select an avatar to personalize your profile
        </p>

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
                    ? "border-indigo-500 scale-110 shadow-lg"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Image
                  src={avatarUrl}
                  alt={avatarFile}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="bg-gray-50"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-indigo-600 drop-shadow" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 btn-success flex items-center justify-center gap-2"
            disabled={!selected || selected === currentAvatar}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
