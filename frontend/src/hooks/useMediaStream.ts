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
  startMediaStream: (type: 'audio' | 'video' | 'screen', metadata?: any) => void,
  stopMediaStream: (type: 'audio' | 'video' | 'screen') => void
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());

  const [mediaState, setMediaState] = useState<MediaState>({
    isAudioEnabled: false,
    isVideoEnabled: false,
    isScreenSharing: false,
  });
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidate[]>>(new Map());

  const screenConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingScreenCandidates = useRef<Map<string, RTCIceCandidate[]>>(new Map());

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
        sendMediaSignal('ice_candidate', targetUserId, { ...event.candidate.toJSON(), streamType: 'camera' });
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

  // Create Screen Peer Connection
  const createScreenConnection = useCallback((targetUserId: string, streamToAdd?: MediaStream) => {
    if (screenConnections.current.has(targetUserId)) {
      return screenConnections.current.get(targetUserId)!;
    }

    console.log(`🔗 Creating NEW screen connection for ${targetUserId}`);
    const pc = new RTCPeerConnection(rtcConfig);
    screenConnections.current.set(targetUserId, pc);

    const stream = streamToAdd || localScreenStream;
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMediaSignal('ice_candidate', targetUserId, { ...event.candidate.toJSON(), streamType: 'screen' });
      }
    };

    pc.ontrack = (event) => {
      console.log(`📺 Received remote SCREEN track from ${targetUserId}:`, event.track.kind);

      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        // Create a new stream from the track or add to existing
        const existingStream = newMap.get(targetUserId);
        if (existingStream) {
          existingStream.addTrack(event.track);
          console.log(`✅ Added track to existing screen stream for ${targetUserId} with ${existingStream.getTracks().length} tracks`);
        } else {
          const newStream = new MediaStream([event.track]);
          newMap.set(targetUserId, newStream);
          console.log(`✅ Created NEW remote screen stream for ${targetUserId}`);
        }

        console.log(`📊 Total remote screen streams: ${newMap.size}`);
        return newMap;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`💻 Screen connection state for ${targetUserId}: ${pc.connectionState}`);
    };

    return pc;
  }, [localScreenStream, sendMediaSignal]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: WebRTCSignal) => {
    const { signal_type, from_user_id, data } = signal;
    console.log(`📥 Received WebRTC signal: ${signal_type} from ${from_user_id} type: ${data.streamType}`);

    const streamType = data.streamType || 'camera';

    try {
      if (streamType === 'camera') {
        const pc = createPeerConnection(from_user_id);

        if (signal_type === 'offer') {
          console.log(`📨 Processing camera offer from ${from_user_id}`);
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`📤 Sending camera answer to ${from_user_id}`);
          sendMediaSignal('answer', from_user_id, { sdp: answer.sdp, type: answer.type, streamType: 'camera' });

          // Process pending candidates
          const pending = pendingCandidates.current.get(from_user_id) || [];
          for (const candidate of pending) {
            await pc.addIceCandidate(candidate);
          }
          pendingCandidates.current.delete(from_user_id);

        } else if (signal_type === 'answer') {
          console.log(`📨 Processing camera answer from ${from_user_id}`);
          await pc.setRemoteDescription(new RTCSessionDescription(data));

        } else if (signal_type === 'ice_candidate') {
          console.log(`🧊 Processing camera ICE candidate from ${from_user_id}`);
          const candidate = new RTCIceCandidate(data);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            const pending = pendingCandidates.current.get(from_user_id) || [];
            pending.push(candidate);
            pendingCandidates.current.set(from_user_id, pending);
          }
        }
      } else if (streamType === 'screen') {
        console.log(`📺 Processing SCREEN signal ${signal_type} from ${from_user_id}`);
        const pc = createScreenConnection(from_user_id);

        if (signal_type === 'offer') {
          console.log(`📨 Processing screen offer from ${from_user_id}`);
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`📤 Sending screen answer to ${from_user_id}`);
          sendMediaSignal('answer', from_user_id, { sdp: answer.sdp, type: answer.type, streamType: 'screen' });

          // Process pending candidates
          const pending = pendingScreenCandidates.current.get(from_user_id) || [];
          for (const candidate of pending) {
            await pc.addIceCandidate(candidate);
          }
          pendingScreenCandidates.current.delete(from_user_id);

        } else if (signal_type === 'answer') {
          console.log(`📨 Processing screen answer from ${from_user_id}`);
          await pc.setRemoteDescription(new RTCSessionDescription(data));

        } else if (signal_type === 'ice_candidate') {
          console.log(`🧊 Processing screen ICE candidate from ${from_user_id}`);
          const candidate = new RTCIceCandidate(data);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            const pending = pendingScreenCandidates.current.get(from_user_id) || [];
            pending.push(candidate);
            pendingScreenCandidates.current.set(from_user_id, pending);
          }
        }
      } else {
        console.error(`❌ Unknown WebRTC signal streamType: ${streamType} from ${from_user_id}`);
      }
    } catch (err) {
      console.error('❌ Error handling WebRTC signal:', err);
    }
  }, [createPeerConnection, createScreenConnection, sendMediaSignal]);

  // Handle stream events (initiate connection if needed)
  const handleStreamEvent = useCallback(async (event: MediaStreamEvent) => {
    console.log(`📡 Media stream event received:`, event);

    if ((event.event === 'AUDIO_STREAM_STARTED' || event.event === 'VIDEO_STREAM_STARTED') && userId && event.user_id !== userId) {
      console.log(`🎬 Stream started by ${event.user_id} (${event.user_name}), initiating camera WebRTC connection...`);
      try {
        const pc = createPeerConnection(event.user_id);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        console.log(`📤 Sending camera WebRTC offer to ${event.user_id}`);
        sendMediaSignal('offer', event.user_id, { sdp: offer.sdp, type: offer.type, streamType: 'camera' });
      } catch (e) {
        console.error("❌ Error initiating camera WebRTC connection:", e);
      }
    } else if (event.event === 'SCREEN_STREAM_STARTED' && userId && event.user_id !== userId) {
      // ONLY initiate connection if we are NOT the sender. The sender already initiated an offer!
      // Actually, since screen share is targeted, the sender initiates the offer.
      // So the receiver DOES NOT need to initiate an offer for screen shares.
      // They just wait for the 'offer' signal which is sent by `startScreenShare`.
      console.log(`🎬 Screen stream started by ${event.user_id}, waiting for offer...`);
    } else if (event.event === 'SCREEN_STREAM_STOPPED') {
      console.log(`🛑 Screen stream stopped by ${event.user_id}`);
      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(event.user_id);
        return newMap;
      });
      const pc = screenConnections.current.get(event.user_id);
      if (pc) {
        pc.close();
        screenConnections.current.delete(event.user_id);
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

    // ONLY fetch audio/video streams for initial connections,
    // because screen sharing WebRTC offers MUST be initiated by the sender,
    // not the receiver!
    const streams = [
      ...(mediaInfo.audio_streams || []),
      ...(mediaInfo.video_streams || [])
    ];

    const uniqueUsers = new Set<string>();
    streams.forEach((s: any) => {
      if (s.user_id !== userId) uniqueUsers.add(s.user_id);
    });

    console.log(`Processing initial media state. Found ${uniqueUsers.size} camera/audio streamers.`);

    const userIds = Array.from(uniqueUsers);
    for (let i = 0; i < userIds.length; i++) {
      const targetUserId = userIds[i];
      if (!peerConnections.current.has(targetUserId)) {
        try {
          console.log(`Initiating camera connection to existing streamer ${targetUserId}`);
          const pc = createPeerConnection(targetUserId);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          sendMediaSignal('offer', targetUserId, { sdp: offer.sdp, type: offer.type, streamType: 'camera' });
        } catch (e) {
          console.error("Error connecting to existing streamer:", e);
        }
      }
    }
  }, [createPeerConnection, sendMediaSignal, userId]);

  const stopScreenShare = useCallback(() => {
    if (localScreenStream) {
      localScreenStream.getTracks().forEach(track => track.stop());
      setLocalScreenStream(null);
    }
    setMediaState(prev => ({ ...prev, isScreenSharing: false }));
    stopMediaStream('screen');

    // Close screen connections
    screenConnections.current.forEach(pc => pc.close());
    screenConnections.current.clear();
    setRemoteScreenStreams(new Map());
  }, [localScreenStream, stopMediaStream]);

  const startScreenShare = useCallback(async (targetUserIds: string[]) => {
    console.log(`🚀 STARTING SCREEN SHARE to targets:`, targetUserIds);
    try {
      console.log(`1️⃣ Requesting display media...`);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      console.log(`2️⃣ Got display media stream:`, stream.id);
      setLocalScreenStream(stream);
      setMediaState(prev => ({ ...prev, isScreenSharing: true }));
      console.log(`3️⃣ Sending startMediaStream('screen') event...`);
      startMediaStream('screen');

      // when user stops screen share from browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Create connections and send offers to targets
      for (const targetUserId of targetUserIds) {
        console.log(`4️⃣ Processing target user: ${targetUserId}`);
        const pc = createScreenConnection(targetUserId, stream);
        console.log(`5️⃣ PC created for ${targetUserId}. Creating offer...`);
        // Do NOT request video from the receiver! We are only SENDING our screen.
        const offer = await pc.createOffer();
        console.log(`6️⃣ Offer created for ${targetUserId}. Setting local description...`);
        await pc.setLocalDescription(offer);
        console.log(`7️⃣ Local description set. Sending offer signal...`);
        sendMediaSignal('offer', targetUserId, { sdp: offer.sdp, type: offer.type, streamType: 'screen' });
        console.log(`✅ Started screen share successfully to ${targetUserId}`);
      }

    } catch (err) {
      console.error('❌ Error sharing screen:', err);
    }
  }, [createScreenConnection, sendMediaSignal, startMediaStream, stopScreenShare]);

  // Maintain refs for cleanup to avoid closing connections on every stream change
  const cleanupStreamsRef = useRef({ localStream, localScreenStream });
  useEffect(() => {
    cleanupStreamsRef.current = { localStream, localScreenStream };
  }, [localStream, localScreenStream]);

  // Cleanup on unmount ONLY
  useEffect(() => {
    return () => {
      const { localStream: lStream, localScreenStream: lsStream } = cleanupStreamsRef.current;
      lStream?.getTracks().forEach(track => track.stop());
      lsStream?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
      screenConnections.current.forEach(pc => pc.close());
    };
  }, []);

  return {
    localStream,
    localScreenStream,
    remoteStreams,
    remoteScreenStreams,
    mediaState,
    error,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    handleSignal,
    handleStreamEvent,
    handleInitialState
  };
}

