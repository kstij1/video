'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import axios from 'axios'

export default function EditorPage() {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const initialVideoUrl = search.get('videoUrl') || ''
  const threadId = search.get('threadId') || ''
  const messageId = search.get('messageId') || ''

  const videoRef = useRef<HTMLVideoElement>(null)

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 1, height: 1 })
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [duration, setDuration] = useState(5)
  const [aspect, setAspect] = useState('16:9')
  const [model, setModel] = useState('gen4_turbo')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (endTime != null) v.currentTime = Math.max(0, Math.min(endTime, startTime))
  }, [startTime, endTime])

  const applyEditsAsText = () => {
    const ops: string[] = []
    ops.push(`Trim to ${startTime}s${endTime != null ? `-${endTime}s` : ''}`)
    if (crop.width !== 1 || crop.height !== 1 || crop.x !== 0 || crop.y !== 0) {
      ops.push(`Crop to x=${crop.x}, y=${crop.y}, w=${crop.width}, h=${crop.height}`)
    }
    if (audioUrl) ops.push(`Add audio track: ${audioUrl}`)
    return ops.join('; ')
  }

  const submitRefinement = async () => {
    if (!threadId) {
      alert('Missing thread context')
      return
    }
    setSubmitting(true)
    try {
      const refinement = `Video edit refinement for message ${messageId}. ${applyEditsAsText()}`
      const res = await axios.post('/aivideo/api/video/refine', {
        threadId,
        refinement,
        duration,
        aspectRatio: aspect,
        model,
      })
      alert('Refined job created')
    } catch (e: any) {
      alert(e?.response?.data?.error || e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="h-14 border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 h-8 rounded border" onClick={() => history.back()}>Back</button>
          <div className="text-sm text-neutral-600">Video Editor</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select className="h-9" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="gen4_turbo">Runway Gen-4 Turbo</option>
            <option value="gen3">Runway Gen-3</option>
            <option value="veo3">Veo3</option>
          </select>
          <select className="h-9" value={aspect} onChange={(e) => setAspect(e.target.value)}>
            <option>16:9</option>
            <option>9:16</option>
            <option>1:1</option>
            <option>4:3</option>
            <option>3:4</option>
          </select>
          <input className="h-9 w-24" type="number" min={1} max={15} value={duration} onChange={(e) => setDuration(parseInt(e.target.value || '5'))} />
          <button className="primary" disabled={submitting} onClick={submitRefinement}>{submitting ? 'Submitting...' : 'Apply edits & Refine'}</button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        <div className="panel p-3 flex flex-col gap-3 overflow-auto">
          <div className="text-sm font-medium">Preview</div>
          {videoUrl ? (
            <video ref={videoRef} className="w-full rounded" src={videoUrl} controls />
          ) : (
            <div className="text-sm text-neutral-500">No video selected</div>
          )}
        </div>
        <div className="panel p-3 flex flex-col gap-4 overflow-auto">
          <div>
            <div className="text-sm font-medium mb-2">Trim</div>
            <div className="flex items-center gap-2 text-sm">
              <label>Start</label>
              <input className="h-8 w-24" type="number" min={0} step={0.1} value={startTime} onChange={(e) => setStartTime(parseFloat(e.target.value || '0'))} />
              <label>End</label>
              <input className="h-8 w-24" type="number" min={0} step={0.1} value={endTime ?? ''} onChange={(e) => setEndTime(e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Crop (normalized 0-1)</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2">x<input className="h-8 w-24" type="number" min={0} max={1} step={0.01} value={crop.x} onChange={(e) => setCrop({ ...crop, x: parseFloat(e.target.value || '0') })} /></label>
              <label className="flex items-center gap-2">y<input className="h-8 w-24" type="number" min={0} max={1} step={0.01} value={crop.y} onChange={(e) => setCrop({ ...crop, y: parseFloat(e.target.value || '0') })} /></label>
              <label className="flex items-center gap-2">w<input className="h-8 w-24" type="number" min={0} max={1} step={0.01} value={crop.width} onChange={(e) => setCrop({ ...crop, width: parseFloat(e.target.value || '1') })} /></label>
              <label className="flex items-center gap-2">h<input className="h-8 w-24" type="number" min={0} max={1} step={0.01} value={crop.height} onChange={(e) => setCrop({ ...crop, height: parseFloat(e.target.value || '1') })} /></label>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Audio</div>
            <input className="h-8 w-full" placeholder="Audio URL" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )
}


