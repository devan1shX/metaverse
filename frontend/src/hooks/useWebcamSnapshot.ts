"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useWebcamSnapshot – periodically captures a JPEG frame from the candidate's
 * existing webcam video stream and sends it to the interviewer over WebSocket.
 *
 * ONLY runs when role === 'CANDIDATE' and the webcam stream is active.
 * Zero extra dependencies — uses canvas + existing MediaStream.
 */
export function useWebcamSnapshot(
  role: string | null,
  localStream: MediaStream | null,
  intervalMinutes: number, // 0 = disabled
  sendWebcamSnapshot: (imageDataUrl: string) => void
) {
  const isActive = role === "CANDIDATE" && intervalMinutes > 0;
  const sendRef = useRef(sendWebcamSnapshot);
  const streamRef = useRef(localStream);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { sendRef.current = sendWebcamSnapshot; }, [sendWebcamSnapshot]);
  useEffect(() => { streamRef.current = localStream; }, [localStream]);

  const captureFrame = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;

    // Grab dimensions from the track settings
    const settings = videoTracks[0].getSettings();
    const width = settings.width || 640;
    const height = settings.height || 480;

    // Create an off-screen video element to pull a frame from
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5); // 50% quality JPEG
        sendRef.current(dataUrl);
        video.pause();
        video.srcObject = null;
      }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const ms = intervalMinutes * 60 * 1000;
    // First snapshot after 30 seconds
    const initial = setTimeout(() => captureFrame(), 30_000);
    intervalRef.current = setInterval(captureFrame, ms);

    return () => {
      clearTimeout(initial);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, intervalMinutes, captureFrame]);
}
