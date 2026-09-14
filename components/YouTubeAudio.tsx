import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { SITE_URL } from '../lib/routes';
import styles from './YouTubeAudio.module.css';

interface YouTubeAudioProps {
  /** Any YouTube URL: watch?v=, youtu.be/, /embed/ — with optional start/t param */
  url: string;
  /** Optional caption; falls back to the video title fetched from YouTube */
  title?: string;
  /** Show the song title under the kicker (default true). Set false for a compact pill. */
  showTitle?: boolean;
}

/** YouTube IFrame API player states */
const PLAYING = 1;
const BUFFERING = 3;
const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
/** If the player hasn't started this long after our play command, the browser blocked it */
const BLOCKED_TIMEOUT_MS = 2500;

function parseYouTubeUrl(raw: string): { id: string | null; start: number } {
  try {
    const u = new URL(raw, 'https://www.youtube.com');
    let id: string | null = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1).split('/')[0] || null;
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || null;
    else id = u.searchParams.get('v');
    const startRaw = u.searchParams.get('start') ?? u.searchParams.get('t') ?? '0';
    const start = parseInt(startRaw, 10) || 0;
    return { id, start };
  } catch {
    return { id: null, start: 0 };
  }
}

/**
 * "Listen to this while you read" — a YouTube video as audio-only: a play button
 * and a caption, no video.
 *
 * Uses the IFrame API over postMessage (no external script). The player is kept
 * off-screen (1×1, not display:none — hidden players don't play); our button drives
 * it and mirrors its real state.
 *
 * Some browsers (notably iOS Safari) refuse scripted playback of an iframe the
 * reader hasn't tapped. If our play command doesn't take within a couple of
 * seconds, the real player is revealed so the reader can tap it directly — after
 * that first tap, our button works too.
 */
const YouTubeAudio: React.FC<YouTubeAudioProps> = ({ url, title, showTitle = true }) => {
  const { id: videoId, start } = parseYouTubeUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [videoTitle, setVideoTitle] = useState<string | null>(title ?? null);
  const playerId = useId();

  const post = useCallback((message: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), PLAYER_ORIGIN);
  }, []);

  const clearBlockedTimer = () => {
    if (blockedTimer.current) clearTimeout(blockedTimer.current);
    blockedTimer.current = null;
  };

  const toggle = () => {
    if (isPlaying) {
      post({ event: 'command', func: 'pauseVideo', args: [] });
      return;
    }
    post({ event: 'command', func: 'playVideo', args: [] });
    // No state change soon after asking to play → the browser needs a tap inside the player
    clearBlockedTimer();
    blockedTimer.current = setTimeout(() => setRevealed(true), BLOCKED_TIMEOUT_MS);
  };

  // Handshake: once the iframe has loaded, ask the player to stream state updates to us
  const subscribe = useCallback(() => post({ event: 'listening', id: playerId }), [post, playerId]);

  // Follow the real player state so the button mirrors reality (incl. taps inside the iframe)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== PLAYER_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      let data: { event?: string; info?: { playerState?: number } | number };
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const state =
        data.event === 'onStateChange' && typeof data.info === 'number'
          ? data.info
          : data.event === 'infoDelivery' && typeof data.info === 'object'
            ? data.info?.playerState
            : undefined;
      if (typeof state !== 'number') return;
      const playing = state === PLAYING || state === BUFFERING;
      setIsPlaying(playing);
      if (playing) {
        clearBlockedTimer();
        // It played from our button after all (or the reader tapped the player): tuck it away again
        setRevealed(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      clearBlockedTimer();
    };
  }, []);

  // Fetch the title for the caption (best effort; the card works without it)
  useEffect(() => {
    if (!showTitle || title || !videoId) return;
    const ctrl = new AbortController();
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.title) setVideoTitle(d.title); })
      .catch(() => { /* offline or blocked — fine */ });
    return () => ctrl.abort();
  }, [videoId, title, showTitle]);

  if (!videoId) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  const params = new URLSearchParams({
    enablejsapi: '1',
    playsinline: '1',
    controls: '1',
    rel: '0',
    origin,
    ...(start > 0 && { start: String(start) }),
  });

  return (
    <figure className={styles.card} aria-label="Background music">
      <button
        type="button"
        className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
        onClick={toggle}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <FaPause aria-hidden="true" /> : <FaPlay aria-hidden="true" className={styles.playGlyph} />}
      </button>

      <figcaption className={`${styles.meta} ${showTitle ? '' : styles.metaCompact}`}>
        <span className={styles.kicker}>
          <span className={`${styles.bars} ${isPlaying ? styles.barsOn : ''}`} aria-hidden="true">
            <i /><i /><i />
          </span>
          {isPlaying ? 'Now playing' : 'Listen while you read'}
        </span>
        {showTitle && <span className={styles.title}>{videoTitle ?? 'Loading title…'}</span>}
      </figcaption>

      {/* Off-screen unless the browser insists on a tap inside the player */}
      <div className={`${styles.player} ${revealed ? styles.playerRevealed : ''}`}>
        {revealed && <span className={styles.hint}>Your browser needs a tap on the player itself ↓</span>}
        <iframe
          ref={iframeRef}
          id={playerId}
          src={`${PLAYER_ORIGIN}/embed/${videoId}?${params}`}
          title={videoTitle ?? 'YouTube player'}
          allow="autoplay; encrypted-media"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={subscribe}
        />
      </div>
    </figure>
  );
};

export default YouTubeAudio;
