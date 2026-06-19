import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../config/supabase'
import { ZoomIn, ZoomOut } from 'lucide-react'

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = url
  })
}

function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  return new Promise(async (resolve, reject) => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const size = 400
    canvas.width = size
    canvas.height = size

    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    const sx = pixelCrop.x * (image.naturalWidth / image.width)
    const sy = pixelCrop.y * (image.naturalHeight / image.height)
    const sw = pixelCrop.width * (image.naturalWidth / image.width)
    const sh = pixelCrop.height * (image.naturalHeight / image.height)

    ctx.drawImage(image, Math.max(0, sx), Math.max(0, sy), Math.max(1, sw), Math.max(1, sh), 0, 0, size, size)
    canvas.toBlob(blob => resolve(blob), 'image/png')
  })
}

export default function CropModal({ profile, onUpdate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropShape, setCropShape] = useState('round')
  const [preview, setPreview] = useState(null)

  function openModal(input) {
    const f = input.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast('Image must be under 10MB', 'er'); return }
    setFile(f)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropShape('round')
    setPreview(null)
    const reader = new FileReader()
    reader.onload = e => setImgSrc(e.target.result)
    reader.readAsDataURL(f)
    setOpen(true)
    input.value = ''
  }

  const [cropPixels, setCropData] = useState(null)

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCropData(croppedAreaPixels)
  }, [])

  async function handleSave() {
    if (!imgSrc || !cropPixels) return
    setPreview('loading')
    try {
      const blob = await getCroppedImg(imgSrc, cropPixels)
      setPreview(URL.createObjectURL(blob))
    } catch {
      toast('Crop failed. Try again.', 'er')
      setPreview(null)
    }
  }

  async function handleUpload() {
    if (!preview || preview === 'loading' || !file) return
    setOpen(false)
    toast('Uploading photo…', 'inf')

    try {
      const blob = await fetch(preview).then(r => r.blob())
      const ext = file.name.split('.').pop() || 'png'
      const filePath = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('Avatar')
        .upload(filePath, blob, { upsert: true, contentType: `image/${ext}` })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('Avatar')
        .getPublicUrl(filePath)

      await onUpdate({ photo_url: publicUrl })
      toast('Profile photo updated! ✓', 'ok')
    } catch (err) {
      const msg = err?.message || err?.error || 'Unknown error'
      toast('Upload failed: ' + msg, 'er')
      console.error(err)
    }
  }

  if (typeof window !== 'undefined') {
    window.__cropModal = { open: openModal, close: () => setOpen(false) }
  }

  if (!open) return null

  return (
    <div className="ov">
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mt2">{preview ? 'Preview' : 'Crop Photo'}</div>
        </div>

        {!preview ? (
          <div className="mb2">
            <div id="crop_area">
              <Cropper
                image={imgSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape={cropShape}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{ containerStyle: { width: '100%', height: '100%', position: 'relative' } }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <ZoomOut size={14} color="var(--tx3)" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, height: 4, accentColor: 'var(--ac)' }}
              />
              <ZoomIn size={14} color="var(--tx3)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <button
                className={`btn ${cropShape === 'round' ? 'bp' : 'bs'} bsm`}
                onClick={() => setCropShape('round')}
              >Circle</button>
              <button
                className={`btn ${cropShape === 'rect' ? 'bp' : 'bs'} bsm`}
                onClick={() => setCropShape('rect')}
              >Square</button>
            </div>
          </div>
        ) : (
          <div className="mb2" style={{ textAlign: 'center' }}>
            {preview === 'loading' ? (
              <div style={{ padding: 40, color: 'var(--tx3)' }}>Cropping…</div>
            ) : (
              <img src={preview} alt="preview" style={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bd)' }} />
            )}
          </div>
        )}

        <div className="mf">
          {!preview ? (
            <>
              <button className="btn bg2 bsm" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn bp bsm" onClick={handleSave}>Crop & Preview</button>
            </>
          ) : (
            <>
              <button className="btn bg2 bsm" onClick={() => { setPreview(null); URL.revokeObjectURL(preview) }}>Back</button>
              <button className="btn bp bsm" onClick={handleUpload} disabled={preview === 'loading'}>
                {preview === 'loading' ? 'Cropping…' : 'Upload'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
