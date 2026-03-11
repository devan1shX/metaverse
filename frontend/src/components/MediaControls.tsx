import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from 'lucide-react';
import { MediaState } from '@/hooks/useMediaStream';

interface MediaControlsProps {
  mediaState: MediaState;
  toggleAudio: () => void;
  toggleVideo: () => void;
  onOpenScreenShare: () => void;
  stopScreenShare: () => void;
  localStream: MediaStream | null;
  error?: string | null;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  mediaState,
  toggleAudio,
  toggleVideo,
  onOpenScreenShare,
  stopScreenShare,
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
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {/* Error Message */}
      {error && (
        <div
          className="max-w-xs rounded-full px-4 py-2 text-center text-sm shadow-lg"
          style={{
            background: "rgba(20, 27, 38, 0.92)",
            border: "1px solid rgba(239, 124, 120, 0.22)",
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}
      
      <div className="glass-bar flex items-center gap-3 rounded-full p-3 transition-all duration-300">
      {/* Local Video Preview - Shows when video is on */}
      <div 
        className={`relative overflow-hidden rounded-2xl border border-white/8 bg-black/40 transition-all duration-300 ease-in-out
          ${mediaState.isVideoEnabled ? 'mr-2 h-24 w-32 opacity-100' : 'mr-0 h-0 w-0 opacity-0'}`}
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
      <div className="flex gap-3">
        <button
          onClick={toggleAudio}
          className={`floating-control ${
            mediaState.isAudioEnabled
              ? ''
              : 'border-[rgba(239,124,120,0.24)] bg-[rgba(239,124,120,0.16)] text-[var(--danger)]'
          }`}
          title={mediaState.isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {mediaState.isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`floating-control ${
            mediaState.isVideoEnabled
              ? ''
              : 'border-[rgba(239,124,120,0.24)] bg-[rgba(239,124,120,0.16)] text-[var(--danger)]'
          }`}
          title={mediaState.isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {mediaState.isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={mediaState.isScreenSharing ? stopScreenShare : onOpenScreenShare}
          className={`floating-control ${
            mediaState.isScreenSharing
              ? 'floating-control-active'
              : ''
          }`}
          title={mediaState.isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {mediaState.isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>
      </div>
    </div>
    </div>
  );
};
