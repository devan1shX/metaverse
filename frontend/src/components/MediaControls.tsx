import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { MediaState } from '@/hooks/useMediaStream';

interface MediaControlsProps {
  mediaState: MediaState;
  toggleAudio: () => void;
  toggleVideo: () => void;
  localStream: MediaStream | null;
  error?: string | null;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  mediaState,
  toggleAudio,
  toggleVideo,
  localStream,
  error,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, mediaState.isVideoEnabled]);

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-50">
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/90 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg shadow-lg mb-2 max-w-xs text-center animate-fade-in">
          {error}
        </div>
      )}
      
      <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md p-4 rounded-full shadow-lg transition-all duration-300">
      {/* Local Video Preview - Shows when video is on */}
      <div 
        className={`relative bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 ease-in-out
          ${mediaState.isVideoEnabled ? 'w-32 h-24 opacity-100 mr-2' : 'w-0 h-0 opacity-0 mr-0'}`}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-all duration-200 shadow-md ${
            mediaState.isAudioEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-400/50'
          }`}
          title={mediaState.isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {mediaState.isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-200 shadow-md ${
            mediaState.isVideoEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-400/50'
          }`}
          title={mediaState.isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {mediaState.isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
      </div>
    </div>
    </div>
  );
};

