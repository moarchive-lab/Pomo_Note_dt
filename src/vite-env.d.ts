/// <reference types="vite/client" />

interface Window {
  YT?: {
    Player: new (elementId: string, options: Record<string, unknown>) => YouTubePlayer;
    PlayerState: {
      PLAYING: number;
    };
  };
  onYouTubeIframeAPIReady?: () => void;
  pomoNote?: {
    getVersion: () => Promise<string>;
  };
}

interface YouTubePlayer {
  cueVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}
