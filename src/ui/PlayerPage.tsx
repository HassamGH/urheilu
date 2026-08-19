'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { getMatchDetails, getStreams } from '../api/watchfooty';
import { useAsync } from '../api/useAsync';
import { useNavigate } from '../lib/navigation';
import type { Match, Stream } from '../types';
import { ErrorBlock } from '../components/common/ErrorBlock';
import { EmptyState } from '../components/common/EmptyState';

export function PlayerPage({ matchId, streamId, initialMatch, initialStreams }: { matchId: string; streamId: string; initialMatch?: Match; initialStreams?: Stream[] }) {
  const match = useAsync((signal) => getMatchDetails(matchId, signal), [matchId], initialMatch);
  const streams = useAsync((signal) => getStreams(matchId, match.data?.sportId, signal), [matchId, match.data?.sportId], initialStreams);
  const selected = useMemo(() => streams.data?.find((stream) => stream.id === streamId), [streams.data, streamId]);

  if (streams.error) {
    return (
      <div className="fixed inset-0 bg-black grid place-content-center p-4">
        <ErrorBlock message="Unable to load available streams." onRetry={streams.retry} />
      </div>
    );
  }

  if (!streams.loading && !selected) {
    return (
      <div className="fixed inset-0 bg-black grid place-content-center p-4">
        <EmptyState text="This stream is no longer available." />
      </div>
    );
  }

  if (!selected) return <div className="fixed inset-0 bg-black" />;

  return <VideoPlayer stream={selected} matchId={matchId} />;
}

function VideoPlayer({ stream, matchId }: { stream: Stream; matchId: string }) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    const video = videoRef.current;
    if (!video || stream.type === 'embed') return;
    if (stream.type === 'hls') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream.url;
        return;
      }
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(stream.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setError('This stream could not be played.');
        });
        return () => hls.destroy();
      }
      setError('Unsupported stream format.');
      return;
    }
    if (stream.type === 'video') {
      video.src = stream.url;
      return;
    }
    setError('Unsupported stream format.');
  }, [stream]);

  if (stream.type === 'embed') {
    return (
      <div className="fixed inset-0 bg-black">
        <iframe className="w-full h-full border-0 block" title={stream.name} src={stream.url} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {error && (
        <div className="absolute inset-0 z-10 grid place-content-center gap-3 p-5 bg-black/90 text-center" role="alert">
          <p>{error}</p>
          <button className="px-4 py-2 rounded bg-white text-black font-bold cursor-pointer" onClick={() => navigate(`/match/${matchId}`)}>Try another stream</button>
        </div>
      )}
      <video className="w-full h-full border-0 block bg-black" ref={videoRef} controls playsInline onError={() => setError('This stream could not be played.')} />
    </div>
  );
}
