import { useState, useRef, useCallback } from 'react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../config/supabase'
import { ZoomIn, ZoomOut } from 'lucide-react'

export default function CropModal({ profile, onUpdate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [imgSrc, setImgSrc] = useState('')
  const [scale, setScale] = useState(100)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef(null)
  const areaRef = useRef(null)

  function openModal(input) {
    const f = input.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast('Image must be under 10MB', 'er'); return }
    setFile(f)
    setPos({ x: 0, y: 0 })
    setScale(100)
    const reader = new FileReader()
    reader.onload = e => setImgSrc(e.target.result)
    reader.readAsDataURL(f)
    setOpen(true)
    input.value = ''
  }

  function onMouseDown(e) {
    setDragging(true)
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y })
  }

  function onMouseMove(e) {
    if (!dragging) return
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  function onMouseUp() {
    setDragging(false)
  }

  function onWheel(e) {
    e.preventDefault()
    setScale(s => Math.min(300, Math.max(100, s + (e.deltaY < 0 ? 8 : -8))))
  }

  async function save() {
    if (!file || !imgRef.current || !areaRef.current) return
    const size = 400
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    const areaRect = areaRef.current.getBoundingClientRect()
    const imgRect = imgRef.current.getBoundingClientRect()
    const sx = (areaRect.left - imgRect.left) * (imgRef.current.naturalWidth / imgRect.width)
    const sy = (areaRect.top - imgRect.top) * (imgRef.current.naturalHeight / imgRect.height)
    const sw = areaRect.width * (imgRef.current.naturalWidth / imgRect.width)
    const sh = areaRect.height * (imgRef.current.naturalHeight / imgRect.height)

    ctx.drawImage(imgRef.current, Math.max(0, sx), Math.max(0, sy), Math.max(1, sw), Math.max(1, sh), 0, 0, size, size)

    setOpen(false)
    toast('Uploading photo…', 'inf')

    canvas.toBlob(async blob => {
      try {
        const ext = file.name.split('.').pop() || 'png'
        const filePath = `avatars/${user.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, { upsert: true, contentType: `image/${ext}` })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        await onUpdate({ photo_url: publicUrl })
        toast('Profile photo updated! ✓', 'ok')
      } catch (err) {
        toast('Upload failed. Check Storage bucket "avatars" exists.', 'er')
        console.error(err)
      }
    }, 'image/png')
  }

  // Expose to window
  if (typeof window !== 'undefined') {
    window.__cropModal = { open: openModal, close: () => setOpen(false) }
  }

  if (!open) return null

  const scalePercent = scale / 100

  return (
    <div className="ov" onMouseUp={onMouseUp}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="mh"><div className="mt2">Crop Profile Photo</div></div>
        <div className="mb2">
          <div
            id="crop_area"
            ref={areaRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onWheel={onWheel}
            style={{ userSelect: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <img
              ref={imgRef}
              id="crop_img"
              src={imgSrc}
              alt="crop"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scalePercent})`,
                transformOrigin: 'center center',
              }}
            />
            <div className="crop-overlay">
              <div className="crop-circle"></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <ZoomOut size={14} color="var(--tx3)" />
            <input
              type="range"
              min="100"
              max="300"
              value={scale}
              onChange={e => setScale(parseInt(e.target.value))}
              style={{ flex: 1, height: 4, accentColor: 'var(--ac)' }}
            />
            <ZoomIn size={14} color="var(--tx3)" />
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--tx3)', textAlign: 'center', marginTop: 6 }}>
            Drag to reposition · Scroll to zoom
          </div>
        </div>
        <div className="mf">
          <button className="btn bg2 bsm" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn bp bsm" onClick={save}>Use Photo</button>
        </div>
      </div>
    </div>
  )
}
