import { useState } from 'react'
import { imgSrc, gifSrc, imgCdnSrc, gifCdnSrc } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// Custom exercises have no media — the animation stays blank by design (issue #11).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12).
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const [failed, setFailed] = useState(false)
  const [useCdnFallback, setUseCdnFallback] = useState(false)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  if (!ex?.gif) return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }

  const normalSrc = playing ? gifSrc(ex) : imgSrc(ex)
  const cdnSrc = playing ? gifCdnSrc(ex) : imgCdnSrc(ex)
  const currentSrc = useCdnFallback ? cdnSrc : normalSrc

  const handleError = () => {
    if (!useCdnFallback && normalSrc !== cdnSrc) {
      setUseCdnFallback(true)
    } else {
      setFailed(true)
    }
  }

  return (
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id} onClick={() => setPlaying(p => !p)}>
      {!failed ? (
        <img decoding="async" src={currentSrc} alt={ex.n} onError={handleError} />
      ) : (
        <div className="thumb thumb-x" style={{ width: '100%', height: '100%', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dumbbell" />
        </div>
      )}
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && !failed && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

export function Thumb({ ex }) {
  const [failed, setFailed] = useState(false)
  const [useCdnFallback, setUseCdnFallback] = useState(false)
  if (!ex?.img || failed) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>

  const normal = imgSrc(ex)
  const cdn = imgCdnSrc(ex)
  const src = useCdnFallback ? cdn : normal

  const handleError = () => {
    if (!useCdnFallback && normal !== cdn) {
      setUseCdnFallback(true)
    } else {
      setFailed(true)
    }
  }

  return <img className="thumb" loading="lazy" decoding="async" src={src} alt="" onError={handleError} />
}
