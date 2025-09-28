"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Video, Mic, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SpaceLobby() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const spaceId = params.spaceId as string;

  const [userName, setUserName] = useState(user?.user_name || "Guest");
  const [isEditingName, setIsEditingName] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionsGranted(true);
      setCamOn(true);
      setMicOn(true);
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setPermissionsGranted(false);
    }
  };

  const toggleCam = () => {
    if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.enabled = !camOn);
        setCamOn(!camOn);
    }
  }

  const toggleMic = () => {
    if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.enabled = !micOn);
        setMicOn(!micOn);
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleJoin = () => {
    console.log(`Joining space ${spaceId} as ${userName}`);
    router.push("/");
  };

  if (!user) return <p>Loading user...</p>;

  return (
    <div className="min-h-screen bg-[#2a2a3e] text-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl"
      >
        <h1 className="text-4xl font-bold text-center mb-10">
          Welcome to <span className="text-purple-400">{spaceId}</span>
        </h1>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="aspect-video bg-black rounded-2xl flex items-center justify-center relative overflow-hidden border-2 border-gray-700">
            {!permissionsGranted ? (
              <div className="text-center">
                <p className="mb-4 text-gray-400">Please grant camera and microphone access.</p>
                <button
                  onClick={requestPermissions}
                  className="rounded-md bg-green-500 px-5 py-3 font-medium shadow transition-colors hover:bg-green-600"
                >
                  Request Permissions
                </button>
              </div>
            ) : (
               <>
                 <video ref={videoRef} autoPlay muted className={`w-full h-full object-cover ${!camOn ? 'hidden' : ''}`}></video>
                 {!camOn && <p className="text-gray-400">Camera is off</p>}
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${micOn ? 'bg-white/10' : 'bg-red-500'}`}>
                        <Mic size={20} />
                    </button>
                    <button onClick={toggleCam} className={`p-3 rounded-full transition-colors ${camOn ? 'bg-white/10' : 'bg-red-500'}`}>
                        <Video size={20} />
                    </button>
                 </div>
               </>
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
             <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 text-4xl flex items-center justify-center">
                {userName.charAt(0).toUpperCase()}
             </div>
             <div onClick={() => setIsEditingName(true)} className="flex items-center gap-2 cursor-pointer group mb-8">
                <span className="text-2xl font-semibold">{userName}</span>
                <Edit2 size={16} className="text-gray-400 group-hover:text-white transition-colors" />
             </div>
            <button
              onClick={handleJoin}
              disabled={!permissionsGranted}
              className="w-full max-w-xs rounded-lg bg-green-500 px-8 py-4 text-lg font-bold shadow transition-colors hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}