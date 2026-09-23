import { describe, it, expect, afterEach } from 'vitest'
import {
  CDN_IMG_BASE,
  CDN_GIF_BASE,
  getImgBase,
  getGifBase,
  imgSrc,
  gifSrc,
  imgCdnSrc,
  gifCdnSrc
} from './exercises.js'

describe('exercises media resolution', () => {
  afterEach(() => {
    delete globalThis.window
  })

  it('exposes valid CDN base constants', () => {
    expect(CDN_IMG_BASE).toContain('cdn.jsdelivr.net')
    expect(CDN_GIF_BASE).toContain('cdn.jsdelivr.net')
  })

  it('constructs CDN URLs with imgCdnSrc and gifCdnSrc', () => {
    const ex = { img: '0289-SpYC0Kp.jpg', gif: '0289-SpYC0Kp.gif' }
    expect(imgCdnSrc(ex)).toBe(CDN_IMG_BASE + '0289-SpYC0Kp.jpg')
    expect(gifCdnSrc(ex)).toBe(CDN_GIF_BASE + '0289-SpYC0Kp.gif')
    expect(imgCdnSrc(null)).toBe('')
    expect(gifCdnSrc(null)).toBe('')
  })

  it('automatically falls back to CDN when Capacitor native platform is detected', () => {
    globalThis.window = { Capacitor: { isNativePlatform: () => true } }
    expect(getImgBase()).toBe(CDN_IMG_BASE)
    expect(getGifBase()).toBe(CDN_GIF_BASE)
    const ex = { img: '0289-SpYC0Kp.jpg', gif: '0289-SpYC0Kp.gif' }
    expect(imgSrc(ex)).toBe(CDN_IMG_BASE + '0289-SpYC0Kp.jpg')
    expect(gifSrc(ex)).toBe(CDN_GIF_BASE + '0289-SpYC0Kp.gif')
  })
})
