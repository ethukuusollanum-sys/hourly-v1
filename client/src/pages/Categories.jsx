import { useToast } from '../context/ToastContext'
import { hexToRgba, esc } from '../lib/helpers'
import { Pencil, Trash2 } from 'lucide-react'

const DEF_CAT_IDS = ['Work', 'Break', 'Meeting', 'Learning']

export default function Categories({ profile, onUpdate }) {
  const { toast } = useToast()
  const categories = profile?.categories || []

  function editCat(id) {
    if (window.__categoryModal) window.__categoryModal.open(id)
  }

  async function deleteCat(id) {
    if (!confirm('Delete this category?')) return
    const updated = categories.filter(c => c.id !== id)
    await onUpdate({ categories: updated })
    toast('Deleted', 'inf')
  }

  return (
    <>
      <div className="sh2 m5">
        <div>
          <div className="st">Categories</div>
          <div className="ss">Manage your activity categories</div>
        </div>
        <button className="btn bp bsm" onClick={() => {
          if (window.__categoryModal) window.__categoryModal.open()
        }}>+ Add</button>
      </div>

      <div className="card">
        <div className="ch">
          <div className="ct">All Categories</div>
          <div className="cs">{categories.length} categories</div>
        </div>
        <div style={{ padding: '4px 18px' }}>
          {categories.map(c => {
            const tagBg = hexToRgba(c.color, 0.12)
            const tagBd = hexToRgba(c.color, 0.25)
            const isDef = DEF_CAT_IDS.includes(c.id)
            return (
              <div key={c.id} className="cat-row">
                <div className="cat-swatch" style={{ background: c.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                    {c.icon} {esc(c.name)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                    {isDef ? 'Default' : 'Custom'}
                  </div>
                </div>
                <span className="tag" style={{ background: tagBg, color: c.color, border: `1px solid ${tagBd}` }}>
                  {c.icon} {c.name}
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  <button className="ib" onClick={() => editCat(c.id)}>
                    <Pencil size={12} />
                  </button>
                  {!isDef && (
                    <button className="ib del" onClick={() => deleteCat(c.id)}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="infbox" style={{ marginTop: 14 }}>
        <span>💡</span>
        <span>The <strong style={{ color: 'var(--tx)' }}>Break</strong> category is excluded from focus score calculations.</span>
      </div>
    </>
  )
}
