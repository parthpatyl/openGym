import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { exOr } from '../lib/exercises.js'
import { uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { supersetUnits, cleanupSg, exLine } from '../lib/history.js'
import { Thumb } from '../components/Media.jsx'
import { haptic } from '../lib/haptic.js'
import { glyphPicker, exercisePicker, exConfigSheet, confirmSheet, mergeSplitsSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { Button, SelectRow } from '../components/ui.jsx'
import { POLICIES_FOR, POLICY_NAME, POLICY_DESC } from '../lib/progression.js'
import BodyMap from '../components/BodyMap.jsx'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../lib/muscles.js'

export default function RoutineEdit() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) nav('/plan') }, [!!r])
  if (!r) return null

  const edit = fn => update(s => { fn(s.routines.find(x => x.id === id).ex) })
  const move = (i, dir) => edit(ex => { const j = i + dir; if (j < 0 || j >= ex.length) return;[ex[i], ex[j]] = [ex[j], ex[i]]; cleanupSg(ex) })
  const reorder = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return
    edit(ex => {
      const [item] = ex.splice(fromIdx, 1)
      ex.splice(toIdx, 0, item)
      cleanupSg(ex)
    })
  }

  const [dragState, setDragState] = useState(null)
  const dragRef = useRef(null)
  const itemRefs = useRef([])

  const handleDragStart = (i, e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const rects = itemRefs.current.map(el => (el ? el.getBoundingClientRect() : null))
    const itemHeight = rects[i]?.height || 64

    dragRef.current = {
      from: i,
      to: i,
      startY,
      rects,
      itemHeight,
      pointerId: e.pointerId
    }
    haptic('light')
    setDragState({ from: i, to: i, deltaY: 0 })

    const onPointerMove = ev => {
      if (!dragRef.current) return
      const dy = ev.clientY - dragRef.current.startY
      const currentY = ev.clientY
      const rects = dragRef.current.rects

      let to = dragRef.current.from
      for (let j = 0; j < rects.length; j++) {
        if (!rects[j]) continue
        const mid = rects[j].top + rects[j].height / 2
        if (j < dragRef.current.from && currentY < mid) {
          to = j
          break
        } else if (j > dragRef.current.from && currentY > mid) {
          to = j
        }
      }

      if (to !== dragRef.current.to) {
        haptic('light')
      }
      dragRef.current.to = to
      setDragState({ from: dragRef.current.from, to, deltaY: dy })
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)

      if (dragRef.current) {
        const { from, to } = dragRef.current
        dragRef.current = null
        setDragState(null)
        if (from !== to) {
          haptic('medium')
          reorder(from, to)
        }
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }
  const toggleLink = i => edit(ex => {
    if (i < 1) return
    const cur = ex[i], prev = ex[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || ('sg' + uid()); prev.sg = gid; cur.sg = gid }
    cleanupSg(ex)
  })

  const units = supersetUnits(r.ex)
  const unitFirst = new Set(units.filter(u => u.length > 1).map(u => u[0]))
  const inSS = new Set(units.filter(u => u.length > 1).flat())

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Plan')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px' }}>
        <input className="input" defaultValue={r.name} style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-.021em' }}
          onChange={e => update(s => { s.routines.find(x => x.id === id).name = e.target.value.trim() || t('Routine') })} />
      </div>
      <button className="iconbtn" aria-label={t('Pick an icon')} onClick={() => glyphPicker(r.emoji, g => update(s => { s.routines.find(x => x.id === id).emoji = g }))}><Icon name={glyphOf(r.emoji)} /></button>
    </div>

    <div className="sect-b" style={{ marginBottom: 16 }}>
      <SelectRow icon="chartLine" title={t('Progression')} sheetTitle={t('Progression')}
        value={r.prog || 'linear'} onChange={v => update(s => { s.routines.find(x => x.id === id).prog = v })}
        options={POLICIES_FOR.reps.map(p => ({ value: p, label: t(POLICY_NAME[p]), subtitle: t(POLICY_DESC[p]) }))} />
    </div>
    <div className="small dim" style={{ margin: '-10px 2px 16px' }}>
      {t('Applies to every exercise in this routine that does not set its own rule.')}
    </div>

    {r.ex.length ? (
      <div className="list" style={{ gap: 8 }}>
        {r.ex.map((e, i) => {
          const ex = exOr(e.id)
          const linkedPrev = i > 0 && e.sg && r.ex[i - 1].sg === e.sg
          const isDragging = dragState?.from === i

          let translateY = 0
          if (dragState) {
            if (isDragging) {
              translateY = dragState.deltaY
            } else if (dragState.from < dragState.to && i > dragState.from && i <= dragState.to) {
              translateY = -((dragRef.current?.itemHeight || 64) + 8)
            } else if (dragState.from > dragState.to && i < dragState.from && i >= dragState.to) {
              translateY = (dragRef.current?.itemHeight || 64) + 8
            }
          }

          return (
            <div
              key={i}
              ref={el => (itemRefs.current[i] = el)}
              style={{
                position: 'relative',
                transform: translateY ? `translateY(${translateY}px)` : 'none',
                transition: isDragging ? 'none' : 'transform 0.18s ease-out',
                zIndex: isDragging ? 50 : 1,
                boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.5)' : 'none',
                opacity: isDragging ? 0.95 : 1
              }}
            >
              {unitFirst.has(i) && <div className="ss-label"><Icon name="link" />{t('Superset')}</div>}
              <div
                className={'item' + (inSS.has(i) ? ' in-ss' : '')}
                onClick={() => {
                  if (!dragState) {
                    exConfigSheet(ex, e, cfg => edit(x => { x[i] = { id: x[i].id, sg: x[i].sg, ...cfg } }), () => edit(x => { x.splice(i, 1); cleanupSg(x) }), r)
                  }
                }}
              >
                <Thumb ex={ex} />
                <div className="grow"><div className="tt capitalize">{ex.n}</div><div className="ss">{exLine(e, S.unit)}</div></div>
                <div style={{ display: 'flex', gap: 6, flex: 'none', alignItems: 'center' }}>
                  {i > 0 && (
                    <button
                      className={'iconbtn' + (linkedPrev ? ' on-ss' : '')}
                      title={t('Superset with exercise above')}
                      style={{ width: 34, height: 34, borderRadius: 8, fontSize: 15 }}
                      onClick={ev => { ev.stopPropagation(); toggleLink(i) }}
                    >
                      <Icon name="link" />
                    </button>
                  )}
                  <div
                    className="iconbtn"
                    style={{
                      width: 36,
                      height: 38,
                      borderRadius: 8,
                      cursor: 'grab',
                      touchAction: 'none',
                      color: isDragging ? 'var(--acc)' : 'var(--dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={t('Drag to reorder')}
                    onPointerDown={ev => handleDragStart(i, ev)}
                  >
                    <Icon name="grip" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="empty"><div className="ico"><Icon name="dumbbell" /></div>{t('No exercises yet — add your first one.')}</div>
    )}

    {/* Coverage of the routine as planned, so a gap shows up while you're building it
        rather than after a month of training around it. */}
    {r.ex.length > 0 && (() => {
      const load = loadOfRoutine(r)
      const { worked } = rankOf(load)
      return <div className="card" style={{ marginTop: 12 }}>
        <h2>{t('What this session hits')}</h2>
        <BodyMap load={load} body={S.body} />
        <div className="mchips">
          {worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}
        </div>
      </div>
    })()}

    <div className="small dim row" style={{ margin: '10px 2px', gap: 5 }}><Icon name="link" style={{ fontSize: 13 }} />{t('Tap the link button on an exercise to superset it with the one above — you’ll do them back-to-back.')}</div>
    <Button variant="primary" onClick={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => edit(x => { x.push({ id: ex.id, ...cfg }) }), null, r))} icon="plus">{t('Add exercise')}</Button>
    <div style={{ height: 10 }} />
    {S.routines.length >= 2 && <>
      <Button variant="tinted" icon="shuffle" onClick={() => mergeSplitsSheet(id)}>{t('Merge with another split')}</Button>
      <div style={{ height: 10 }} />
    </>}
    {r.archived ? (
      <Button variant="tinted" icon="reset" onClick={() => {
        update(s => {
          const target = s.routines.find(x => x.id === id)
          if (target) delete target.archived
        })
        nav('/plan')
      }}>{t('Restore routine to active')}</Button>
    ) : (
      <Button variant="tinted" icon="folder" onClick={() => {
        update(s => {
          const target = s.routines.find(x => x.id === id)
          if (target) target.archived = true
          Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
          Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
        })
        nav('/plan')
      }}>{t('Archive routine')}</Button>
    )}
    <div style={{ height: 10 }} />
    <Button variant="danger" onClick={() => confirmSheet({
      title: t('Delete routine?'), message: t('“{0}” and its exercises will be removed.', r.name), confirmText: t('Delete'), danger: true,
      onConfirm: () => {
        update(s => {
          s.routines = s.routines.filter(x => x.id !== id)
          Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
          Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
        })
        nav('/plan')
      }
    })}>{t('Delete routine')}</Button>
  </div>
}
