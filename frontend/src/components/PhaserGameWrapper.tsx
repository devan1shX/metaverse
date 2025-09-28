"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { GameScene } from "./GameScene";

export default function PhaserGameWrapper({
  avatarUrl,
}: {
  avatarUrl?: string;
}) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentElement = gameRef.current;
    if (
      !parentElement ||
      phaserGameRef.current ||
      typeof window === "undefined"
    )
      return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: parentElement.clientWidth,
      height: parentElement.clientHeight,
      parent: parentElement,
      backgroundColor: "#1a1a2e",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false,
        },
      },
      render: {
        pixelArt: true,
        antialias: false,
      },
      scene: GameScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    phaserGameRef.current = new Phaser.Game(config);

    if (phaserGameRef.current) {
      phaserGameRef.current.registry.set("avatarUrl", avatarUrl);
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [avatarUrl]);

  return <div ref={gameRef} className="absolute inset-0 w-full h-full" />;
}
