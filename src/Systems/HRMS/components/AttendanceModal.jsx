import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Camera,
  MapPin,
  Calendar,
  Clock,
  User,
  RefreshCw,
  Check,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { hrmsService } from '../services/hrmsService'
import { toLocalDateStr, toLocalTimeStr, formatTime12h, OFFICE_HOURS_LABEL } from '../services/hrmsCalculations'
import { nominatimService } from '../services/nominatimService'
import { useAuth } from '../../../context/AuthContext'

export function AttendanceModal({ isOpen, onClose, onSave, staff = [], preselectedEmployeeId = null, preselectedType = 'in' }) {
  const { currentUser, isAdmin, getModuleRole } = useAuth()
  const isUserAdmin = isAdmin() || getModuleRole('hrms') === 'admin'

  const activeStaff = isUserAdmin
    ? staff
    : staff.filter((s) => s.id === currentUser?.id || s.username === currentUser?.username)

  const defaultEmpId = preselectedEmployeeId || activeStaff[0]?.id || currentUser?.id || ''
  const [employeeId, setEmployeeId] = useState(defaultEmpId)
  const [punchType, setPunchType] = useState(preselectedType || 'in')
  const [date, setDate] = useState(toLocalDateStr())
  const [time, setTime] = useState(toLocalTimeStr())
  const [location, setLocation] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [rawCoords, setRawCoords] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      if (preselectedEmployeeId) setEmployeeId(preselectedEmployeeId)
      else if (activeStaff.length > 0 && !employeeId) setEmployeeId(activeStaff[0].id)
      setPunchType(preselectedType || 'in')
      setDate(toLocalDateStr())
      setTime(toLocalTimeStr())
      setCapturedPhoto(null)
      setErrorMsg('')
      startCamera()
      fetchLocation()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [isOpen, preselectedEmployeeId, preselectedType])

  // Camera start
  const startCamera = async () => {
    setCameraError(null)
    stopCamera()
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraActive(true)
      } else {
        setCameraError('Camera is not supported in this browser. Use a browser/device with a camera.')
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err)
      setCameraError('Camera permission denied or camera in use. Allow camera access and retry.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Location / GPS fetch with Nominatim Reverse Geocoding
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setCoordinates('')
      setRawCoords(null)
      return
    }

    setIsLocating(true)
    setLocation('Detecting precise GPS address...')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setRawCoords({ lat, lon })
        setCoordinates(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`)

        try {
          const res = await nominatimService.getPreciseLocation(lat, lon)
          if (res.success && res.formattedAddress) {
            setLocation(res.formattedAddress)
          } else {
            setLocation(`Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`)
          }
        } catch {
          setLocation(`Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`)
        } finally {
          setIsLocating(false)
        }
      },
      (err) => {
        console.warn('Geolocation failed or permission denied:', err)
        setCoordinates('')
        setLocation('')
        setRawCoords(null)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  // Capture face photo with stamped corner overlay directly on canvas
  const handleCapture = () => {
    // Re-take: discard the photo and return to the live camera view
    if (capturedPhoto) {
      setCapturedPhoto(null)
      return
    }

    const video = videoRef.current
    if (!video || !cameraActive || !video.videoWidth) {
      setErrorMsg('Camera is not ready. Allow camera access and try again.')
      return
    }
    setErrorMsg('')

    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, 640, 480)

    // --- Burn-in Watermark Stamp onto the Captured Canvas ---
    const cardWidth = 330
    const cardHeight = 82
    const cardX = 640 - cardWidth - 14
    const cardY = 480 - cardHeight - 14

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1

    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 10)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
    }

    // Line 1: Punch Type Badge & Staff Name
    const empName = selectedEmp ? selectedEmp.name : 'STAFF'
    ctx.fillStyle = punchType === 'in' ? '#34d399' : '#fbbf24'
    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.fillText(`${punchType.toUpperCase()} • ${empName}`, cardX + 12, cardY + 22)

    // Line 2: Precise Address (truncated if too long)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '11px Inter, system-ui, sans-serif'
    const displayLoc = location.length > 44 ? location.substring(0, 42) + '...' : location
    ctx.fillText(displayLoc, cardX + 12, cardY + 44)

    // Line 3: Coordinates & Date/Time
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px monospace'
    ctx.fillText(`${coordinates || 'GPS unavailable'}  |  ${date} ${formatTime12h(time)}`, cardX + 12, cardY + 68)

    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.88))
  }

  const selectedEmp = staff.find((s) => s.id === employeeId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeId || saving) return
    if (!capturedPhoto) {
      setErrorMsg('Please capture the face photo before saving the punch.')
      return
    }
    setErrorMsg('')
    setSaving(true)
    try {
      await hrmsService.recordPunch({
        employee_id: employeeId,
        type: punchType,
        date,
        time,
        location: location.trim(),
        coordinates,
        photo: capturedPhoto,
        marked_by: currentUser?.id || null
      })
      if (onSave) onSave()
      onClose()
    } catch (err) {
      console.error('Save punch error:', err)
      setErrorMsg(err.message || 'Failed to save attendance punch.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95dvh] sm:max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Record Attendance Punch
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Face scan & live GPS location stamped onto record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Employee Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Staff Member <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  required
                  disabled={!isUserAdmin}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold transition-all appearance-none ${
                    !isUserAdmin ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600'
                  }`}
                >
                  <option value="">Select Employee...</option>
                  {activeStaff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Punch Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Punch Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPunchType('in')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    punchType === 'in'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Punch IN
                </button>
                <button
                  type="button"
                  onClick={() => setPunchType('out')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    punchType === 'out'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Punch OUT
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                />
              </div>
            </div>

            {/* Check-In Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Punch Time <span className="text-rose-500">*</span>
                <span className="ml-1 normal-case tracking-normal font-semibold text-slate-400">
                  (Office {OFFICE_HOURS_LABEL})
                </span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                />
              </div>
            </div>

            {/* Premise / Location */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Location / Premise</span>
                {isLocating && (
                  <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1 normal-case">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Detecting precise address...
                  </span>
                )}
              </label>
              <div className="relative">
                <MapPin className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${isLocating ? 'text-amber-500 animate-pulse' : 'text-rose-500'}`} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={isLocating ? 'Detecting precise GPS address via Nominatim...' : 'e.g. VIP Road, Raipur'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                />
              </div>
            </div>
          </div>

          {/* Camera Viewfinder with Glassmorphism Stamp Overlay */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-violet-600" /> Live Camera & Corner Location Stamp
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {cameraActive ? 'Camera live' : 'Camera ready'}
              </span>
            </div>

            <div className="relative aspect-[4/3] sm:aspect-video max-h-64 sm:max-h-72 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center">
              {/* Video stays mounted so the stream survives a re-take */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive && !capturedPhoto ? 'block' : 'hidden'}`}
              />
              {capturedPhoto && (
                <img src={capturedPhoto} alt="Captured punch" className="w-full h-full object-cover" />
              )}

              {!cameraActive && !capturedPhoto && (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-slate-300">
                    <User className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">
                    {cameraError || 'Position staff member in front of camera'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    A live face photo is required to record attendance
                  </p>
                  {cameraError && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                    >
                      Retry Camera
                    </button>
                  )}
                </div>
              )}

              {/* Glassmorphism Corner Stamp Overlay */}
              <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 max-w-[80%] sm:max-w-xs bg-slate-950/80 backdrop-blur-md border border-white/20 rounded-lg sm:rounded-xl p-2 sm:p-2.5 text-white shadow-xl text-[9px] sm:text-[11px] space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={`w-2 h-2 rounded-full ${punchType === 'in' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="uppercase">{punchType.toUpperCase()}</span>
                  <span>•</span>
                  <span className="truncate">{selectedEmp ? selectedEmp.name : 'STAFF'}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300 truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-rose-400" />
                  <span className="truncate">{location}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[9px] sm:text-[10px] pt-0.5 border-t border-white/10 font-mono">
                  <span>{coordinates || 'GPS unavailable'}</span>
                  <span>{formatTime12h(time)}</span>
                </div>
              </div>
            </div>

            {/* Capture and Re-take controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!cameraActive && !capturedPhoto}
                className="disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{capturedPhoto ? 'Re-take Face Photo' : 'Capture Face Photo'}</span>
              </button>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3 h-3 text-slate-400 ${isLocating ? 'animate-spin text-violet-600' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Refresh GPS'}</span>
                </button>
                {rawCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${rawCoords.lat},${rawCoords.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Open Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          </div>

          {/* Modal Footer (outside the scroller so it never covers content) */}
          <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || isLocating}
              className="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Confirm & Save Punch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AttendanceModal
