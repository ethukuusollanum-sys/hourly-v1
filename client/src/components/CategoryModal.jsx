import { useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext'
import { hexToRgba } from '../lib/helpers'
import { X } from 'lucide-react'

const COLORS = ['#3b82f6', '#f97316', '#a855f7', '#00d4aa', '#f43f5e', '#22c55e', '#eab308', '#06b6d4', '#ec4899', '#8b5cf6']

export default function CategoryModal({ profile, onUpdate }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const categories = profile?.categories || []

  useEffect(() => {
    if (!categories.length) return
    if (open && !editId) {
      setColor('#3b82f6')
    }
  }, [open])

  function openModal(catId) {
    if (catId) {
      const cat = categories.find(c => c.id === catId)
      if (cat) {
        setEditId(cat.id)
        setName(cat.name)
        setIcon(cat.icon || '')
        setColor(cat.color)
      }
    } else {
      setEditId(null)
      setName('')
      setIcon('')
      setColor('#3b82f6')
    }
    setOpen(true)
    setTimeout(() => document.getElementById('cm_nm')?.focus(), 80)
  }

  async function save() {
    if (!name.trim()) { toast('Category name is required', 'er'); return }

    let updated
    if (editId) {
      updated = categories.map(c => c.id === editId ? { ...c, name: name.trim(), icon: icon.trim() || '📌', color } : c)
      toast('Category updated ✓', 'ok')
    } else {
      const id = name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now()
      updated = [...categories, { id, name: name.trim(), icon: icon.trim() || '📌', color }]
      toast('Category added ✓', 'ok')
    }

    await onUpdate({ categories: updated })
    setOpen(false)
  }

  // Expose to window
  useEffect(() => {
    window.__categoryModal = { open: openModal, close: () => setOpen(false) }
    return () => { delete window.__categoryModal }
  }, [categories])

  if (!open) return null

  const previewBg = hexToRgba(color, 0.12)
  const previewBd = hexToRgba(color, 0.25)

  return (
    <div className="ov" onClick={() => setOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mt2">{editId ? 'Edit Category' : 'Add Category'}</div>
            <div className="ms">Customize your tracking</div>
          </div>
          <button className="ib" onClick={() => setOpen(false)} style={{ width: 28, height: 28 }}>
            <X size={15} />
          </button>
        </div>
        <div className="mb2">
          <div className="fd">
            <label>Category Name</label>
            <input
              id="cm_nm"
              type="text"
              placeholder="e.g. Client Work, Research…"
              maxLength={30}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="fd">
            <label>Icon (emoji)</label>
            <input
              type="text"
              placeholder="e.g. 🚀"
              maxLength={4}
              value={icon}
              onChange={e => setIcon(e.target.value)}
              style={{ fontSize: 20, textAlign: 'center' }}
            />
          </div>
          <div className="fd">
            <label>Color</label>
            <div className="color-opts">
              {COLORS.map(c => (
                <div
                  key={c}
                  className={`color-opt${color === c ? ' on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div style={{
            padding: 12, background: 'var(--sf2)', border: '1px solid var(--bd2)',
            borderRadius: 'var(--rs)', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--tx2)' }}>Preview:</div>
            <span className="tag" style={{ background: previewBg, color, border: `1px solid ${previewBd}` }}>
              {icon || '📌'} {name || 'Category'}
            </span>
          </div>
        </div>
        <div className="mf">
          <button className="btn bg2 bsm" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn bp bsm" onClick={save}>Save Category</button>
        </div>
      </div>
    </div>
  )
}
