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
}

interface UnlockRecord {
  timestamp: number
  success: boolean
  attemptCount: number
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
  const buttonActiveBg = isLightText ? 'active:bg-white/30' : 'active:bg-black/30'

  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key) => {
        if (key === 'C') {
          return (
            <button
              key={key}
              onClick={onClear}
              className={`w-16 h-16 rounded-xl ${buttonBg} ${buttonHoverBg} ${buttonActiveBg} 
                flex items-center justify-center text-xl font-medium 
                transition-all duration-200 active:scale-95`}
              style={{ color: textColor }}
            >
              <span className="text-sm">清空</span>
            </button>
          )
        }
        if (key === '⌫') {
          return (
            <button
              key={key}
              onClick={onDelete}
              className={`w-16 h-16 rounded-xl ${buttonBg} ${buttonHoverBg} ${buttonActiveBg} 
                flex items-center justify-center text-xl font-medium 
                transition-all duration-200 active:scale-95`}
              style={{ color: textColor }}
            >
              <Delete className="w-6 h-6" />
            </button>
          )
        }
        return (
          <button
            key={key}
            onClick={() => onKeyPress(key)}
            className={`w-16 h-16 rounded-xl ${buttonBg} ${buttonHoverBg} ${buttonActiveBg} 
              flex items-center justify-center text-2xl font-medium 
              transition-all duration-200 active:scale-95`}
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
  const [error, setError] = useState('')
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!enabled) {
      // 清理流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setHasCamera(false)
      setIsUsingFallback(false)
      return
    }

    const initCamera = async () => {
      try {
        // 停止之前的流
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        // 首先尝试使用指定的设备ID
        if (selectedDeviceId) {
          try {
            const constraints: MediaStreamConstraints = {
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                deviceId: { exact: selectedDeviceId }
              }
            }
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              setHasCamera(true)
              setIsUsingFallback(false)
              setError('')
              return
            }
          } catch (specificErr: any) {
            console.warn('Failed to use selected camera, will try fallback:', specificErr)
            // 指定的摄像头不可用，继续尝试默认摄像头
          }
        }

        // 尝试使用默认摄像头（优先使用前置摄像头）
        try {
          const fallbackConstraints: MediaStreamConstraints = {
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            }
          }
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            setHasCamera(true)
            // 如果用户指定了摄像头但我们回退到了默认摄像头，标记为使用回退
            setIsUsingFallback(!!selectedDeviceId)
            setError('')
          }
        } catch (fallbackErr: any) {
          setHasCamera(false)
          setIsUsingFallback(false)
          if (fallbackErr.name === 'NotAllowedError') {
            setError('摄像头权限被拒绝')
          } else if (fallbackErr.name === 'NotFoundError') {
            setError('未找到摄像头设备')
          } else {
            setError('摄像头初始化失败')
          }
        }
      } catch (err: any) {
        console.error('Camera error:', err)
        setHasCamera(false)
        setIsUsingFallback(false)
        setError('摄像头初始化失败')
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

  // 暴露捕获方法给父组件
  useEffect(() => {
    if (enabled) {
      ;(window as any).capturePhoto = capture
    }
  }, [enabled, hasCamera])

  if (!enabled) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* 隐藏的视频元素 */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* 摄像头状态指示器 */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-300 ${
            hasCamera
              ? isUsingFallback
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        title={
          error ||
          (hasCamera
            ? isUsingFallback
              ? '使用备用摄像头（指定的摄像头不可用）'
              : '摄像头正常工作'
            : '摄像头不可用')
        }
      >
        {hasCamera ? <Camera className="w-3 h-3" /> : <Camera className="w-3 h-3 opacity-50" />}
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
    bottomLeftText: '保密委员会办公室',
    bottomRightText: '',
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    timePosition: 'hidden',
    timeFormat: 'HH:mm:ss',
    closeScreenPrompt: '请关闭班级大屏后再继续操作',
    fontSizes: {
      centerText: 48,
      subText: 28,
      bottomText: 16,
      timeText: 20
    }
  })

  const [currentTime, setCurrentTime] = useState(new Date())
  const [showClosePrompt, setShowClosePrompt] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [pin, setPin] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [, setUnlockRecords] = useState<UnlockRecord[]>([])
  const [cameraEnabled] = useState(true)
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
  const [attemptCount, setAttemptCount] = useState(0)

  // 获取样式配置
  useEffect(() => {
    const loadStyle = async () => {
      try {
        const config = await window.api.getStyle()
        if (config) {
          setStyle({
            centerText: config.centerText || '此计算机因违规外联已被阻断',
            subText: config.subText || '请等待安全部门与你联系',
            bottomLeftText: config.bottomLeftText || '',
            bottomRightText: config.bottomRightText || '',
            backgroundColor: config.backgroundColor || '#0066cc',
            textColor: config.textColor || '#ffffff',
            timePosition: config.timePosition || 'hidden',
            timeFormat: config.timeFormat || 'HH:mm:ss',
            closeScreenPrompt: config.closeScreenPrompt || '请关闭班级大屏后再继续操作',
            fontSizes: config.fontSizes || {
              centerText: 48,
              subText: 28,
              bottomText: 16,
              timeText: 20
            }
          })
        }
      } catch (e) {
        console.error('Failed to load style:', e)
      }
    }
    loadStyle()
  }, [])

  // 获取选中的相机
  useEffect(() => {
    const loadSelectedCamera = async () => {
      try {
        const deviceId = await window.api.getSelectedCamera()
        setSelectedCamera(deviceId)
      } catch (e) {
        console.error('Failed to load selected camera:', e)
      }
    }
    loadSelectedCamera()
  }, [])

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showUnlockModal || unlocked) return

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key)
      } else if (e.key === 'Backspace') {
        handleDelete()
      } else if (e.key === 'Enter') {
        handleUnlock()
      } else if (e.key === 'Escape') {
        setShowUnlockModal(false)
        setPin('')
        setError('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showUnlockModal, pin, unlocked])

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

  // 拍照并记录
  const captureAndRecord = async (success: boolean, currentAttemptCount: number) => {
    let photoData: string | undefined
    let error: string | undefined

    try {
      if (cameraEnabled && (window as any).capturePhoto) {
        photoData = (window as any).capturePhoto()
      }
    } catch (e: any) {
      error = e.message || '拍照失败'
      console.error('Capture error:', e)
    }

    const record: UnlockRecord = {
      timestamp: Date.now(),
      success,
      attemptCount: currentAttemptCount,
      photoData,
      error
    }

    setUnlockRecords((prev) => [record, ...prev].slice(0, 50)) // 保留最近50条记录

    // 将记录发送到主进程保存到文件
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

    // 增加尝试次数
    const newAttemptCount = attemptCount + 1
    setAttemptCount(newAttemptCount)

    try {
      const success = await window.api.verifyPassword(pin)

      // 记录解锁尝试（无论成功与否）
      await captureAndRecord(success, newAttemptCount)

      if (success) {
        setUnlocked(true)
        setTimeout(() => {
          window.api.unlock()
        }, 800)
      } else {
        setError('密码错误')
        setPin('')
        // 错误震动动画
        const modal = document.getElementById('unlock-modal')
        modal?.classList.add('animate-shake')
        setTimeout(() => modal?.classList.remove('animate-shake'), 500)
      }
    } catch (e) {
      console.error('Unlock error:', e)
      setError('验证失败')
      setPin('')
      await captureAndRecord(false, newAttemptCount)
    } finally {
      setIsVerifying(false)
    }
  }

  // 自动提交当输入满6位
  useEffect(() => {
    if (pin.length === 6 && !isVerifying && !unlocked) {
      handleUnlock()
    }
  }, [pin])

  // 点击背景
  const handleBackgroundClick = () => {
    if (!unlocked && !showUnlockModal && !showClosePrompt) {
      setShowClosePrompt(true)
    }
  }

  // 确认关闭大屏后继续
  const handleConfirmClose = () => {
    setShowClosePrompt(false)
    setShowUnlockModal(true)
    setAttemptCount(0) // 重置尝试次数
  }

  // 格式化时间
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

  // 渲染时间
  const renderTime = () => {
    if (style.timePosition === 'hidden') return null

    const positionClasses = {
      'top-left': 'fixed top-8 left-8',
      'top-right': 'fixed top-8 right-8',
      'bottom-left': 'fixed bottom-8 left-8',
      'bottom-right': 'fixed bottom-8 right-8',
      center: 'mb-8'
    }

    return (
      <div
        className={`${positionClasses[style.timePosition]} opacity-80 font-mono
          transition-all duration-500 animate-fade-in`}
        style={{ color: style.textColor, fontSize: style.fontSizes?.timeText || 20 }}
      >
        {formatTime(currentTime)}
      </div>
    )
  }

  // 获取主标题字体大小（响应式）
  const getCenterTextSize = () => {
    const baseSize = style.fontSizes?.centerText || 48
    // 根据文字长度适当调整
    const textLength = style.centerText?.length || 0
    if (textLength > 50) return Math.max(baseSize * 0.6, 24)
    if (textLength > 30) return Math.max(baseSize * 0.8, 28)
    return baseSize
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-8 select-none cursor-pointer
        transition-all duration-500"
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor
      }}
      onClick={handleBackgroundClick}
    >
      {/* 摄像头组件 */}
      <CameraCapture
        onCapture={(data) => console.log('Photo captured:', data?.slice(0, 50))}
        enabled={cameraEnabled}
        selectedDeviceId={selectedCamera}
      />

      {/* 时间显示 */}
      {renderTime()}

      {/* 主内容区域 */}
      <div className="text-center max-w-4xl animate-fade-in-up">
        {/* 主标题 - 支持换行 */}
        <h1
          className="font-medium mb-4 leading-relaxed whitespace-pre-line"
          style={{
            color: style.textColor,
            fontSize: getCenterTextSize()
          }}
        >
          {style.centerText}
        </h1>

        {/* 副标题 - 支持换行 */}
        <p
          className="opacity-90 whitespace-pre-line"
          style={{
            color: style.textColor,
            fontSize: style.fontSizes?.subText || 28
          }}
        >
          {style.subText}
        </p>
      </div>

      {/* 底部文字 */}
      <div
        className="fixed bottom-8 left-8 right-8 flex justify-between opacity-70
          whitespace-pre-line"
        style={{ color: style.textColor, fontSize: style.fontSizes?.bottomText || 16 }}
      >
        <span>{style.bottomLeftText}</span>
        <span>{style.bottomRightText}</span>
      </div>

      {/* 关闭班级大屏提示 */}
      {showClosePrompt && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50
            animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-xl p-8 max-w-md text-center mx-4 animate-scale-in"
            style={{
              backgroundColor: style.backgroundColor,
              border: `2px solid ${style.textColor}40`,
              boxShadow: `0 0 40px ${style.backgroundColor}80`
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
                animate-pulse"
              style={{ backgroundColor: `${style.textColor}20` }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: style.textColor }} />
            </div>

            <h3
              className="font-medium mb-4 whitespace-pre-line"
              style={{ color: style.textColor, fontSize: 20 }}
            >
              {style.closeScreenPrompt}
            </h3>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowClosePrompt(false)}
                className="px-6 py-2 rounded-lg text-sm font-medium opacity-60 
                  hover:opacity-100 transition-all duration-200"
                style={{
                  color: style.textColor,
                  border: `1px solid ${style.textColor}40`
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-6 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: style.textColor,
                  color: style.backgroundColor
                }}
              >
                已关闭，继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 解锁弹窗 */}
      {showUnlockModal && !unlocked && (
        <div
          id="unlock-modal"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50
            animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-xl p-6 w-80 animate-scale-in"
            style={{
              backgroundColor: style.backgroundColor,
              border: `1px solid ${style.textColor}30`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5)`
            }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-medium" style={{ color: style.textColor }}>
                输入密码解锁
              </span>
              {attemptCount > 0 && (
                <span className="text-xs opacity-60" style={{ color: style.textColor }}>
                  第 {attemptCount} 次尝试
                </span>
              )}
              <button
                onClick={() => {
                  setShowUnlockModal(false)
                  setPin('')
                  setError('')
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200
                  active:scale-90"
                style={{ color: style.textColor }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 密码显示 */}
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="w-10 h-12 rounded-lg flex items-center justify-center text-lg font-bold 
                    border-2 transition-all duration-200"
                  style={{
                    borderColor: error
                      ? '#ef4444'
                      : i < pin.length
                        ? style.textColor
                        : `${style.textColor}30`,
                    backgroundColor: i < pin.length ? `${style.textColor}20` : 'transparent',
                    color: style.textColor,
                    transform: i === pin.length - 1 ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  {pin[i] ? '●' : ''}
                </div>
              ))}
            </div>

            {/* 错误提示 */}
            {error && (
              <div
                className="mb-4 p-2.5 rounded-lg flex items-center justify-center gap-2 text-sm
                  animate-shake"
                style={{
                  backgroundColor: '#ef444420',
                  color: '#ef4444'
                }}
              >
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* 加载中 */}
            {isVerifying && (
              <div className="mb-4 text-center">
                <div
                  className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: style.textColor, borderTopColor: 'transparent' }}
                />
                <p className="text-xs mt-2 opacity-70" style={{ color: style.textColor }}>
                  验证中...
                </p>
              </div>
            )}

            {/* 数字键盘 */}
            <div className="flex justify-center">
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

      {/* 解锁成功提示 */}
      {unlocked && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50
          animate-fade-in"
        >
          <div
            className="rounded-xl p-10 text-center animate-scale-in"
            style={{ backgroundColor: style.backgroundColor }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4
                animate-bounce"
              style={{ backgroundColor: '#22c55e' }}
            >
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-1" style={{ color: style.textColor }}>
              解锁成功
            </h3>
            <p className="text-sm opacity-70" style={{ color: style.textColor }}>
              自动锁屏已暂停
            </p>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
