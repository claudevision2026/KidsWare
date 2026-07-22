import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || ''

const DEFAULT_OVERLAY = { xPct: 27, yPct: 22, widthPct: 46 }
const GUIDE_BOX = { left: 24, top: 10, width: 52, height: 78 }
const NUDGE_STEP = 2

export default function TryOnModal({ modalId, images, productName }) {
  const { t } = useTranslation()
  const [activeIdx, setActiveIdx] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const modalRef = useRef(null)
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const photoUrlRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    photoUrlRef.current = photoUrl
  }, [photoUrl])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const resetAll = () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    setPhotoUrl(null)
    setAgreed(false)
    setOverlay(DEFAULT_OVERLAY)
    setActiveIdx(0)
    setCameraError('')
    stopCamera()
  }

  // Reset everything (and drop the in-memory photo / stop the camera) whenever the
  // modal is closed or unmounted, so an uploaded photo never lingers afterwards.
  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    el.addEventListener('hidden.bs.modal', resetAll)
    return () => {
      el.removeEventListener('hidden.bs.modal', resetAll)
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOn])

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    setOverlay(DEFAULT_OVERLAY)
    setPhotoUrl(URL.createObjectURL(file))
  }

  const onDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCameraOn(true)
    } catch {
      setCameraError(t('productDetails.tryOn.cameraError'))
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) handleFile(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
    stopCamera()
  }

  const removePhoto = () => {
    URL.revokeObjectURL(photoUrl)
    setPhotoUrl(null)
    setOverlay(DEFAULT_OVERLAY)
  }

  const nudge = (dxPct, dyPct) => {
    setOverlay((o) => ({ ...o, xPct: o.xPct + dxPct, yPct: o.yPct + dyPct }))
  }

  const onDrag = (e) => {
    if (!dragRef.current) return
    const point = 'touches' in e ? e.touches[0] : e
    const dxPct = ((point.clientX - dragRef.current.startX) / dragRef.current.rectWidth) * 100
    const dyPct = ((point.clientY - dragRef.current.startY) / dragRef.current.rectHeight) * 100
    setOverlay((o) => ({ ...o, xPct: dragRef.current.origXPct + dxPct, yPct: dragRef.current.origYPct + dyPct }))
  }
  const stopDrag = () => {
    dragRef.current = null
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('touchend', stopDrag)
  }
  const startDrag = (e) => {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e
    dragRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      rectWidth: rect.width,
      rectHeight: rect.height,
      origXPct: overlay.xPct,
      origYPct: overlay.yPct,
    }
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', onDrag, { passive: false })
    window.addEventListener('touchend', stopDrag)
  }

  const reportHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `I want to report a concern about the "See How It Looks" feature for: ${productName || ''}`
  )}`

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" ref={modalRef}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title">{t('productDetails.tryOn.title')}</h6>
            <button type="button" className="btn-close" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              {/* 1. The dress being viewed */}
              <div className="col-md-4">
                <p className="fw-semibold small mb-2">{t('productDetails.tryOn.step1')}</p>
                <img
                  src={images[activeIdx]}
                  alt=""
                  className="w-100 rounded mb-2"
                  style={{ height: 420, objectFit: 'contain', background: '#f8f8f8' }}
                />
                {images.length > 1 && (
                  <div className="d-flex flex-wrap gap-2">
                    {images.map((src, idx) => (
                      <img
                        key={src + idx}
                        src={src}
                        alt=""
                        onClick={() => setActiveIdx(idx)}
                        className="rounded"
                        style={{
                          width: 48,
                          height: 48,
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: idx === activeIdx ? '2px solid var(--ktw-purple)' : '2px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 2. The customer's own photo */}
              <div className="col-md-4">
                <p className="fw-semibold small mb-2">{t('productDetails.tryOn.step2')}</p>

                {!agreed ? (
                  <div className="border rounded p-3 bg-light">
                    <p className="small mb-2">{t('productDetails.tryOn.guidelines')}</p>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`${modalId}-agree`}
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor={`${modalId}-agree`}>
                        {t('productDetails.tryOn.agreeLabel')}
                      </label>
                    </div>
                  </div>
                ) : cameraOn ? (
                  <div>
                    <div className="position-relative rounded overflow-hidden mx-auto bg-dark" style={{ width: '100%', height: 260 }}>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video ref={videoRef} autoPlay playsInline muted className="w-100 h-100" style={{ objectFit: 'cover' }} />
                      <div
                        className="position-absolute"
                        style={{
                          left: `${GUIDE_BOX.left}%`,
                          top: `${GUIDE_BOX.top}%`,
                          width: `${GUIDE_BOX.width}%`,
                          height: `${GUIDE_BOX.height}%`,
                          border: '2px dashed rgba(255,255,255,.8)',
                          borderRadius: 8,
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                    <p className="small text-muted mt-2 mb-2">
                      <i className="bi bi-info-circle me-1" />
                      {t('productDetails.tryOn.guideHint')}
                    </p>
                    <div className="d-flex gap-2 justify-content-center">
                      <button type="button" className="btn btn-sm btn-ktw-primary" onClick={capturePhoto}>
                        <i className="bi bi-camera-fill me-1" /> {t('productDetails.tryOn.captureButton')}
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={stopCamera}>
                        {t('productDetails.tryOn.cancelButton')}
                      </button>
                    </div>
                  </div>
                ) : !photoUrl ? (
                  <div>
                    <div
                      onDrop={onDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border border-2 rounded p-3 text-center text-muted d-flex flex-column justify-content-center"
                      style={{ height: 260, borderStyle: 'dashed' }}
                    >
                      <i className="bi bi-cloud-upload fs-2 d-block mb-2" />
                      <span className="small d-block mb-3">{t('productDetails.tryOn.dropHint')}</span>
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => document.getElementById(`${modalId}-file`).click()}
                        >
                          <i className="bi bi-folder2-open me-1" /> {t('productDetails.tryOn.chooseButton')}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={startCamera}>
                          <i className="bi bi-camera me-1" /> {t('productDetails.tryOn.takePhotoButton')}
                        </button>
                      </div>
                      {cameraError && <p className="small text-danger mt-2 mb-0">{cameraError}</p>}
                      <input
                        id={`${modalId}-file`}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                    </div>
                    <p className="small text-muted mt-2 mb-0">
                      <i className="bi bi-info-circle me-1" />
                      {t('productDetails.tryOn.photoTip')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="rounded overflow-hidden mx-auto" style={{ width: '100%', height: 420, background: '#f0f0f0' }}>
                      <img src={photoUrl} alt="" className="w-100 h-100" style={{ objectFit: 'contain' }} />
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={removePhoto}>
                      {t('productDetails.tryOn.removePhoto')}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Preview: photo with the dress overlaid, draggable/resizable */}
              <div className="col-md-4">
                <p className="fw-semibold small mb-2">{t('productDetails.tryOn.step3')}</p>

                {photoUrl ? (
                  <div>
                    <div
                      ref={containerRef}
                      className="position-relative rounded overflow-hidden mx-auto"
                      style={{ width: '100%', height: 420, background: '#f0f0f0' }}
                    >
                      <img src={photoUrl} alt="" className="w-100 h-100" style={{ objectFit: 'contain' }} />
                      <img
                        src={images[activeIdx]}
                        alt=""
                        draggable={false}
                        onMouseDown={startDrag}
                        onTouchStart={startDrag}
                        className="position-absolute"
                        style={{
                          left: `${overlay.xPct}%`,
                          top: `${overlay.yPct}%`,
                          width: 'auto',
                          height: 'auto',
                          maxWidth: `${overlay.widthPct}%`,
                          maxHeight: '92%',
                          cursor: 'grab',
                          touchAction: 'none',
                          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.35))',
                        }}
                      />
                    </div>
                    <div className="d-flex align-items-center gap-2 mt-2">
                      <i className="bi bi-arrows-angle-contract small" />
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="2"
                        value={overlay.widthPct}
                        onChange={(e) => setOverlay((o) => ({ ...o, widthPct: Number(e.target.value) }))}
                        className="form-range flex-grow-1"
                      />
                      <i className="bi bi-arrows-angle-expand small" />
                    </div>
                    <p className="small text-muted mt-1 mb-2">{t('productDetails.tryOn.dragHint')}</p>
                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        aria-label={t('productDetails.tryOn.nudgeLeft')}
                        onClick={() => nudge(-NUDGE_STEP, 0)}
                      >
                        <i className="bi bi-arrow-left" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        aria-label={t('productDetails.tryOn.nudgeUp')}
                        onClick={() => nudge(0, -NUDGE_STEP)}
                      >
                        <i className="bi bi-arrow-up" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        aria-label={t('productDetails.tryOn.nudgeDown')}
                        onClick={() => nudge(0, NUDGE_STEP)}
                      >
                        <i className="bi bi-arrow-down" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        aria-label={t('productDetails.tryOn.nudgeRight')}
                        onClick={() => nudge(NUDGE_STEP, 0)}
                      >
                        <i className="bi bi-arrow-right" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary ms-2"
                        onClick={() => setOverlay(DEFAULT_OVERLAY)}
                      >
                        <i className="bi bi-arrow-counterclockwise me-1" /> {t('productDetails.tryOn.resetButton')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border rounded d-flex align-items-center justify-content-center text-center text-muted small p-3"
                    style={{ height: 260, background: '#f8f8f8' }}
                  >
                    {t('productDetails.tryOn.previewPlaceholder')}
                  </div>
                )}
              </div>
            </div>

            <hr />
            <p className="small text-muted mb-1">
              <i className="bi bi-shield-lock me-1" />
              {t('productDetails.tryOn.privacyNote')}
            </p>
            <a href={reportHref} target="_blank" rel="noopener noreferrer" className="small">
              {t('productDetails.tryOn.reportLink')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
