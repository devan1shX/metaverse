import React, { useEffect, useRef } from 'react';

interface VideoGridProps {
  streams: Map<string, MediaStream>;
}

const VideoItem = ({ stream, userId }: { stream: MediaStream; userId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden w-48 h-36 shadow-lg border-2 border-gray-700/50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white">
        User {userId.substring(0, 4)}...
      </div>
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({ streams }) => {
  if (streams.size === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-4 flex-wrap justify-center z-40 pointer-events-none max-w-4xl px-4">
      {Array.from(streams.entries()).map(([userId, stream]) => (
        <div key={userId} className="pointer-events-auto transition-all hover:scale-105">
           <VideoItem stream={stream} userId={userId} />
        </div>
      ))}
    </div>
  );
};

