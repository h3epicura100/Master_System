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
  AlertCircle
} from 'lucide-react'
import { staffStorageService } from '../services/hrmsStorageService'

export function AttendanceModal({ isOpen, onClose, onSave, preselectedEmployeeId = null, preselectedType = 'in' }) {
  const staff = staffStorageService.getStaff()
  const activeStaff = staff

  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || (activeStaff[0]?.id || ''))
  const [punchType, setPunchType] = useState(preselectedType || 'in')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  const [outTime, setOutTime] = useState('')
  const [location, setLocation] = useState('NH30, Raipur, Chhattisgarh, (492001)')
  const [coordinates, setCoordinates] = useState('21.2647°N, 81.6367°E')
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
      const now = new Date()
      setDate(now.toISOString().split('T')[0])
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setCapturedPhoto(null)
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
        setCameraError('Camera API not supported in this browser. Simulation mode active.')
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err)
      setCameraError('Camera permission denied or camera in use. Simulated live camera mode active.')
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

  // Location / GPS fetch
  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4)
          const lon = pos.coords.longitude.toFixed(4)
          setCoordinates(`${lat}°N, ${lon}°E`)
          setLocation(`Raipur Operations Hub, Chhattisgarh (${lat}°, ${lon}°)`)
        },
        () => {
          // Fallback to Raipur coordinates from screenshots
          setCoordinates('21.2647°N, 81.6367°E')
          setLocation('NH30, Raipur, Chhattisgarh, (492001)')
        }
      )
    }
  }

  // Capture face photo
  const handleCapture = () => {
    if (videoRef.current && cameraActive) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      setCapturedPhoto(canvas.toDataURL('image/jpeg'))
    } else {
      // Create simulated stamped capture photo
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 480)
      grad.addColorStop(0, '#1e293b')
      grad.addColorStop(1, '#0f172a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 640, 480)

      // Silhouette avatar
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.arc(320, 200, 70, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(320, 360, 120, 0, Math.PI, true)
      ctx.fill()

      setCapturedPhoto(canvas.toDataURL('image/jpeg'))
    }
  }

  const selectedEmp = staff.find((s) => s.id === employeeId)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!employeeId) return

    staffStorageService.recordPunch({
      employee_id: employeeId,
      type: punchType,
      date,
      time: time || '10:00 am',
      location,
      coordinates,
      photo_url: capturedPhoto || ''
    })

    if (onSave) onSave()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Record Attendance Punch
              </h3>
              <p className="text-xs text-slate-500">
                Face scan & live GPS location stamped onto record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-sm font-semibold transition-all appearance-none"
                >
                  <option value="">Select Employee...</option>
                  {staff.map((emp) => (
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
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 10:00 am"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                />
              </div>
            </div>

            {/* Premise / Location */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Location / Premise
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
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

            <div className="relative aspect-video max-h-64 sm:max-h-72 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center">
              {capturedPhoto ? (
                <img src={capturedPhoto} alt="Captured punch" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
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
                    Click "Capture Face" below to stamp timestamp & GPS onto attendance photo
                  </p>
                </div>
              )}

              {/* Glassmorphism Corner Stamp Overlay */}
              <div className="absolute bottom-3 right-3 max-w-[85%] sm:max-w-xs bg-slate-950/80 backdrop-blur-md border border-white/20 rounded-xl p-2.5 text-white shadow-xl text-[10px] sm:text-[11px] space-y-0.5">
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
                  <span>{coordinates}</span>
                  <span>{time}</span>
                </div>
              </div>
            </div>

            {/* Capture and Re-take controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleCapture}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{capturedPhoto ? 'Re-take Face Photo' : 'Capture Face Photo'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLocation}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  <span>Refresh GPS</span>
                </button>
                <a
                  href={`https://www.google.com/maps?q=21.2647,81.6367`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Open Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md shadow-violet-200 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Save Punch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AttendanceModal
