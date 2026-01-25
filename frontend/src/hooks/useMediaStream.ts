import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCSignal, MediaStreamEvent } from './useSpaceWebSocket';

export interface MediaState {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export function useMediaStream(
  userId: string | undefined,
  spaceId: string | undefined,
  sendMediaSignal: (signalType: string, toUserId: string, data: any) => void,
  startMediaStream: (type: 'audio' | 'video', metadata?: any) => void,
  stopMediaStream: (type: 'audio' | 'video') => void
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [mediaState, setMediaState] = useState<MediaState>({
    isAudioEnabled: false,
    isVideoEnabled: false,
    isScreenSharing: false,
  });
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidate[]>>(new Map());

  // Configuration for ICE servers (STUN/TURN)
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize local stream
  const initLocalStream = useCallback(async (audio: boolean, video: boolean) => {
    try {
      if (!audio && !video) {
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        setMediaState(prev => ({
            ...prev,
            isAudioEnabled: false,
            isVideoEnabled: false
        }));
        return;
      }

      // Only request what we need, but if we already have a stream, we might need to add/remove tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio,
        video: video ? { width: { ideal: 320 }, height: { ideal: 240 } } : false,
      });

      setError(null);
      setLocalStream(stream);
      
      // Update tracks for existing peers
      peerConnections.current.forEach((pc) => {
        stream.getTracks().forEach(track => {
            // Find if there is already a sender for this track kind
          const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });

      setMediaState(prev => ({
        ...prev,
        isAudioEnabled: audio,
        isVideoEnabled: video
      }));
      
      return stream;
    } catch (err: any) {
      console.error('Error accessing media devices:', err);
      
      let errorMessage = 'Error accessing media devices';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No camera or microphone found. Please connect a device.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Camera/Microphone permission denied. Please allow access.";
      } else {
        errorMessage = `Error accessing media: ${err.message}`;
      }
      setError(errorMessage);

      // Reset state if failed
      setMediaState(prev => ({
        ...prev,
        isAudioEnabled: audio ? false : prev.isAudioEnabled,
        isVideoEnabled: video ? false : prev.isVideoEnabled
      }));
    }
  }, [localStream]);

