import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Delete, AlertTriangle, Camera } from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================
interface FontSizeConfig {
  centerText: number
  subText: number
  bottomText: number
  timeText: number
}

interface TextAlignConfig {
  centerText: 'left' | 'center' | 'right'
  subText: 'left' | 'center' | 'right'
  bottomText: 'left' | 'center' | 'right'
}

interface FontWeightConfig {
  centerText: 'light' | 'normal' | 'medium' | 'bold'
  subText: 'light' | 'normal' | 'medium' | 'bold'
  bottomText: 'light' | 'normal' | 'medium' | 'bold'
}

interface StyleConfig {
  centerText: string
  subText: string
  bottomLeftText: string
  bottomRightText: string
  backgroundColor: string
  textColor: string
  timePosition: 'hidden' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  timeFormat: string
  closeScreenPrompt: string
  fontSizes: FontSizeConfig
  textAligns: TextAlignConfig
  fontWeights: FontWeightConfig
}

interface UnlockRecord {
  timestamp: number
  success: boolean
  attemptCount: number
  unlockMethod?: 'fixed' | 'totp'
  photoData?: string
  error?: string
}

// ============================================================================
// 数字键盘组件
// ============================================================================
function Keypad({
  onKeyPress,
  onDelete,
  onClear,
  textColor
}: {
  onKeyPress: (key: string) => void
  onDelete: () => void
  onClear: () => void
  textColor: string
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫']

  const isLightText = textColor.toLowerCase() === '#ffffff' || textColor.toLowerCase() === '#fff'
  const buttonBg = isLightText ? 'bg-white/10' : 'bg-black/10'
  const buttonHoverBg = isLightText ? 'hover:bg-white/20' : 'hover:bg-black/20'

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => {
        if (key === 'C') {
          return (
            <button
              key={key}
              onClick={onClear}
              className={`h-14 ${buttonBg} ${buttonHoverBg} flex items-center justify-center text-sm font-medium transition-colors`}
              style={{ color: textColor }}
            >
              清空
            </button>
          )
        }
        if (key === '⌫') {
          return (
            <button
              key={key}
              onClick={onDelete}
              className={`h-14 ${buttonBg} ${buttonHoverBg} flex items-center justify-center transition-colors`}
              style={{ color: textColor }}
            >
              <Delete className="w-5 h-5" />
            </button>
          )
        }
        return (
          <button
            key={key}
            onClick={() => onKeyPress(key)}
            className={`h-14 ${buttonBg} ${buttonHoverBg} flex items-center justify-center text-xl font-medium transition-colors`}
            style={{ color: textColor }}
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// 摄像头组件
// ============================================================================
function CameraCapture({
  onCapture,
  enabled,
  selectedDeviceId
}: {
  onCapture: (data: string) => void
  enabled: boolean
  selectedDeviceId?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [, setError] = useState('')
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setHasCamera(false)
      return
    }

    const initCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        if (selectedDeviceId) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                deviceId: { exact: selectedDeviceId }
              }
            })
            streamRef.current = stream
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              setHasCamera(true)
              setIsUsingFallback(false)
              setError('')
              return
            }
          } catch {
            setHasCamera(false)
            setIsUsingFallback(false)
            setError('指定摄像头不可用')
            return
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setHasCamera(true)
          setIsUsingFallback(false)
          setError('')
        }
      } catch (err) {
        setHasCamera(false)
        setIsUsingFallback(false)
        setError('摄像头不可用')
      }
    }

    initCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [enabled, selectedDeviceId])

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || !hasCamera) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    onCapture(dataUrl)
    return dataUrl
  }

  useEffect(() => {
    if (enabled) {
      ;(window as any).capturePhoto = capture
    }
  }, [enabled, hasCamera])

  if (!enabled) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      <div
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono
          ${hasCamera ? (isUsingFallback ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400') : 'bg-red-500/20 text-red-400'}`}
      >
        <Camera className="w-3 h-3" />
        {hasCamera ? (isUsingFallback ? '备用摄像头' : '监控中') : '无监控'}
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================
export default function LockScreen() {
  const [style, setStyle] = useState<StyleConfig>({
    centerText: '此计算机因违规外联已被阻断',
    subText: '请等待安全部门与你联系',
    bottomLeftText: '保密委员会办公室\n意识形态工作领导小组办公室',
    bottomRightText: '',
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    timePosition: 'hidden',
    timeFormat: 'HH:mm:ss',
    closeScreenPrompt: '请关闭投影设备后继续',
    fontSizes: { centerText: 48, subText: 24, bottomText: 14, timeText: 18 },
    textAligns: { centerText: 'center', subText: 'center', bottomText: 'center' },
    fontWeights: { centerText: 'medium', subText: 'normal', bottomText: 'normal' }
  })

  const [currentTime, setCurrentTime] = useState(new Date())
  const [showClosePrompt, setShowClosePrompt] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockReady, setUnlockReady] = useState(false)
  const [pin, setPin] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [, setUnlockRecords] = useState<UnlockRecord[]>([])
  const [cameraEnabled] = useState(true)
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
  const [cameraConfigLoaded, setCameraConfigLoaded] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isStyleLoaded, setIsStyleLoaded] = useState(false)

  // 光标自动隐藏相关
  const [cursorVisible, setCursorVisible] = useState(true)
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载样式
  useEffect(() => {
    window.api
      .getStyle()
      .then((config) => {
        if (!config) return
        setStyle((prev) => ({
          centerText: config.centerText ?? prev.centerText,
          subText: config.subText ?? prev.subText,
          bottomLeftText: config.bottomLeftText ?? prev.bottomLeftText,
          bottomRightText: config.bottomRightText ?? prev.bottomRightText,
          backgroundColor: config.backgroundColor ?? prev.backgroundColor,
          textColor: config.textColor ?? prev.textColor,
          timePosition: config.timePosition ?? prev.timePosition,
          timeFormat: config.timeFormat ?? prev.timeFormat,
          closeScreenPrompt: config.closeScreenPrompt ?? prev.closeScreenPrompt,
          fontSizes: config.fontSizes ?? prev.fontSizes,
          textAligns: config.textAligns ?? prev.textAligns,
          fontWeights: config.fontWeights ?? prev.fontWeights
        }))
      })
      .finally(() => {
        setIsStyleLoaded(true)
      })
  }, [])

  // 加载选中的摄像头
  useEffect(() => {
    window.api
      .getSelectedCamera()
      .then(setSelectedCamera)
      .catch(console.error)
      .finally(() => setCameraConfigLoaded(true))
  }, [])

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 光标自动隐藏逻辑
  const resetCursorTimeout = useCallback(() => {
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current)
    }
    setCursorVisible(true)
    cursorTimeoutRef.current = setTimeout(() => {
      setCursorVisible(false)
    }, 3000)
  }, [])

  useEffect(() => {
    const handleMouseMove = () => resetCursorTimeout()
    const handleMouseDown = () => resetCursorTimeout()
    const handleKeyDown = () => resetCursorTimeout()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)

    resetCursorTimeout()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current)
    }
  }, [resetCursorTimeout])

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showUnlockModal || unlocked) return
      if (e.key >= '0' && e.key <= '9') handleKeyPress(e.key)
      else if (e.key === 'Backspace') handleDelete()
      else if (e.key === 'Enter') handleUnlock()
      else if (e.key === 'Escape') {
        setShowUnlockModal(false)
        setUnlockReady(false)
        setPin('')
        setError('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showUnlockModal, pin, unlocked, isVerifying])

  const handleKeyPress = useCallback(
    (key: string) => {
      if (pin.length < 6 && !isVerifying && !unlocked) {
        setPin((prev) => prev + key)
        setError('')
      }
    },
    [pin, isVerifying, unlocked]
  )

  const handleDelete = useCallback(() => {
    if (!isVerifying && !unlocked) {
      setPin((prev) => prev.slice(0, -1))
      setError('')
    }
  }, [isVerifying, unlocked])

  const handleClear = useCallback(() => {
    if (!isVerifying && !unlocked) {
      setPin('')
      setError('')
    }
  }, [isVerifying, unlocked])

  const captureAndRecord = async (
    success: boolean,
    count: number,
    unlockMethod?: 'fixed' | 'totp'
  ) => {
    let photoData: string | undefined
    try {
      if (cameraEnabled && (window as any).capturePhoto) {
        photoData = (window as any).capturePhoto()
      }
    } catch (e) {
      console.error('Capture error:', e)
    }

    const record: UnlockRecord = {
      timestamp: Date.now(),
      success,
      attemptCount: count,
      unlockMethod,
      photoData
    }
    setUnlockRecords((prev) => [record, ...prev].slice(0, 50))
    try {
      await window.api.saveUnlockRecord(record)
    } catch (e) {
      console.error('Failed to save record:', e)
    }
  }

  const handleUnlock = async () => {
    if (pin.length !== 6 || isVerifying || unlocked) return
    setIsVerifying(true)
    setError('')
    const newCount = attemptCount + 1
    setAttemptCount(newCount)

    try {
      const result = await window.api.verifyPasswordWithMethod(pin)
      await captureAndRecord(result.success, newCount, result.method)
      if (result.success) {
        setUnlocked(true)
        setTimeout(() => window.api.unlock(), 800)
      } else {
        setError('密码错误')
        setPin('')
      }
    } catch (e) {
      setError('验证失败')
      setPin('')
      await captureAndRecord(false, newCount)
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    if (pin.length === 6 && !isVerifying && !unlocked) {
      handleUnlock()
    }
  }, [pin])

  // 点击背景处理 - 两步迷惑流程
  // 1. 点击背景 -> 显示"关闭投影设备"提示（迷惑性）
  // 2. 点击"已关闭，继续" -> 仅关闭提示并进入可解锁状态（仍不显示密码框）
  // 3. 再次点击背景 -> 才显示密码输入框
  const handleBackgroundClick = () => {
    if (unlocked || showUnlockModal) return

    if (unlockReady) {
      setShowUnlockModal(true)
      setAttemptCount(0)
      return
    }

    if (!showClosePrompt) {
      setShowClosePrompt(true)
    } else {
      setShowClosePrompt(false)
    }
  }

  // 确认关闭大屏后继续 - 只允许下一次背景点击进入密码输入
  const handleConfirmClose = () => {
    setShowClosePrompt(false)
    setUnlockReady(true)
  }

  const alignClassMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  } as const

  const fontWeightMap = {
    light: 300,
    normal: 400,
    medium: 500,
    bold: 700
  } as const

  const formatTime = (date: Date): string => {
    const format = style.timeFormat || 'HH:mm:ss'
    const pad = (n: number) => n.toString().padStart(2, '0')
    return format
      .replace('HH', pad(date.getHours()))
      .replace('mm', pad(date.getMinutes()))
      .replace('ss', pad(date.getSeconds()))
      .replace('YYYY', date.getFullYear().toString())
      .replace('MM', pad(date.getMonth() + 1))
      .replace('DD', pad(date.getDate()))
  }

  const renderTime = () => {
    if (style.timePosition === 'hidden') return null
    const positions = {
      'top-left': 'fixed top-8 left-8',
      'top-right': 'fixed top-8 right-8',
      'bottom-left': 'fixed bottom-8 left-8',
      'bottom-right': 'fixed bottom-8 right-8',
      center: 'mb-6'
    }
    return (
      <div
        className={`${positions[style.timePosition]} font-mono opacity-70`}
        style={{
          color: style.textColor,
          fontSize: style.fontSizes?.timeText || 18,
          textAlign: style.textAligns?.subText || 'center'
        }}
      >
        {formatTime(currentTime)}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col items-center justify-center p-8 select-none cursor-default"
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        cursor: cursorVisible ? 'default' : 'none'
      }}
      onClick={handleBackgroundClick}
    >
      {!isStyleLoaded ? null : (
        <>
      <CameraCapture
        onCapture={() => {}}
        enabled={cameraEnabled && cameraConfigLoaded}
        selectedDeviceId={selectedCamera}
      />
      {renderTime()}

      {/* 主内容 */}
      <div className="max-w-4xl w-full">
        <h1
          className={`whitespace-pre-line leading-relaxed ${alignClassMap[style.textAligns?.centerText || 'center']}`}
          style={{
            color: style.textColor,
            fontSize: style.fontSizes?.centerText || 48,
            fontWeight: fontWeightMap[style.fontWeights?.centerText || 'medium']
          }}
        >
          {style.centerText}
        </h1>
        <p
          className={`opacity-80 whitespace-pre-line mt-4 ${alignClassMap[style.textAligns?.subText || 'center']}`}
          style={{
            color: style.textColor,
            fontSize: style.fontSizes?.subText || 24,
            fontWeight: fontWeightMap[style.fontWeights?.subText || 'normal']
          }}
        >
          {style.subText}
        </p>
      </div>

      {/* 底部文字 */}
      <div
        className="fixed bottom-8 left-8 right-8 flex items-end justify-between gap-8 opacity-60 pointer-events-none"
        style={{
          color: style.textColor,
          fontSize: style.fontSizes?.bottomText || 14,
          fontWeight: fontWeightMap[style.fontWeights?.bottomText || 'normal']
        }}
      >
        <span className="whitespace-pre-line text-left max-w-[45%]">{style.bottomLeftText}</span>
        <span className="whitespace-pre-line text-right max-w-[45%]">{style.bottomRightText}</span>
      </div>

      {/* 关闭设备提示 - 第一步 */}
      {showClosePrompt && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'default' }}
        >
          <div
            className="p-8 max-w-md mx-4 text-center"
            style={{ backgroundColor: style.backgroundColor }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={{ border: `1px solid ${style.textColor}40` }}
            >
              <AlertTriangle className="w-6 h-6" style={{ color: style.textColor }} />
            </div>
            <h3
              className={`text-lg mb-4 whitespace-pre-line ${alignClassMap[style.textAligns?.centerText || 'center']}`}
              style={{ color: style.textColor }}
            >
              {style.closeScreenPrompt}
            </h3>
            <p className="text-sm opacity-60 mb-6" style={{ color: style.textColor }}>
              点击"已关闭"继续操作，或点击背景取消
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowClosePrompt(false)}
                className="px-6 py-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: style.textColor, border: `1px solid ${style.textColor}30` }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-6 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: style.textColor, color: style.backgroundColor }}
              >
                已关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 解锁弹窗 - 第二步 */}
      {showUnlockModal && !unlocked && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'default' }}
        >
          <div className="w-80" style={{ backgroundColor: style.backgroundColor }}>
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: `${style.textColor}20` }}
            >
              <span className="text-sm font-medium" style={{ color: style.textColor }}>
                输入密码
              </span>
              {attemptCount > 0 && (
                <span className="text-xs opacity-50" style={{ color: style.textColor }}>
                  第 {attemptCount} 次
                </span>
              )}
              <button
                onClick={() => {
                  setShowUnlockModal(false)
                  setUnlockReady(false)
                  setPin('')
                  setError('')
                }}
                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: style.textColor }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {/* 密码显示 */}
              <div className="flex justify-center gap-2 mb-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="w-10 h-12 flex items-center justify-center text-lg font-bold border-2 transition-all"
                    style={{
                      borderColor: error
                        ? '#ef4444'
                        : i < pin.length
                          ? style.textColor
                          : `${style.textColor}30`,
                      backgroundColor: i < pin.length ? `${style.textColor}15` : 'transparent',
                      color: style.textColor
                    }}
                  >
                    {pin[i] ? '●' : ''}
                  </div>
                ))}
              </div>

              {/* 错误提示 */}
              {error && (
                <div
                  className="mb-4 p-3 text-sm text-center"
                  style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                >
                  {error}
                </div>
              )}

              {/* 加载中 */}
              {isVerifying && (
                <div className="mb-4 text-center">
                  <div
                    className="inline-block w-5 h-5 border-2 border-t-transparent animate-spin"
                    style={{ borderColor: style.textColor, borderTopColor: 'transparent' }}
                  />
                  <p className="text-xs mt-2 opacity-60" style={{ color: style.textColor }}>
                    验证中...
                  </p>
                </div>
              )}

              {/* 数字键盘 */}
              <Keypad
                onKeyPress={handleKeyPress}
                onDelete={handleDelete}
                onClear={handleClear}
                textColor={style.textColor}
              />
            </div>
          </div>
        </div>
      )}

      {/* 解锁成功 */}
      {unlocked && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="p-10 text-center" style={{ backgroundColor: style.backgroundColor }}>
            <div
              className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#22c55e' }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-1" style={{ color: style.textColor }}>
              解锁成功
            </h3>
            <p className="text-sm opacity-60" style={{ color: style.textColor }}>
              自动锁屏已暂停
            </p>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
