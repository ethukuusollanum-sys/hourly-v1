import { useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext'
import { hexToRgba } from '../lib/helpers'
import { X, Star, Briefcase, Coffee, Video, BookOpen, Code, Pen, MessageSquare, Users, Phone, Headphones, Zap, Target, Clock, Calendar, Dumbbell, Home, Globe, Mail, ShoppingCart, Camera, Music, MapPin, Activity, Sun, Moon, Cloud, Heart, Smile, CheckCircle, AlertCircle, HelpCircle, Info, Settings, User, Search, Bell, Bookmark, Flag, Gift, Layers, Tag, TrendingUp, TrendingDown, BarChart3, PieChart, Brain } from 'lucide-react'

const COLORS = ['#3b82f6', '#f97316', '#a855f7', '#00d4aa', '#f43f5e', '#22c55e', '#eab308', '#06b6d4', '#ec4899', '#8b5cf6']

const ICON_OPTIONS = [
  { name: 'briefcase', icon: Briefcase },
  { name: 'coffee', icon: Coffee },
  { name: 'video', icon: Video },
  { name: 'book', icon: BookOpen },
  { name: 'code', icon: Code },
  { name: 'pen', icon: Pen },
  { name: 'message', icon: MessageSquare },
  { name: 'users', icon: Users },
  { name: 'phone', icon: Phone },
  { name: 'headphones', icon: Headphones },
  { name: 'zap', icon: Zap },
  { name: 'target', icon: Target },
  { name: 'clock', icon: Clock },
  { name: 'calendar', icon: Calendar },
  { name: 'workout', icon: Dumbbell },
  { name: 'home', icon: Home },
  { name: 'globe', icon: Globe },
  { name: 'mail', icon: Mail },
  { name: 'cart', icon: ShoppingCart },
  { name: 'camera', icon: Camera },
  { name: 'music', icon: Music },
  { name: 'location', icon: MapPin },
  { name: 'activity', icon: Activity },
  { name: 'sun', icon: Sun },
  { name: 'moon', icon: Moon },
  { name: 'cloud', icon: Cloud },
  { name: 'heart', icon: Heart },
  { name: 'smile', icon: Smile },
  { name: 'check', icon: CheckCircle },
  { name: 'alert', icon: AlertCircle },
  { name: 'help', icon: HelpCircle },
  { name: 'info', icon: Info },
  { name: 'settings', icon: Settings },
  { name: 'user', icon: User },
  { name: 'search', icon: Search },
  { name: 'bell', icon: Bell },
  { name: 'bookmark', icon: Bookmark },
  { name: 'flag', icon: Flag },
  { name: 'gift', icon: Gift },
  { name: 'layers', icon: Layers },
  { name: 'tag', icon: Tag },
  { name: 'chart', icon: BarChart3 },
  { name: 'pie', icon: PieChart },
  { name: 'brain', icon: Brain },
  { name: 'star', icon: Star },
]

export default function CategoryModal({ profile, onUpdate }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('briefcase')
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
        setIcon(cat.icon || 'briefcase')
        setColor(cat.color)
      }
    } else {
      setEditId(null)
      setName('')
      setIcon('briefcase')
      setColor('#3b82f6')
    }
    setOpen(true)
    setTimeout(() => document.getElementById('cm_nm')?.focus(), 80)
  }

  async function save() {
    if (!name.trim()) { toast('Category name is required', 'er'); return }

    let updated
    if (editId) {
      updated = categories.map(c => c.id === editId ? { ...c, name: name.trim(), icon: icon || 'briefcase', color } : c)
      toast('Category updated', 'ok')
    } else {
      const id = name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now()
      updated = [...categories, { id, name: name.trim(), icon: icon || 'briefcase', color }]
      toast('Category added', 'ok')
    }

    await onUpdate({ categories: updated })
    setOpen(false)
  }

  useEffect(() => {
    window.__categoryModal = { open: openModal, close: () => setOpen(false) }
    return () => { delete window.__categoryModal }
  }, [categories])

  if (!open) return null

  const previewBg = hexToRgba(color, 0.12)
  const previewBd = hexToRgba(color, 0.25)
  const SelectedIconComponent = ICON_OPTIONS.find(o => o.name === icon)?.icon || Star

  return (
    <div className="ov" onClick={() => setOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mt2">{editId ? 'Edit Category' : 'Add Category'}</div>
            <div className="ms">Customize your tracking</div>
          </div>
          <button className="ib" onClick={() => setOpen(false)} style={{ width: 28, height: 28 }} aria-label="Close">
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
            <label>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {ICON_OPTIONS.map(opt => {
                const IconComp = opt.icon
                return (
                  <button
                    key={opt.name}
                    onClick={() => setIcon(opt.name)}
                    className={`chip${icon === opt.name ? ' on' : ''}`}
                    style={{ padding: '5px 8px', fontSize: 11 }}
                    title={opt.name}
                  >
                    <IconComp size={14} />
                  </button>
                )
              })}
            </div>
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
              <SelectedIconComponent size={12} /> {name || 'Category'}
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