  // Toggle Audio
  const toggleAudio = useCallback(async () => {
    const newState = !mediaState.isAudioEnabled;
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = newState;
        setMediaState(prev => ({ ...prev, isAudioEnabled: newState }));
        if (newState) startMediaStream('audio');
        else stopMediaStream('audio');
      } else {
        // Request audio track
        await initLocalStream(newState, mediaState.isVideoEnabled);
        if (newState) startMediaStream('audio');
      }
    } else {
      await initLocalStream(newState, mediaState.isVideoEnabled);
      if (newState) startMediaStream('audio');
    }
  }, [localStream, mediaState, initLocalStream, startMediaStream, stopMediaStream]);

  // Toggle Video
  const toggleVideo = useCallback(async () => {
    const newState = !mediaState.isVideoEnabled;
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
          // Just toggle enabled for privacy, but camera light might stay on
        videoTrack.enabled = newState;
        if (!newState) {
            videoTrack.stop(); // Actually stop to turn off light
            // Note: This means we need to getUserMedia again to turn it back on
             localStream.removeTrack(videoTrack);
             // Force re-init next time
             stopMediaStream('video');
        } else {
            startMediaStream('video');
        }
        setMediaState(prev => ({ ...prev, isVideoEnabled: newState }));
      } else {
        await initLocalStream(mediaState.isAudioEnabled, newState);
        if (newState) startMediaStream('video');
      }
    } else {
      await initLocalStream(mediaState.isAudioEnabled, newState);
      if (newState) startMediaStream('video');
    }
  }, [localStream, mediaState, initLocalStream, startMediaStream, stopMediaStream]);

  // Create Peer Connection
  const createPeerConnection = useCallback((targetUserId: string) => {
    if (peerConnections.current.has(targetUserId)) {
      console.log(`🔄 Reusing existing peer connection for ${targetUserId}`);
      return peerConnections.current.get(targetUserId)!;
    }

    console.log(`🔗 Creating NEW peer connection for ${targetUserId}`);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current.set(targetUserId, pc);

    // Add local tracks if available
    if (localStream) {
      console.log(`📹 Adding ${localStream.getTracks().length} local tracks to peer connection`);
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    } else {
      console.log(`⚠️ No local stream available when creating peer connection`);
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 Sending ICE candidate to ${targetUserId}`);
        sendMediaSignal('ice_candidate', targetUserId, event.candidate);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`🎥 Received remote track from ${targetUserId}:`, event.track.kind, event.streams[0]);
      const remoteStream = event.streams[0];
      if (remoteStream) {
        console.log(`✅ Setting remote stream for ${targetUserId} with ${remoteStream.getTracks().length} tracks`);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(targetUserId, remoteStream);
          console.log(`📊 Total remote streams: ${newMap.size}`);
          return newMap;
        });
      }
    };
    
    // Connection state logging
    pc.onconnectionstatechange = () => {
        console.log(`🔌 Peer connection state for ${targetUserId}: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
            console.log(`✅ WebRTC connection established with ${targetUserId}`);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            console.log(`❌ Peer connection ${pc.connectionState} for ${targetUserId}`);
        }
    };
    
    pc.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state for ${targetUserId}: ${pc.iceConnectionState}`);
    };

    return pc;
  }, [localStream, sendMediaSignal]); // Removed rtcConfig from deps as it is constant

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: WebRTCSignal) => {
    const { signal_type, from_user_id, data } = signal;
    console.log(`📥 Received WebRTC signal: ${signal_type} from ${from_user_id}`);
    
    try {
      const pc = createPeerConnection(from_user_id);

      if (signal_type === 'offer') {
        console.log(`📨 Processing offer from ${from_user_id}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`📤 Sending answer to ${from_user_id}`);
        sendMediaSignal('answer', from_user_id, answer);
        
        // Process pending candidates
        const pending = pendingCandidates.current.get(from_user_id) || [];
        for (const candidate of pending) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidates.current.delete(from_user_id);

      } else if (signal_type === 'answer') {
        console.log(`📨 Processing answer from ${from_user_id}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data));

      } else if (signal_type === 'ice_candidate') {
        console.log(`🧊 Processing ICE candidate from ${from_user_id}`);
        const candidate = new RTCIceCandidate(data);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          const pending = pendingCandidates.current.get(from_user_id) || [];
          pending.push(candidate);
          pendingCandidates.current.set(from_user_id, pending);
        }
      }
    } catch (err) {
      console.error('❌ Error handling WebRTC signal:', err);
    }
  }, [createPeerConnection, sendMediaSignal]);

  // Handle stream events (initiate connection if needed)
  const handleStreamEvent = useCallback(async (event: MediaStreamEvent) => {
    console.log(`📡 Media stream event received:`, event);
    
    if ((event.event === 'AUDIO_STREAM_STARTED' || event.event === 'VIDEO_STREAM_STARTED') && userId && event.user_id !== userId) {
        console.log(`🎬 Stream started by ${event.user_id} (${event.user_name}), initiating WebRTC connection...`);
        try {
            const pc = createPeerConnection(event.user_id);
            // Create offer because we want to receive their stream
            // (And send ours if we have one)
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            console.log(`📤 Sending WebRTC offer to ${event.user_id}`);
            sendMediaSignal('offer', event.user_id, offer);
        } catch (e) {
            console.error("❌ Error initiating WebRTC connection:", e);
        }
    } else if (event.event.includes('STOPPED')) {
        console.log(`🛑 Stream stopped by ${event.user_id}`);
        // Optional: Close connection or remove tracks
        // For now, we rely on RTCPeerConnection behavior or later cleanup
    }
  }, [createPeerConnection, sendMediaSignal, userId]);

  // Handle initial state (connect to existing streamers)
  const handleInitialState = useCallback(async (mediaInfo: any) => {
    if (!userId || !mediaInfo) return;
    
    const streams = [
        ...(mediaInfo.audio_streams || []),
        ...(mediaInfo.video_streams || [])
    ];
    
    const uniqueUsers = new Set<string>();
    streams.forEach((s: any) => {
        if (s.user_id !== userId) uniqueUsers.add(s.user_id);
    });
    
    console.log(`Processing initial media state. Found ${uniqueUsers.size} streamers.`);
    
    const userIds = Array.from(uniqueUsers);
    for (let i = 0; i < userIds.length; i++) {
        const targetUserId = userIds[i];
        if (!peerConnections.current.has(targetUserId)) {
             try {
                console.log(`Initiating connection to existing streamer ${targetUserId}`);
                const pc = createPeerConnection(targetUserId);
                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await pc.setLocalDescription(offer);
                sendMediaSignal('offer', targetUserId, offer);
            } catch (e) {
                console.error("Error connecting to existing streamer:", e);
            }
        }
    }
  }, [createPeerConnection, sendMediaSignal, userId]);

  // Cleanup
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    mediaState,
    error,
    toggleAudio,
    toggleVideo,
    handleSignal,
    handleStreamEvent,
    handleInitialState
  };
}

