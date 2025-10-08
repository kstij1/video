import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Pause, Scissors, Square, Music, Download, Save, ChevronLeft, History, Crop } from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import toast from 'react-hot-toast';

const apiBase = '/api';

export default function VideoEditor() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { videos } = useVideo();
  const current = useMemo(() => videos.find(v => v.videoId === videoId), [videos, videoId]);

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cropRect, setCropRect] = useState(null); // { x, y, width, height }
  const [musicUrl, setMusicUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!current) return;
    setTrimStart(0);
    setTrimEnd(current.duration || 0);
  }, [current]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${apiBase}/videos/${videoId}/edits`, {
          credentials: 'include'
        });
        if (res.status === 401) {
          window.location.href = 'https://app.weam.ai/login';
          return;
        }
        const data = await res.json();
        setHistory(data.edits || []);
      } catch (e) {
        console.error(e);
      }
    }
    fetchHistory();
  }, [videoId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play();
      setIsPlaying(true);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    if (!trimEnd || trimEnd === 0) setTrimEnd(Math.floor(v.duration));
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime < trimStart) v.currentTime = trimStart;
    if (v.currentTime > trimEnd) {
      v.pause();
      setIsPlaying(false);
      v.currentTime = trimStart;
    }
  };

  const onTimelineChange = (val) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(val);
  };

  const submitEdits = async (downloadAfter = false) => {
    if (trimStart >= trimEnd) {
      toast.error('Invalid trim range');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/videos/${videoId}/process-edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          trimStart: Math.floor(trimStart),
          trimEnd: Math.floor(trimEnd),
          outputFormat: 'mp4',
          crop: cropRect,
          music: musicUrl || null,
        })
      });
      if (res.status === 401) {
        window.location.href = 'https://app.weam.ai/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process edits');
      toast.success('Edits saved');
      setHistory((h) => [data.edit, ...h]);
      if (downloadAfter && data.edit?.outputUrl) {
        window.open(data.edit.outputUrl, '_blank');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!current) {
    return (
      <div className="p-6">
        <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <div className="mt-6 text-gray-500">Video not found.</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="px-3 py-1.5 rounded border">← Back</Link>
          <div className="font-medium">Editing: {current.title || current.videoId}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => submitEdits(false)} disabled={loading} className="px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1">
            <Save className="h-4 w-4" /> Save
          </button>
          <button onClick={() => submitEdits(true)} disabled={loading} className="px-3 py-1.5 border rounded inline-flex items-center gap-1">
            <Download className="h-4 w-4" /> Save & Download
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Center: Player and timeline */}
        <div className="flex-1 flex flex-col items-center justify-start p-4 overflow-auto">
          <div className="w-full max-w-4xl bg-black rounded-lg overflow-hidden">
            {current.videoUrl ? (
              <video
                ref={videoRef}
                src={current.videoUrl}
                className="w-full h-auto"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                controls={false}
              />
            ) : (
              <div className="text-white p-8">Video processing...</div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3 w-full max-w-4xl">
            <button onClick={togglePlay} className="px-3 py-1.5 border rounded inline-flex items-center gap-1">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={Math.floor(duration) || 0}
                step={1}
                onChange={(e) => onTimelineChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-600 w-28 text-right">
              {Math.floor(duration)}s
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 w-full max-w-4xl">
            <div className="col-span-1">
              <label className="text-sm text-gray-600">Trim Start (s)</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={trimStart} min={0} max={trimEnd}
                onChange={(e) => setTrimStart(Number(e.target.value))} />
            </div>
            <div className="col-span-1">
              <label className="text-sm text-gray-600">Trim End (s)</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={trimEnd} min={trimStart} max={Math.floor(duration)}
                onChange={(e) => setTrimEnd(Number(e.target.value))} />
            </div>
            <div className="col-span-1">
              <label className="text-sm text-gray-600">Music URL (optional)</label>
              <input type="text" className="w-full border rounded px-2 py-1" value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)} placeholder="https://.../music.mp3" />
            </div>
          </div>
        </div>

        {/* Right: Tools and History */}
        <div className="w-80 border-l p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <div className="font-medium mb-2">Tools</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2"><Scissors className="h-4 w-4" /> Trim</div>
              </div>
              <div className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2"><Crop className="h-4 w-4" /> Crop</div>
                <button onClick={() => setCropRect({ x: 0, y: 0, width: 1, height: 1 })} className="text-sm underline">Auto</button>
              </div>
              <div className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2"><Music className="h-4 w-4" /> Music</div>
              </div>
            </div>
          </div>

          <div>
            <div className="font-medium mb-2 flex items-center gap-2"><History className="h-4 w-4" /> History</div>
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="text-sm text-gray-500">No edits yet.</div>
              )}
              {history.map((h) => (
                <div key={h.editId} className="border rounded p-2">
                  <div className="text-sm font-medium">{h.type}</div>
                  <div className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()}</div>
                  <div className="text-xs mt-1">{h.status}</div>
                  {h.outputUrl && (
                    <a href={h.outputUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 underline">Download</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


