import { useEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

export default function RestTimer() {
  const timer = useUI(s => s.timer)
  const work = useUI(s => s.work)
  const { addRest, stopRest, finishWorkEarly, stopWork } = useUI()
  const on = work || timer
  const ringRef = useRef(null)

  useEffect(() => {
    document.body.classList.toggle('resting', !!on)
    return () => document.body.classList.remove('resting')
  }, [!!on])

  // Continuous smooth 60fps circular motion
  useEffect(() => {
    if (!timer || !ringRef.current) return
    const radius = 17
    const circumference = 2 * Math.PI * radius
    let reqId

    const updateRing = () => {
      if (!ringRef.current) return
      const now = Date.now()
      const remainingMs = Math.max(0, timer.endsAt - now)
      const totalMs = Math.max(1, timer.total * 1000)
      const fraction = Math.min(1, Math.max(0, remainingMs / totalMs))
      const dash = circumference * fraction
      ringRef.current.setAttribute('stroke-dasharray', `${dash.toFixed(2)} ${circumference.toFixed(2)}`)
      if (remainingMs > 0) {
        reqId = requestAnimationFrame(updateRing)
      }
    }

    reqId = requestAnimationFrame(updateRing)
    return () => {
      if (reqId) cancelAnimationFrame(reqId)
    }
  }, [timer?.endsAt, timer?.total])

  if (!on) return null
  const pct = (on.left / on.total) * 100

  if (work) return (
    <div id="timer" className="working">
      <div className="t">{clock(work.left)}</div>
      <div className="grow">
        {work.label && <div className="lbl">{work.label}</div>}
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
      </div>
      <Button size="sm" onClick={stopWork}>{t('Cancel')}</Button>
      <Button size="sm" variant="primary" icon="check" onClick={finishWorkEarly}>{t('Done')}</Button>
    </div>
  )

  const radius = 17
  const circumference = 2 * Math.PI * radius
  const initFraction = Math.min(1, Math.max(0, (timer.endsAt - Date.now()) / (timer.total * 1000)))
  const initDash = circumference * initFraction

  let timerClass = 'rest-calm'
  let statusText = t('Resting')
  if (timer.left <= 5) {
    timerClass = 'rest-urgent'
    statusText = t('Get ready!')
  } else if (timer.left <= 20) {
    timerClass = 'rest-warning'
    statusText = t('Almost time')
  }

  return (
    <div id="timer" className={'rest ' + timerClass}>
      <div className="head">
        <div className="ring-wrap">
          <svg className="ring" viewBox="0 0 44 44">
            <circle className="ring-bg" cx="22" cy="22" r={radius} />
            <circle
              ref={ringRef}
              className="ring-fg"
              cx="22" cy="22" r={radius}
              strokeDasharray={`${initDash.toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset="0"
            />
          </svg>
          <div className="ring-icon">
            <Icon name={timer.left <= 5 ? 'bolt' : 'clock'} size={14} />
          </div>
        </div>
        <div className="time-col">
          <div className="t">{clock(timer.left)}</div>
          <div className="sub-lbl">{statusText}</div>
        </div>
        {timer.meta?.exercise && (
          <div className="meta-col" style={{ marginLeft: 'auto', textAlign: 'right', minWidth: 0 }}>
            <div className="small truncate" style={{ fontWeight: 600, color: 'var(--fg)' }}>{timer.meta.exercise}</div>
            {timer.meta.set && <div className="dim small">{t('Set {0}', timer.meta.set)}</div>}
          </div>
        )}
      </div>
      <div className="acts">
        <Button size="sm" icon="minus" onClick={() => addRest(-15)}>15s</Button>
        <Button size="sm" icon="plus" onClick={() => addRest(15)}>15s</Button>
        <Button size="sm" variant="primary" className="skip" onClick={stopRest}>{t('Skip')}</Button>
      </div>
    </div>
  )
}
