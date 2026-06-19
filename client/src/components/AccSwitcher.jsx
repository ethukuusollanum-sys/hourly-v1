import { X, Plus, LogOut, CheckCircle, ArrowRight } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function AccSwitcher({ accounts, currentUid, onClose, onLogout, currentUser }) {
  const { toast } = useToast()

  function saveAccount() {
    if (!currentUser?.uid) return
    try {
      const accs = JSON.parse(localStorage.getItem('ht_accounts') || '{}')
      accs[currentUser.uid] = currentUser
      localStorage.setItem('ht_accounts', JSON.stringify(accs))
    } catch {}
  }

  function addAccount() {
    saveAccount()
    onLogout()
    onClose()
  }

  function removeAccount(uid) {
    try {
      const accs = JSON.parse(localStorage.getItem('ht_accounts') || '{}')
      delete accs[uid]
      localStorage.setItem('ht_accounts', JSON.stringify(accs))
      toast('Account removed', 'inf')
    } catch {}
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mt2">Switch Account</div>
            <div className="ms">Manage your accounts</div>
          </div>
          <button className="ib" onClick={onClose} style={{ width: 28, height: 28 }}>
            <X size={15} />
          </button>
        </div>
        <div className="mb2" id="acc_list">
          {!accounts.length ? (
            <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: 10 }}>
              No saved accounts.
            </div>
          ) : accounts.map(a => {
            const isCurr = a.uid === currentUid
            return (
              <div key={a.uid} className={`acc-item${isCurr ? ' curr' : ''}`} onClick={isCurr ? undefined : addAccount}>
                <div className="av" style={{ width: 36, height: 36, fontSize: 14 }}>
                  {a.photoURL
                    ? <img src={a.photoURL} alt="" />
                    : (a.name || '?').charAt(0).toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                    {a.name}{isCurr && <> <span style={{fontSize:'9.5px',color:'var(--ac)'}}>(active)</span></>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{a.email}</div>
                </div>
                {isCurr
                  ? <CheckCircle size={16} color="var(--ac)" />
                  : <ArrowRight size={14} color="var(--tx3)" />
                }
                <button
                  className="ib del acc-remove"
                  title="Remove"
                  onClick={(e) => { e.stopPropagation(); removeAccount(a.uid) }}
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="mf" style={{ justifyContent: 'space-between' }}>
          <button className="btn bg2 bsm" onClick={addAccount}>
            <Plus size={13} /> Add Account
          </button>
          <button className="btn bdr bsm" onClick={onLogout}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
