import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { DAYN, uid, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, loadStarterPlan, planToolsSheet, mergeSplitsSheet, confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'

function SwipeableRoutineItem({ routine, onNavigate, onDelete, onArchive, onRestore }) {
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const isArchived = !!routine.archived
  const touchStart = useRef({ x: 0, y: 0, lockAxis: null })

  const handleTouchStart = e => {
    const t0 = e.touches[0]
    touchStart.current = { x: t0.clientX, y: t0.clientY, lockAxis: null }
    setSwiping(false)
  }

  const handleTouchMove = e => {
    const t0 = e.touches[0]
    const dx = t0.clientX - touchStart.current.x
    const dy = t0.clientY - touchStart.current.y

    if (touchStart.current.lockAxis === 'y') return
    if (!touchStart.current.lockAxis) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        touchStart.current.lockAxis = 'y'
        return
      }
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        touchStart.current.lockAxis = 'x'
      }
    }

    if (touchStart.current.lockAxis === 'x') {
      setSwiping(true)
      const clamped = Math.max(-130, Math.min(130, dx))
      setOffset(clamped)
    }
  }

  const handleTouchEnd = () => {
    if (touchStart.current.lockAxis === 'x') {
      if (offset < -75) {
        onDelete(routine)
      } else if (offset > 75) {
        if (isArchived) onRestore(routine)
        else onArchive(routine)
      }
    }
    setOffset(0)
    setSwiping(false)
    touchStart.current.lockAxis = null
  }

  // Pointer fallback for desktop / mouse interactions
  const pointerStart = useRef({ x: 0, active: false })
  const handlePointerDown = e => {
    if (e.pointerType === 'touch') return
    pointerStart.current = { x: e.clientX, active: true }
  }
  const handlePointerMove = e => {
    if (!pointerStart.current.active) return
    const dx = e.clientX - pointerStart.current.x
    if (Math.abs(dx) > 10) {
      setSwiping(true)
      setOffset(Math.max(-130, Math.min(130, dx)))
    }
  }
  const handlePointerUp = () => {
    if (!pointerStart.current.active) return
    pointerStart.current.active = false
    if (offset < -75) {
      onDelete(routine)
    } else if (offset > 75) {
      if (isArchived) onRestore(routine)
      else onArchive(routine)
    }
    setOffset(0)
    setSwiping(false)
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
        background: offset < 0 ? 'var(--red, #ef4444)' : (isArchived ? 'var(--acc, #22c55e)' : 'var(--yellow, #eab308)'),
        userSelect: 'none',
        touchAction: 'pan-y'
      }}
    >
      {/* Background action reveal */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: offset > 0 ? 'flex-start' : 'flex-end',
          padding: '0 20px',
          color: offset > 0 && !isArchived ? '#000' : '#fff',
          fontWeight: 600,
          fontSize: 14,
          gap: 8
        }}
      >
        {offset > 0 ? (
          <>
            <Icon name={isArchived ? 'check' : 'folder'} style={{ fontSize: 20 }} />
            <span>{isArchived ? t('Restore') : t('Archive')}</span>
          </>
        ) : offset < 0 ? (
          <>
            <span>{t('Delete')}</span>
            <Icon name="trash" style={{ fontSize: 20 }} />
          </>
        ) : null}
      </div>

      {/* Foreground card */}
      <div
        className="item"
        style={{
          margin: 0,
          position: 'relative',
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.22s ease-out',
          opacity: isArchived ? 0.65 : 1,
          background: 'var(--card, #1c1c1e)',
          borderRadius: 12
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => {
          if (!swiping && Math.abs(offset) < 5) onNavigate()
        }}
      >
        <span className="lrow-i"><Icon name={glyphOf(routine.emoji)} /></span>
        <div className="grow">
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <div className="tt">{routine.name}</div>
            {routine.merged && <span className="tag" style={{ fontSize: 10, padding: '1px 6px' }}>{t('Merged')}</span>}
            {isArchived && <span className="tag" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--sep)' }}>{t('Archived')}</span>}
          </div>
          <div className="ss">{exCount(routine.ex.length)}</div>
        </div>
        {isArchived ? (
          <button
            className="iconbtn"
            style={{ width: 34, height: 34, borderRadius: 8 }}
            title={t('Restore routine')}
            onClick={e => { e.stopPropagation(); onRestore(routine) }}
          >
            <Icon name="reset" />
          </button>
        ) : (
          <Icon name="chevronRight" className="chev" />
        )}
      </div>
    </div>
  )
}

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [showArchived, setShowArchived] = useState(false)

  const activeRoutines = (S.routines || []).filter(r => !r.archived)
  const archivedRoutines = (S.routines || []).filter(r => r.archived)

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  const archiveRoutine = routine => {
    update(s => {
      const r = s.routines.find(x => x.id === routine.id)
      if (r) r.archived = true
      Object.keys(s.week).forEach(k => { if (s.week[k] === routine.id) delete s.week[k] })
      Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === routine.id) delete s.dayPlan[k] })
    })
    useUI.getState().toast(t('Archived “{0}”', routine.name))
  }

  const restoreRoutine = routine => {
    update(s => {
      const r = s.routines.find(x => x.id === routine.id)
      if (r) delete r.archived
    })
    useUI.getState().toast(t('Restored “{0}” to active routines', routine.name))
  }

  const deleteRoutine = routine => {
    confirmSheet({
      title: t('Delete routine?'),
      message: t('“{0}” and its exercises will be removed.', routine.name),
      confirmText: t('Delete'),
      danger: true,
      onConfirm: () => {
        update(s => {
          s.routines = s.routines.filter(x => x.id !== routine.id)
          Object.keys(s.week).forEach(k => { if (s.week[k] === routine.id) delete s.week[k] })
          Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === routine.id) delete s.dayPlan[k] })
        })
        useUI.getState().toast(t('Deleted “{0}”', routine.name))
      }
    })
  }

  return (
    <>
      <div className="hdr">
        <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
        <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
      </div>
      <div className="cols">
        <div>
          <h4 className="sec">{t('Week schedule')}</h4>
          <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
            {[1, 2, 3, 4, 5, 6, 0].map(d => {
              const r = S.routines.find(x => x.id === S.week[d] && !x.archived)
              return (
                <div key={d} className="item" onClick={() => dayAssignSheet(d)}>
                  <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
                  {r ? <span className="tag acc"><Icon name={glyphOf(r.emoji)} />{r.name}</span> : <span className="tag">{t('Rest')}</span>}
                  <Icon name="chevronRight" className="chev" />
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="row between" style={{ marginTop: 22, marginBottom: 10, alignItems: 'center' }}>
            <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              {activeRoutines.length >= 2 && (
                <Button size="sm" variant="tinted" icon="shuffle" onClick={() => mergeSplitsSheet()}>
                  {t('Merge')}
                </Button>
              )}
              <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>
                {t('New')}
              </Button>
            </div>
          </div>

          <div className="small dim" style={{ margin: '0 2px 10px' }}>
            {t('Slide right to archive · Slide left to delete')}
          </div>

          {activeRoutines.length > 0 ? (
            <div className="list" style={{ gap: 0 }}>
              {activeRoutines.map(r => (
                <SwipeableRoutineItem
                  key={r.id}
                  routine={r}
                  onNavigate={() => nav('/plan/r/' + r.id)}
                  onArchive={archiveRoutine}
                  onDelete={deleteRoutine}
                  onRestore={restoreRoutine}
                />
              ))}
            </div>
          ) : (
            <div className="empty" style={{ marginBottom: 16 }}>
              <div className="ico"><Icon name="clipboard" /></div>
              {t('No active routines.')}<br />{t('Create one or restore from archive.')}
            </div>
          )}

          {/* Inline Archived Button / Accordion below active routines */}
          {archivedRoutines.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div
                className="item"
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--card, #1c1c1e)',
                  border: '1px dashed var(--sep, #333)',
                  cursor: 'pointer'
                }}
                onClick={() => setShowArchived(v => !v)}
              >
                <span className="lrow-i">
                  <Icon name="folder" style={{ color: 'var(--yellow, #eab308)' }} />
                </span>
                <div className="grow">
                  <div className="tt" style={{ fontSize: 14, fontWeight: 500 }}>
                    {showArchived
                      ? t('Hide archived splits ({0})', archivedRoutines.length)
                      : t('Archived splits ({0})', archivedRoutines.length)}
                  </div>
                  <div className="ss">
                    {showArchived ? t('Tap to collapse') : t('Tap to view or restore')}
                  </div>
                </div>
                <Icon name={showArchived ? 'chevronUp' : 'chevronDown'} className="chev" />
              </div>

              {showArchived && (
                <div className="list" style={{ gap: 0, marginTop: 8 }}>
                  {archivedRoutines.map(r => (
                    <SwipeableRoutineItem
                      key={r.id}
                      routine={r}
                      onNavigate={() => nav('/plan/r/' + r.id)}
                      onArchive={archiveRoutine}
                      onDelete={deleteRoutine}
                      onRestore={restoreRoutine}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!S.routines?.length && (
            <Button icon="sparkles" onClick={loadStarterPlan}>
              {t('Load starter plan (Push / Pull / Legs)')}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
