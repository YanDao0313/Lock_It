import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import {
  Save,
  Lock,
  Plus,
  Trash2,
  Check,
  Shield,
  Monitor,
  Moon,
  Sun,
  Camera,
  Image,
  X,
  AlertCircle,
  Download,
  Settings2,
  ChevronRight,
  Calendar,
  Eye,
  Aperture,
  Info,
  Power,
  RefreshCw
} from 'lucide-react'
import {
  AppLanguage,
  getDayNames,
  getLanguageOptions,
  getLocaleForDate,
  normalizeLanguage,
  t
} from './i18n'

// ============================================================================
// 类型定义
// ============================================================================
interface TimeSlot {
  start: string
  end: string
}

interface DaySchedule {
  enabled: boolean
  slots: TimeSlot[]
}

interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

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
  themeMode: 'light' | 'dark' | 'system' | 'custom'
  themeName?: string
  centerText: string
  subText: string
  bottomLeftText: string
  bottomRightText: string
  backgroundColor: string
  textColor: string
  lightBackgroundColor?: string
  lightTextColor?: string
  timePosition: 'hidden' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  timeFormat: string
  closeScreenPrompt: string
  fontSizes: FontSizeConfig
  textAligns: TextAlignConfig
  fontWeights: FontWeightConfig
}

interface PasswordConfig {
  type: 'fixed' | 'totp' | 'both'
  fixedPassword?: string
  totpSecret?: string
  totpDeviceName?: string
}

interface UnlockRecord {
  id: string
  timestamp: number
  success: boolean
  attemptCount: number
  unlockMethod?: 'fixed' | 'totp'
  photoData?: string
  photoPath?: string
  error?: string
}

interface CameraDevice {
  deviceId: string
  label: string
}

interface StartupConfig {
  autoLaunch: boolean
}

interface UpdateConfig {
  checkOnStartup: boolean
  autoDownload: boolean
  autoInstallOnQuit: boolean
}

interface RuntimeInfo {
  platform: string
  appVersion: string
  autoLaunchSupported: boolean
  isPackaged: boolean
}

interface UpdateStatus {
  status:
    | 'idle'
    | 'disabled'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  message: string
  version?: string
}

type LocaleText = {
  'zh-CN': string
  'en-US': string
  'ja-JP': string
  'ko-KR': string
}

function lt(language: AppLanguage, text: LocaleText): string {
  return text[language] || text['zh-CN']
}

// ============================================================================
// 预置主题 - 瑞士风格配色
// ============================================================================
function getPresetThemes(language: AppLanguage) {
  return [
    {
      name: lt(language, {
        'zh-CN': '警示蓝',
        'en-US': 'Alert Blue',
        'ja-JP': '警告ブルー',
        'ko-KR': '경고 블루'
      }),
      themeMode: 'custom' as const,
      backgroundColor: '#1a365d',
      textColor: '#ffffff',
      lightBackgroundColor: '#e2e8f0',
      lightTextColor: '#1a365d',
      centerText: lt(language, {
        'zh-CN': '系统已锁定',
        'en-US': 'System Locked',
        'ja-JP': 'システムはロックされています',
        'ko-KR': '시스템이 잠겼습니다'
      }),
      subText: lt(language, {
        'zh-CN': '未经授权禁止访问',
        'en-US': 'Unauthorized access is prohibited',
        'ja-JP': '未承認アクセスは禁止されています',
        'ko-KR': '무단 접근이 금지되었습니다'
      })
    },
    {
      name: lt(language, {
        'zh-CN': '警戒红',
        'en-US': 'Alert Red',
        'ja-JP': '警戒レッド',
        'ko-KR': '경계 레드'
      }),
      themeMode: 'custom' as const,
      backgroundColor: '#7f1d1d',
      textColor: '#ffffff',
      lightBackgroundColor: '#fee2e2',
      lightTextColor: '#7f1d1d',
      centerText: lt(language, {
        'zh-CN': '安全警报',
        'en-US': 'Security Alert',
        'ja-JP': 'セキュリティ警告',
        'ko-KR': '보안 경고'
      }),
      subText: lt(language, {
        'zh-CN': '检测到未授权访问尝试',
        'en-US': 'Unauthorized access attempt detected',
        'ja-JP': '未承認アクセスの試行を検出しました',
        'ko-KR': '무단 접근 시도가 감지되었습니다'
      })
    },
    {
      name: lt(language, {
        'zh-CN': '极简黑',
        'en-US': 'Minimal Black',
        'ja-JP': 'ミニマルブラック',
        'ko-KR': '미니멀 블랙'
      }),
      themeMode: 'custom' as const,
      backgroundColor: '#0a0a0a',
      textColor: '#fafafa',
      lightBackgroundColor: '#f5f5f5',
      lightTextColor: '#0a0a0a',
      centerText: lt(language, {
        'zh-CN': '设备已锁定',
        'en-US': 'Device Locked',
        'ja-JP': 'デバイスはロックされています',
        'ko-KR': '기기가 잠겼습니다'
      }),
      subText: lt(language, {
        'zh-CN': '请联系管理员',
        'en-US': 'Please contact the administrator',
        'ja-JP': '管理者に連絡してください',
        'ko-KR': '관리자에게 문의하세요'
      })
    },
    {
      name: lt(language, {
        'zh-CN': '深色',
        'en-US': 'Dark',
        'ja-JP': 'ダーク',
        'ko-KR': '다크'
      }),
      themeMode: 'dark' as const,
      backgroundColor: '#171717',
      textColor: '#e5e5e5',
      lightBackgroundColor: '#f5f5f5',
      lightTextColor: '#171717',
      centerText: lt(language, {
        'zh-CN': '屏幕锁定',
        'en-US': 'Screen Locked',
        'ja-JP': '画面はロックされています',
        'ko-KR': '화면이 잠겼습니다'
      }),
      subText: lt(language, {
        'zh-CN': '输入密码解锁',
        'en-US': 'Enter password to unlock',
        'ja-JP': 'パスワードを入力して解除',
        'ko-KR': '비밀번호를 입력해 잠금 해제'
      })
    },
    {
      name: lt(language, {
        'zh-CN': '浅色',
        'en-US': 'Light',
        'ja-JP': 'ライト',
        'ko-KR': '라이트'
      }),
      themeMode: 'light' as const,
      backgroundColor: '#fafafa',
      textColor: '#171717',
      lightBackgroundColor: '#ffffff',
      lightTextColor: '#171717',
      centerText: lt(language, {
        'zh-CN': '设备锁定',
        'en-US': 'Device Locked',
        'ja-JP': 'デバイスロック',
        'ko-KR': '기기 잠금'
      }),
      subText: lt(language, {
        'zh-CN': '点击屏幕继续',
        'en-US': 'Tap screen to continue',
        'ja-JP': '画面をクリックして続行',
        'ko-KR': '화면을 눌러 계속'
      })
    },
    {
      name: lt(language, {
        'zh-CN': '安全绿',
        'en-US': 'Security Green',
        'ja-JP': 'セキュリティグリーン',
        'ko-KR': '보안 그린'
      }),
      themeMode: 'custom' as const,
      backgroundColor: '#064e3b',
      textColor: '#ecfdf5',
      lightBackgroundColor: '#d1fae5',
      lightTextColor: '#064e3b',
      centerText: lt(language, {
        'zh-CN': '系统保护中',
        'en-US': 'System Protected',
        'ja-JP': 'システム保護中',
        'ko-KR': '시스템 보호 중'
      }),
      subText: lt(language, {
        'zh-CN': '正在进行安全检查',
        'en-US': 'Running security checks',
        'ja-JP': 'セキュリティチェック実行中',
        'ko-KR': '보안 점검 진행 중'
      })
    }
  ]
}

function getTimePositionOptions(language: AppLanguage) {
  return [
    {
      value: 'hidden',
      label: lt(language, {
        'zh-CN': '隐藏',
        'en-US': 'Hidden',
        'ja-JP': '非表示',
        'ko-KR': '숨김'
      })
    },
    {
      value: 'top-left',
      label: lt(language, {
        'zh-CN': '左上',
        'en-US': 'Top Left',
        'ja-JP': '左上',
        'ko-KR': '좌상단'
      })
    },
    {
      value: 'top-right',
      label: lt(language, {
        'zh-CN': '右上',
        'en-US': 'Top Right',
        'ja-JP': '右上',
        'ko-KR': '우상단'
      })
    },
    {
      value: 'bottom-left',
      label: lt(language, {
        'zh-CN': '左下',
        'en-US': 'Bottom Left',
        'ja-JP': '左下',
        'ko-KR': '좌하단'
      })
    },
    {
      value: 'bottom-right',
      label: lt(language, {
        'zh-CN': '右下',
        'en-US': 'Bottom Right',
        'ja-JP': '右下',
        'ko-KR': '우하단'
      })
    },
    {
      value: 'center',
      label: lt(language, {
        'zh-CN': '居中',
        'en-US': 'Center',
        'ja-JP': '中央',
        'ko-KR': '가운데'
      })
    }
  ]
}

function getTimeFormatOptions(language: AppLanguage) {
  return [
    {
      value: 'HH:mm:ss',
      label: lt(language, {
        'zh-CN': '24时:分:秒',
        'en-US': '24h:mm:ss',
        'ja-JP': '24時:分:秒',
        'ko-KR': '24시:분:초'
      })
    },
    {
      value: 'HH:mm',
      label: lt(language, {
        'zh-CN': '24时:分',
        'en-US': '24h:mm',
        'ja-JP': '24時:分',
        'ko-KR': '24시:분'
      })
    },
    {
      value: 'hh:mm:ss A',
      label: lt(language, {
        'zh-CN': '12时:分:秒',
        'en-US': '12h:mm:ss',
        'ja-JP': '12時:分:秒',
        'ko-KR': '12시:분:초'
      })
    },
    {
      value: 'hh:mm A',
      label: lt(language, {
        'zh-CN': '12时:分',
        'en-US': '12h:mm',
        'ja-JP': '12時:分',
        'ko-KR': '12시:분'
      })
    },
    {
      value: 'YYYY-MM-DD HH:mm',
      label: lt(language, {
        'zh-CN': '年-月-日 时:分',
        'en-US': 'YYYY-MM-DD HH:mm',
        'ja-JP': '年-月-日 時:分',
        'ko-KR': '년-월-일 시:분'
      })
    }
  ]
}

function getTextAlignOptions(language: AppLanguage) {
  return [
    {
      value: 'left',
      label: lt(language, {
        'zh-CN': '左对齐',
        'en-US': 'Left',
        'ja-JP': '左寄せ',
        'ko-KR': '왼쪽 정렬'
      })
    },
    {
      value: 'center',
      label: lt(language, {
        'zh-CN': '居中',
        'en-US': 'Center',
        'ja-JP': '中央揃え',
        'ko-KR': '가운데 정렬'
      })
    },
    {
      value: 'right',
      label: lt(language, {
        'zh-CN': '右对齐',
        'en-US': 'Right',
        'ja-JP': '右寄せ',
        'ko-KR': '오른쪽 정렬'
      })
    }
  ]
}

function getFontWeightOptions(language: AppLanguage) {
  return [
    {
      value: 'light',
      label: lt(language, { 'zh-CN': '细体', 'en-US': 'Light', 'ja-JP': '細字', 'ko-KR': '가늘게' })
    },
    {
      value: 'normal',
      label: lt(language, { 'zh-CN': '常规', 'en-US': 'Regular', 'ja-JP': '標準', 'ko-KR': '보통' })
    },
    {
      value: 'medium',
      label: lt(language, { 'zh-CN': '中等', 'en-US': 'Medium', 'ja-JP': '中', 'ko-KR': '중간' })
    },
    {
      value: 'bold',
      label: lt(language, { 'zh-CN': '粗体', 'en-US': 'Bold', 'ja-JP': '太字', 'ko-KR': '굵게' })
    }
  ]
}

// ============================================================================
// 瑞士风格组件
// ============================================================================

// 卡片组件
function Card({
  children,
  className = '',
  title,
  subtitle
}: {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
}) {
  return (
    <div className={`bg-white border border-neutral-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-neutral-200">
          {title && <h3 className="text-sm font-medium text-neutral-900 tracking-wide">{title}</h3>}
          {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

// 按钮组件
function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950',
    secondary:
      'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
    ghost: 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

// 输入框组件
function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  className = ''
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 bg-white border border-neutral-300 text-sm text-neutral-900
        placeholder:text-neutral-400
        disabled:bg-neutral-100 disabled:text-neutral-500
        focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900
        transition-all duration-150 ${className}`}
    />
  )
}

// 文本域组件
function TextArea({
  value,
  onChange,
  placeholder,
  rows = 2
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-white border border-neutral-300 text-sm text-neutral-900
        placeholder:text-neutral-400 resize-none
        focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900
        transition-all duration-150"
    />
  )
}

// 选择框组件
function Select({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-white border border-neutral-300 text-sm text-neutral-900
        focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900
        transition-all duration-150 cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// 开关组件
function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center transition-colors duration-200
        ${checked ? 'bg-neutral-900' : 'bg-neutral-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform bg-white transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

// 滑块组件
function Slider({
  value,
  min,
  max,
  onChange,
  label
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-neutral-600">
        <span>{label}</span>
        <span className="font-mono">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-neutral-200 rounded-none appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-neutral-900
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}

// ============================================================================
// 时间段编辑器
// ============================================================================
function TimeSlotEditor({
  slot,
  onChange,
  onDelete
}: {
  slot: TimeSlot
  onChange: (slot: TimeSlot) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200">
      <input
        type="time"
        value={slot.start}
        onChange={(e) => onChange({ ...slot, start: e.target.value })}
        className="px-2 py-1.5 bg-white border border-neutral-300 text-sm focus:outline-none focus:border-neutral-900"
      />
      <span className="text-neutral-400 text-sm">—</span>
      <input
        type="time"
        value={slot.end}
        onChange={(e) => onChange({ ...slot, end: e.target.value })}
        className="px-2 py-1.5 bg-white border border-neutral-300 text-sm focus:outline-none focus:border-neutral-900"
      />
      <button
        onClick={onDelete}
        className="ml-auto p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================================
// 密码设置组件
// ============================================================================
function PasswordSection({
  password,
  onChange,
  language
}: {
  password: PasswordConfig
  onChange: (p: PasswordConfig) => void
  language: AppLanguage
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [showTotpSecret, setShowTotpSecret] = useState(false)
  const [isDeviceConfirmed, setIsDeviceConfirmed] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [isGeneratingTotp, setIsGeneratingTotp] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const hasSecret = Boolean((password.totpSecret || '').trim())
    setIsDeviceConfirmed(hasSecret)
    setQrCodeDataUrl('')
  }, [password.totpDeviceName, password.totpSecret])

  const normalizedDeviceName = (password.totpDeviceName || '').trim().toUpperCase()
  const isDeviceLocked = isDeviceConfirmed || Boolean((password.totpSecret || '').trim())

  const setPasswordType = async (type: PasswordConfig['type']) => {
    setError('')
    onChange({ ...password, type })
  }

  const generateBindingQr = async () => {
    if (!normalizedDeviceName) {
      setError(
        lt(language, {
          'zh-CN': '请先填写并确认设备标识名称',
          'en-US': 'Please enter and confirm the device identifier first',
          'ja-JP': '先にデバイス識別名を入力して確認してください',
          'ko-KR': '먼저 기기 식별명을 입력하고 확인하세요'
        })
      )
      return
    }
    if (!isDeviceConfirmed) {
      setError(
        lt(language, {
          'zh-CN': '请先确认设备标识名称，再生成扫码绑定二维码',
          'en-US': 'Please confirm device identifier before generating QR code',
          'ja-JP': 'デバイス識別名を確認してからQRコードを生成してください',
          'ko-KR': '기기 식별명을 확인한 후 QR 코드를 생성하세요'
        })
      )
      return
    }

    try {
      setError('')
      setIsGeneratingTotp(true)
      const existingSecret = (password.totpSecret || '').trim()

      if (existingSecret) {
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(`LockIt - ${normalizedDeviceName}`)}?secret=${encodeURIComponent(existingSecret)}&issuer=${encodeURIComponent('LockIt')}`
        const qrcode = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 })
        setQrCodeDataUrl(qrcode)
        onChange({
          ...password,
          type: 'both',
          totpSecret: existingSecret,
          totpDeviceName: normalizedDeviceName
        })
      } else {
        const { secret, otpauthUrl, deviceName } =
          await window.api.generateTOTPSecret(normalizedDeviceName)
        const qrcode = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 })
        setQrCodeDataUrl(qrcode)
        onChange({
          ...password,
          type: 'both',
          totpSecret: secret,
          totpDeviceName: deviceName
        })
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 1500)
    } catch (e) {
      console.error('Generate TOTP QR failed:', e)
      setError(
        lt(language, {
          'zh-CN': '生成扫码绑定二维码失败，请重试',
          'en-US': 'Failed to generate QR code, please try again',
          'ja-JP': 'QRコードの生成に失敗しました。再試行してください',
          'ko-KR': 'QR 코드 생성에 실패했습니다. 다시 시도하세요'
        })
      )
    } finally {
      setIsGeneratingTotp(false)
    }
  }

  const copyTotpSecret = async () => {
    if (!password.totpSecret) return
    try {
      await navigator.clipboard.writeText(password.totpSecret)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 1200)
    } catch {
      setError(
        lt(language, {
          'zh-CN': '复制失败，请手动复制',
          'en-US': 'Copy failed, please copy manually',
          'ja-JP': 'コピーに失敗しました。手動でコピーしてください',
          'ko-KR': '복사에 실패했습니다. 수동으로 복사하세요'
        })
      )
    }
  }

  const handleSave = () => {
    if (!/^\d{6}$/.test(newPassword)) {
      setError(
        lt(language, {
          'zh-CN': '密码必须为6位数字',
          'en-US': 'Password must be 6 digits',
          'ja-JP': 'パスワードは6桁の数字である必要があります',
          'ko-KR': '비밀번호는 6자리 숫자여야 합니다'
        })
      )
      return
    }
    if (newPassword !== confirmPassword) {
      setError(
        lt(language, {
          'zh-CN': '两次输入不一致',
          'en-US': 'The two entries do not match',
          'ja-JP': '2回の入力が一致しません',
          'ko-KR': '두 번 입력한 값이 일치하지 않습니다'
        })
      )
      return
    }

    onChange({ ...password, fixedPassword: newPassword })
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setShowChangeForm(false)
      setNewPassword('')
      setConfirmPassword('')
    }, 1500)
  }

  return (
    <div className="space-y-4">
      <Card
        title={lt(language, {
          'zh-CN': '解锁方式',
          'en-US': 'Unlock Methods',
          'ja-JP': '解除方式',
          'ko-KR': '잠금 해제 방식'
        })}
        subtitle={lt(language, {
          'zh-CN': '固定密码为必选项，TOTP为可选附加（两者任一可解锁）',
          'en-US': 'Fixed PIN is required; TOTP is optional (either can unlock)',
          'ja-JP': '固定PINは必須、TOTPは任意（いずれかで解除可能）',
          'ko-KR': '고정 PIN은 필수, TOTP는 선택(둘 중 하나로 해제 가능)'
        })}
      >
        <div className="flex gap-2">
          <Button
            variant={password.type === 'fixed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => void setPasswordType('fixed')}
            disabled={isGeneratingTotp}
          >
            {lt(language, {
              'zh-CN': '仅固定密码',
              'en-US': 'Fixed PIN Only',
              'ja-JP': '固定PINのみ',
              'ko-KR': '고정 PIN만'
            })}
          </Button>
          <Button
            variant={password.type === 'both' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => void setPasswordType('both')}
            disabled={isGeneratingTotp}
          >
            {lt(language, {
              'zh-CN': '固定密码 / TOTP 任一',
              'en-US': 'Fixed PIN / TOTP (Either)',
              'ja-JP': '固定PIN / TOTP（いずれか）',
              'ko-KR': '고정 PIN / TOTP (둘 중 하나)'
            })}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {lt(language, {
                  'zh-CN': '固定密码',
                  'en-US': 'Fixed PIN',
                  'ja-JP': '固定PIN',
                  'ko-KR': '고정 PIN'
                })}
              </p>
              <p className="text-xs text-neutral-500">
                {lt(language, {
                  'zh-CN': '当前密码',
                  'en-US': 'Current PIN',
                  'ja-JP': '現在のPIN',
                  'ko-KR': '현재 PIN'
                })}
                :{' '}
                {password.fixedPassword
                  ? '••••••'
                  : lt(language, {
                      'zh-CN': '未配置',
                      'en-US': 'Not Set',
                      'ja-JP': '未設定',
                      'ko-KR': '미설정'
                    })}
              </p>
            </div>
          </div>
          <Button
            variant={showChangeForm ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowChangeForm(!showChangeForm)}
          >
            {showChangeForm
              ? lt(language, {
                  'zh-CN': '取消',
                  'en-US': 'Cancel',
                  'ja-JP': 'キャンセル',
                  'ko-KR': '취소'
                })
              : lt(language, {
                  'zh-CN': '修改',
                  'en-US': 'Edit',
                  'ja-JP': '変更',
                  'ko-KR': '수정'
                })}
          </Button>
        </div>
      </Card>

      <Card
        title={lt(language, {
          'zh-CN': 'TOTP 动态密码',
          'en-US': 'TOTP One-Time Password',
          'ja-JP': 'TOTP ワンタイムパスワード',
          'ko-KR': 'TOTP 일회용 비밀번호'
        })}
        subtitle={lt(language, {
          'zh-CN': '请先确认设备标识，再点击扫码绑定生成二维码',
          'en-US': 'Confirm device identifier first, then generate binding QR code',
          'ja-JP': '先にデバイス識別名を確認してからQRコードを生成してください',
          'ko-KR': '기기 식별명을 확인한 뒤 바인딩 QR 코드를 생성하세요'
        })}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-600 mb-1.5">
              {lt(language, {
                'zh-CN': '设备标识名称',
                'en-US': 'Device Identifier',
                'ja-JP': 'デバイス識別名',
                'ko-KR': '기기 식별명'
              })}
            </label>
            <Input
              value={password.totpDeviceName || ''}
              onChange={(v) => {
                if (isDeviceLocked) return
                onChange({ ...password, totpDeviceName: v })
                setIsDeviceConfirmed(false)
                setError('')
              }}
              placeholder={lt(language, {
                'zh-CN': '例如 A1B2',
                'en-US': 'e.g. A1B2',
                'ja-JP': '例: A1B2',
                'ko-KR': '예: A1B2'
              })}
              disabled={isDeviceLocked}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (isDeviceLocked) return
                const value = normalizedDeviceName
                if (!value) {
                  setError(
                    lt(language, {
                      'zh-CN': '设备标识名称不能为空',
                      'en-US': 'Device identifier cannot be empty',
                      'ja-JP': 'デバイス識別名は空にできません',
                      'ko-KR': '기기 식별명은 비워둘 수 없습니다'
                    })
                  )
                  return
                }
                const confirmed = window.confirm(
                  lt(language, {
                    'zh-CN': `确认将设备标识锁定为“${value}”吗？锁定后不可更改。`,
                    'en-US': `Lock device identifier as "${value}"? It cannot be changed later.`,
                    'ja-JP': `デバイス識別名を「${value}」に固定しますか？固定後は変更できません。`,
                    'ko-KR': `기기 식별명을 "${value}"(으)로 고정하시겠습니까? 고정 후 변경할 수 없습니다.`
                  })
                )
                if (!confirmed) return
                onChange({ ...password, totpDeviceName: value })
                setIsDeviceConfirmed(true)
                setError('')
              }}
              disabled={isDeviceLocked}
            >
              {isDeviceLocked
                ? lt(language, {
                    'zh-CN': '设备标识已锁定',
                    'en-US': 'Identifier Locked',
                    'ja-JP': '識別名は固定済み',
                    'ko-KR': '식별명 고정됨'
                  })
                : lt(language, {
                    'zh-CN': '确认设备标识',
                    'en-US': 'Confirm Identifier',
                    'ja-JP': '識別名を確認',
                    'ko-KR': '식별명 확인'
                  })}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void generateBindingQr()}
              disabled={isGeneratingTotp || !isDeviceConfirmed}
            >
              {lt(language, {
                'zh-CN': '扫码绑定',
                'en-US': 'Bind via QR',
                'ja-JP': 'QRで登録',
                'ko-KR': 'QR로 연동'
              })}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTotpSecret((v) => !v)}
              disabled={!password.totpSecret}
            >
              {showTotpSecret
                ? lt(language, {
                    'zh-CN': '隐藏密钥',
                    'en-US': 'Hide Secret',
                    'ja-JP': 'シークレットを隠す',
                    'ko-KR': '시크릿 숨기기'
                  })
                : lt(language, {
                    'zh-CN': '显示密钥',
                    'en-US': 'Show Secret',
                    'ja-JP': 'シークレットを表示',
                    'ko-KR': '시크릿 표시'
                  })}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copyTotpSecret()}
              disabled={!password.totpSecret}
            >
              {lt(language, {
                'zh-CN': '复制密钥',
                'en-US': 'Copy Secret',
                'ja-JP': 'シークレットをコピー',
                'ko-KR': '시크릿 복사'
              })}
            </Button>
          </div>

          {isDeviceConfirmed && normalizedDeviceName && (
            <p className="text-xs text-neutral-500">
              {lt(language, {
                'zh-CN': '当前设备名称',
                'en-US': 'Current Device Name',
                'ja-JP': '現在のデバイス名',
                'ko-KR': '현재 기기 이름'
              })}
              ：LockIt - {normalizedDeviceName}
            </p>
          )}

          {password.totpSecret ? (
            <div className="p-3 bg-neutral-50 border border-neutral-200">
              <p className="text-xs text-neutral-500 mb-1">
                {lt(language, {
                  'zh-CN': '当前 TOTP 密钥',
                  'en-US': 'Current TOTP Secret',
                  'ja-JP': '現在のTOTPシークレット',
                  'ko-KR': '현재 TOTP 시크릿'
                })}
              </p>
              <p className="text-sm font-mono break-all text-neutral-900">
                {showTotpSecret ? password.totpSecret : '••••••••••••••••••••••••••••••••'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              {lt(language, {
                'zh-CN': '尚未生成 TOTP 密钥',
                'en-US': 'TOTP secret not generated yet',
                'ja-JP': 'TOTPシークレットはまだ未生成です',
                'ko-KR': 'TOTP 시크릿이 아직 생성되지 않았습니다'
              })}
            </p>
          )}

          {qrCodeDataUrl && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 inline-block">
              <p className="text-xs text-neutral-500 mb-2">
                {lt(language, {
                  'zh-CN': '请使用认证器应用扫码',
                  'en-US': 'Scan with your authenticator app',
                  'ja-JP': '認証アプリでスキャンしてください',
                  'ko-KR': '인증 앱으로 스캔하세요'
                })}
              </p>
              <img
                src={qrCodeDataUrl}
                alt={lt(language, {
                  'zh-CN': 'TOTP 绑定二维码',
                  'en-US': 'TOTP binding QR code',
                  'ja-JP': 'TOTP登録QRコード',
                  'ko-KR': 'TOTP 연동 QR 코드'
                })}
                className="w-56 h-56"
              />
            </div>
          )}

          <p className="text-xs text-neutral-500">
            {lt(language, {
              'zh-CN': '当前模式',
              'en-US': 'Current Mode',
              'ja-JP': '現在のモード',
              'ko-KR': '현재 모드'
            })}
            ：
            {password.type === 'both'
              ? lt(language, {
                  'zh-CN': '固定密码 / TOTP 任一可解锁',
                  'en-US': 'Fixed PIN / TOTP (Either can unlock)',
                  'ja-JP': '固定PIN / TOTP（どちらでも解除可能）',
                  'ko-KR': '고정 PIN / TOTP (둘 다 해제 가능)'
                })
              : lt(language, {
                  'zh-CN': '仅固定密码',
                  'en-US': 'Fixed PIN Only',
                  'ja-JP': '固定PINのみ',
                  'ko-KR': '고정 PIN만'
                })}
          </p>
        </div>
      </Card>

      {showChangeForm && (
        <Card
          title={lt(language, {
            'zh-CN': '设置新密码',
            'en-US': 'Set New PIN',
            'ja-JP': '新しいPINを設定',
            'ko-KR': '새 PIN 설정'
          })}
          subtitle={lt(language, {
            'zh-CN': '请输入6位数字密码',
            'en-US': 'Please enter a 6-digit PIN',
            'ja-JP': '6桁の数字PINを入力してください',
            'ko-KR': '6자리 숫자 PIN을 입력하세요'
          })}
        >
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">
                {lt(language, {
                  'zh-CN': '新密码',
                  'en-US': 'New PIN',
                  'ja-JP': '新しいPIN',
                  'ko-KR': '새 PIN'
                })}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder={lt(language, {
                  'zh-CN': '输入6位数字',
                  'en-US': 'Enter 6 digits',
                  'ja-JP': '6桁を入力',
                  'ko-KR': '6자리 입력'
                })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">
                {lt(language, {
                  'zh-CN': '确认密码',
                  'en-US': 'Confirm PIN',
                  'ja-JP': 'PINを確認',
                  'ko-KR': 'PIN 확인'
                })}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={lt(language, {
                  'zh-CN': '再次输入',
                  'en-US': 'Enter again',
                  'ja-JP': 'もう一度入力',
                  'ko-KR': '다시 입력'
                })}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">
                {lt(language, {
                  'zh-CN': '修改成功',
                  'en-US': 'Updated',
                  'ja-JP': '変更しました',
                  'ko-KR': '변경되었습니다'
                })}
              </p>
            )}
            <Button onClick={handleSave} disabled={!newPassword || !confirmPassword}>
              {lt(language, {
                'zh-CN': '保存密码',
                'en-US': 'Save PIN',
                'ja-JP': 'PINを保存',
                'ko-KR': 'PIN 저장'
              })}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// 照片查看组件
// ============================================================================
function PhotosSection({ language }: { language: AppLanguage }) {
  const [records, setRecords] = useState<UnlockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<UnlockRecord | null>(null)
  const [showClearAuthModal, setShowClearAuthModal] = useState(false)
  const [clearPassword, setClearPassword] = useState('')
  const [clearAuthError, setClearAuthError] = useState('')
  const [isVerifyingClearPassword, setIsVerifyingClearPassword] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await window.api.getUnlockRecords()
      setRecords(data || [])
    } catch (e) {
      console.error('Failed to load records:', e)
      setError(
        lt(language, {
          'zh-CN': '加载失败',
          'en-US': 'Failed to load',
          'ja-JP': '読み込みに失敗しました',
          'ko-KR': '불러오기에 실패했습니다'
        })
      )
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleRefreshRecords = async () => {
    if (loading || isRefreshing) return
    setIsRefreshing(true)
    setError('')
    try {
      const data = await window.api.getUnlockRecords()
      setRecords(data || [])
    } catch (e) {
      console.error('Failed to refresh records:', e)
      setError(
        lt(language, {
          'zh-CN': '刷新失败',
          'en-US': 'Refresh failed',
          'ja-JP': '更新に失敗しました',
          'ko-KR': '새로고침 실패'
        })
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.deleteUnlockRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      if (selectedRecord?.id === id) setSelectedRecord(null)
    } catch (e) {
      alert(
        lt(language, {
          'zh-CN': '删除失败',
          'en-US': 'Delete failed',
          'ja-JP': '削除に失敗しました',
          'ko-KR': '삭제 실패'
        })
      )
    }
  }

  const getUnlockMethodLabel = (method?: 'fixed' | 'totp') => {
    if (method === 'fixed') {
      return lt(language, {
        'zh-CN': '固定密码',
        'en-US': 'Fixed PIN',
        'ja-JP': '固定PIN',
        'ko-KR': '고정 PIN'
      })
    }
    if (method === 'totp') return 'TOTP'
    return lt(language, {
      'zh-CN': '未知方式',
      'en-US': 'Unknown Method',
      'ja-JP': '不明な方式',
      'ko-KR': '알 수 없는 방식'
    })
  }

  const handleClearAll = () => {
    setShowClearAuthModal(true)
    setClearPassword('')
    setClearAuthError('')
  }

  const handleConfirmClearAll = async () => {
    const input = clearPassword.trim()
    if (!input) {
      setClearAuthError(
        lt(language, {
          'zh-CN': '请输入密码进行验证',
          'en-US': 'Please enter password for verification',
          'ja-JP': '認証のためパスワードを入力してください',
          'ko-KR': '검증을 위해 비밀번호를 입력하세요'
        })
      )
      return
    }

    try {
      setIsVerifyingClearPassword(true)
      setClearAuthError('')
      if (
        !confirm(
          lt(language, {
            'zh-CN': '确定清空所有记录？此操作不可恢复。',
            'en-US': 'Clear all records? This action cannot be undone.',
            'ja-JP': 'すべての記録を削除しますか？この操作は元に戻せません。',
            'ko-KR': '모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
          })
        )
      ) {
        return
      }

      const cleared = await window.api.clearUnlockRecords(input)
      if (!cleared) {
        setClearAuthError(
          lt(language, {
            'zh-CN': '密码验证失败或清空失败',
            'en-US': 'Password verification failed or clear failed',
            'ja-JP': 'パスワード認証または削除に失敗しました',
            'ko-KR': '비밀번호 검증 또는 삭제에 실패했습니다'
          })
        )
        return
      }
      setRecords([])
      setSelectedRecord(null)
      setShowClearAuthModal(false)
    } catch (e) {
      alert(
        lt(language, {
          'zh-CN': '清空失败',
          'en-US': 'Clear failed',
          'ja-JP': '削除に失敗しました',
          'ko-KR': '전체 삭제 실패'
        })
      )
    } finally {
      setIsVerifyingClearPassword(false)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(getLocaleForDate(language), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
        <AlertCircle className="w-12 h-12 mb-3 stroke-1" />
        <p className="text-sm">{error}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleRefreshRecords()}
          disabled={isRefreshing}
          className="mt-4"
        >
          {isRefreshing
            ? lt(language, {
                'zh-CN': '刷新中...',
                'en-US': 'Refreshing...',
                'ja-JP': '更新中...',
                'ko-KR': '새로고침 중...'
              })
            : lt(language, {
                'zh-CN': '重试',
                'en-US': 'Retry',
                'ja-JP': '再試行',
                'ko-KR': '다시 시도'
              })}
        </Button>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
        <Image className="w-16 h-16 mb-4 stroke-1" />
        <p className="text-sm">
          {lt(language, {
            'zh-CN': '暂无解锁记录',
            'en-US': 'No unlock records',
            'ja-JP': '解除記録はありません',
            'ko-KR': '잠금 해제 기록이 없습니다'
          })}
        </p>
        <p className="text-xs mt-1 text-neutral-400">
          {lt(language, {
            'zh-CN': '解锁时会自动拍摄照片',
            'en-US': 'A photo is captured on each unlock attempt',
            'ja-JP': '解除時に自動で写真を撮影します',
            'ko-KR': '잠금 해제 시 사진이 자동 촬영됩니다'
          })}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleRefreshRecords()}
          disabled={isRefreshing}
          className="mt-4"
        >
          {isRefreshing
            ? lt(language, {
                'zh-CN': '刷新中...',
                'en-US': 'Refreshing...',
                'ja-JP': '更新中...',
                'ko-KR': '새로고침 중...'
              })
            : lt(language, {
                'zh-CN': '刷新',
                'en-US': 'Refresh',
                'ja-JP': '更新',
                'ko-KR': '새로고침'
              })}
        </Button>
      </div>
    )
  }

  const successCount = records.filter((r) => r.success).length
  const failCount = records.length - successCount

  return (
    <div className="space-y-6">
      {/* 统计 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <p className="text-3xl font-light text-neutral-900">{records.length}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {lt(language, {
              'zh-CN': '总记录',
              'en-US': 'Total',
              'ja-JP': '合計',
              'ko-KR': '총 기록'
            })}
          </p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-light text-green-600">{successCount}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {lt(language, {
              'zh-CN': '成功解锁',
              'en-US': 'Success',
              'ja-JP': '成功解除',
              'ko-KR': '성공 해제'
            })}
          </p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-light text-red-600">{failCount}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {lt(language, {
              'zh-CN': '密码错误',
              'en-US': 'Wrong PIN',
              'ja-JP': 'PIN誤り',
              'ko-KR': '비밀번호 오류'
            })}
          </p>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-neutral-500">
          {lt(language, {
            'zh-CN': `共 ${records.length} 条记录（保留最近100条）`,
            'en-US': `${records.length} records (latest 100 kept)`,
            'ja-JP': `${records.length} 件（最新100件を保持）`,
            'ko-KR': `총 ${records.length}건(최근 100건 유지)`
          })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleRefreshRecords()}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? lt(language, {
                  'zh-CN': '刷新中...',
                  'en-US': 'Refreshing...',
                  'ja-JP': '更新中...',
                  'ko-KR': '새로고침 중...'
                })
              : lt(language, {
                  'zh-CN': '刷新',
                  'en-US': 'Refresh',
                  'ja-JP': '更新',
                  'ko-KR': '새로고침'
                })}
          </Button>
          <Button variant="danger" size="sm" onClick={handleClearAll}>
            {lt(language, {
              'zh-CN': '清空所有',
              'en-US': 'Clear All',
              'ja-JP': 'すべて削除',
              'ko-KR': '전체 삭제'
            })}
          </Button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="border border-neutral-200">
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
          {records.map((record) => (
            <div
              key={record.id}
              onClick={() => setSelectedRecord(record)}
              className={`flex items-center gap-4 p-4 border-b border-neutral-100 last:border-b-0 cursor-pointer
                hover:bg-neutral-50 transition-colors ${selectedRecord?.id === record.id ? 'bg-neutral-100' : ''}`}
            >
              <div className="w-14 h-14 bg-neutral-100 flex items-center justify-center shrink-0 overflow-hidden">
                {record.photoData ? (
                  <img src={record.photoData} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      record.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {record.success
                      ? lt(language, {
                          'zh-CN': '成功',
                          'en-US': 'Success',
                          'ja-JP': '成功',
                          'ko-KR': '성공'
                        })
                      : lt(language, {
                          'zh-CN': '失败',
                          'en-US': 'Failed',
                          'ja-JP': '失敗',
                          'ko-KR': '실패'
                        })}
                  </span>
                  {record.success && (
                    <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600">
                      {getUnlockMethodLabel(record.unlockMethod)}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">
                    {lt(language, {
                      'zh-CN': `第 ${record.attemptCount} 次`,
                      'en-US': `Attempt ${record.attemptCount}`,
                      'ja-JP': `${record.attemptCount} 回目`,
                      'ko-KR': `${record.attemptCount}회`
                    })}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 truncate">{formatTime(record.timestamp)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(record.id)
                }}
                className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedRecord && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm px-3 py-1 ${
                    selectedRecord.success
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedRecord.success
                    ? lt(language, {
                        'zh-CN': '解锁成功',
                        'en-US': 'Unlock Success',
                        'ja-JP': '解除成功',
                        'ko-KR': '해제 성공'
                      })
                    : lt(language, {
                        'zh-CN': '密码错误',
                        'en-US': 'Wrong PIN',
                        'ja-JP': 'PIN誤り',
                        'ko-KR': '비밀번호 오류'
                      })}
                </span>
                <span className="text-sm text-neutral-500">
                  {lt(language, {
                    'zh-CN': `第 ${selectedRecord.attemptCount} 次尝试`,
                    'en-US': `Attempt ${selectedRecord.attemptCount}`,
                    'ja-JP': `${selectedRecord.attemptCount} 回目の試行`,
                    'ko-KR': `${selectedRecord.attemptCount}번째 시도`
                  })}
                </span>
                {selectedRecord.success && (
                  <span className="text-sm text-neutral-500">
                    {lt(language, {
                      'zh-CN': '解锁方式',
                      'en-US': 'Method',
                      'ja-JP': '解除方式',
                      'ko-KR': '해제 방식'
                    })}
                    ：{getUnlockMethodLabel(selectedRecord.unlockMethod)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-neutral-900 flex items-center justify-center p-6">
              {selectedRecord.photoData ? (
                <img
                  src={selectedRecord.photoData}
                  alt={lt(language, {
                    'zh-CN': '解锁照片',
                    'en-US': 'Unlock photo',
                    'ja-JP': '解除写真',
                    'ko-KR': '잠금 해제 사진'
                  })}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              ) : (
                <div className="text-center text-neutral-500 py-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>
                    {lt(language, {
                      'zh-CN': '无照片',
                      'en-US': 'No photo',
                      'ja-JP': '写真なし',
                      'ko-KR': '사진 없음'
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-neutral-500 mb-1">
                    {lt(language, {
                      'zh-CN': '时间',
                      'en-US': 'Time',
                      'ja-JP': '時刻',
                      'ko-KR': '시간'
                    })}
                  </p>
                  <p className="font-medium">{formatTime(selectedRecord.timestamp)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-1">
                    {lt(language, {
                      'zh-CN': '状态',
                      'en-US': 'Status',
                      'ja-JP': '状態',
                      'ko-KR': '상태'
                    })}
                  </p>
                  <p className="font-medium">
                    {selectedRecord.success
                      ? lt(language, {
                          'zh-CN': '成功',
                          'en-US': 'Success',
                          'ja-JP': '成功',
                          'ko-KR': '성공'
                        })
                      : lt(language, {
                          'zh-CN': '失败',
                          'en-US': 'Failed',
                          'ja-JP': '失敗',
                          'ko-KR': '실패'
                        })}
                  </p>
                </div>
              </div>
              {selectedRecord.photoData && (
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = selectedRecord.photoData!
                    link.download = `unlock-${selectedRecord.id}.jpg`
                    link.click()
                  }}
                  className="mt-6 w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {lt(language, {
                    'zh-CN': '下载照片',
                    'en-US': 'Download Photo',
                    'ja-JP': '写真をダウンロード',
                    'ko-KR': '사진 다운로드'
                  })}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showClearAuthModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowClearAuthModal(false)}
        >
          <div
            className="w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-medium text-neutral-900">
                {lt(language, {
                  'zh-CN': '清空记录前验证密码',
                  'en-US': 'Verify Password Before Clearing',
                  'ja-JP': '削除前にパスワード確認',
                  'ko-KR': '삭제 전 비밀번호 확인'
                })}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {lt(language, {
                  'zh-CN': '请输入当前解锁密码（固定密码或 TOTP，遵循全局配置）',
                  'en-US':
                    'Enter current unlock password (Fixed PIN or TOTP, follows global config)',
                  'ja-JP': '現在の解除パスワード（固定PINまたはTOTP）を入力してください',
                  'ko-KR': '현재 잠금 해제 비밀번호(PIN 또는 TOTP)를 입력하세요'
                })}
              </p>
            </div>
            <div className="p-6 space-y-3">
              <Input
                type="password"
                value={clearPassword}
                onChange={(value) => {
                  setClearPassword(value)
                  setClearAuthError('')
                }}
                placeholder={lt(language, {
                  'zh-CN': '输入6位密码',
                  'en-US': 'Enter 6-digit PIN',
                  'ja-JP': '6桁PINを入力',
                  'ko-KR': '6자리 PIN 입력'
                })}
              />
              {clearAuthError && <p className="text-xs text-red-600">{clearAuthError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowClearAuthModal(false)}
                  disabled={isVerifyingClearPassword}
                >
                  {lt(language, {
                    'zh-CN': '取消',
                    'en-US': 'Cancel',
                    'ja-JP': 'キャンセル',
                    'ko-KR': '취소'
                  })}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleConfirmClearAll()}
                  disabled={isVerifyingClearPassword}
                >
                  {isVerifyingClearPassword
                    ? lt(language, {
                        'zh-CN': '验证中...',
                        'en-US': 'Verifying...',
                        'ja-JP': '確認中...',
                        'ko-KR': '검증 중...'
                      })
                    : lt(language, {
                        'zh-CN': '验证并清空',
                        'en-US': 'Verify and Clear',
                        'ja-JP': '確認して削除',
                        'ko-KR': '검증 후 삭제'
                      })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 相机选择组件
// ============================================================================
function CameraSection({
  selectedCamera,
  onChange,
  language
}: {
  selectedCamera: string | undefined
  onChange: (deviceId: string | undefined) => void
  language: AppLanguage
}) {
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const loadCameras = useCallback(async () => {
    setLoading(true)
    setPermissionDenied(false)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      s.getTracks().forEach((t) => t.stop())

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label:
            d.label ||
            `${lt(language, { 'zh-CN': '摄像头', 'en-US': 'Camera', 'ja-JP': 'カメラ', 'ko-KR': '카메라' })} ${d.deviceId.slice(0, 8)}`
        }))

      setCameras(videoDevices)
      if (!selectedCamera && videoDevices.length > 0) {
        onChange(videoDevices[0].deviceId)
      }
    } catch (e) {
      if ((e as Error).name === 'NotAllowedError') setPermissionDenied(true)
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    loadCameras()
    navigator.mediaDevices.addEventListener('devicechange', loadCameras)
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadCameras)
  }, [])

  useEffect(() => {
    if (!selectedCamera) return
    let s: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: { exact: selectedCamera } } })
      .then((st) => {
        s = st
        setStream(st)
        if (videoRef.current) videoRef.current.srcObject = st
      })
      .catch(console.error)
    return () => {
      s?.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
  }, [selectedCamera])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <Card className="text-center py-8">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-600 stroke-1" />
        <p className="text-sm text-neutral-900">
          {lt(language, {
            'zh-CN': '摄像头权限被拒绝',
            'en-US': 'Camera permission denied',
            'ja-JP': 'カメラ権限が拒否されました',
            'ko-KR': '카메라 권한이 거부되었습니다'
          })}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          {lt(language, {
            'zh-CN': '请在系统设置中允许访问',
            'en-US': 'Please allow access in system settings',
            'ja-JP': 'システム設定でアクセスを許可してください',
            'ko-KR': '시스템 설정에서 접근을 허용하세요'
          })}
        </p>
        <Button variant="secondary" size="sm" onClick={loadCameras} className="mt-4">
          {lt(language, {
            'zh-CN': '重试',
            'en-US': 'Retry',
            'ja-JP': '再試行',
            'ko-KR': '다시 시도'
          })}
        </Button>
      </Card>
    )
  }

  if (cameras.length === 0) {
    return (
      <Card className="text-center py-8">
        <Camera className="w-10 h-10 mx-auto mb-3 text-neutral-400 stroke-1" />
        <p className="text-sm text-neutral-900">
          {lt(language, {
            'zh-CN': '未找到摄像头',
            'en-US': 'No camera found',
            'ja-JP': 'カメラが見つかりません',
            'ko-KR': '카메라를 찾을 수 없습니다'
          })}
        </p>
        <Button variant="secondary" size="sm" onClick={loadCameras} className="mt-4">
          {lt(language, {
            'zh-CN': '刷新',
            'en-US': 'Refresh',
            'ja-JP': '更新',
            'ko-KR': '새로고침'
          })}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-neutral-900 flex items-center justify-center relative">
          {selectedCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-neutral-500">
              {lt(language, {
                'zh-CN': '请选择摄像头',
                'en-US': 'Please select a camera',
                'ja-JP': 'カメラを選択してください',
                'ko-KR': '카메라를 선택하세요'
              })}
            </span>
          )}
          {stream && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-green-600 text-white text-xs">
              {lt(language, {
                'zh-CN': '预览中',
                'en-US': 'Previewing',
                'ja-JP': 'プレビュー中',
                'ko-KR': '미리보기 중'
              })}
            </div>
          )}
        </div>
      </Card>

      <Card
        title={lt(language, {
          'zh-CN': '选择设备',
          'en-US': 'Select Device',
          'ja-JP': 'デバイスを選択',
          'ko-KR': '장치 선택'
        })}
        subtitle={lt(language, {
          'zh-CN': `找到 ${cameras.length} 个摄像头`,
          'en-US': `${cameras.length} camera(s) found`,
          'ja-JP': `${cameras.length} 台のカメラを検出`,
          'ko-KR': `${cameras.length}개의 카메라 감지됨`
        })}
      >
        <div className="space-y-2">
          {cameras.map((camera) => (
            <label
              key={camera.deviceId}
              className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors
                ${selectedCamera === camera.deviceId ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}
            >
              <input
                type="radio"
                name="camera"
                checked={selectedCamera === camera.deviceId}
                onChange={() => onChange(camera.deviceId)}
                className="w-4 h-4 accent-neutral-900"
              />
              <Camera className="w-4 h-4 text-neutral-500" />
              <span className="text-sm flex-1">{camera.label}</span>
              {selectedCamera === camera.deviceId && <Check className="w-4 h-4 text-neutral-900" />}
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================
export default function Settings() {
  type SettingsTab = 'schedule' | 'password' | 'style' | 'photos' | 'camera' | 'about'
  type PendingAction = { type: 'tab'; nextTab: SettingsTab } | { type: 'close' } | null
  type SavedSettingsState = {
    password: PasswordConfig
    schedule: WeeklySchedule
    style: StyleConfig
    language: AppLanguage
    selectedCamera: string | null
    startup: StartupConfig
    update: UpdateConfig
  }

  const [activeTab, setActiveTab] = useState<SettingsTab>('schedule')
  const [isLoading, setIsLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedState, setSavedState] = useState<SavedSettingsState | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const [password, setPassword] = useState<PasswordConfig>({
    type: 'fixed',
    fixedPassword: '123456'
  })
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    monday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
    tuesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
    wednesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
    thursday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
    friday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] }
  })
  const [style, setStyle] = useState<StyleConfig>({
    themeMode: 'dark',
    centerText: '此计算机因违规外联已被阻断',
    subText: '请等待安全部门与你联系',
    bottomLeftText: '保密委员会办公室\n意识形态工作领导小组办公室',
    bottomRightText: '',
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    lightBackgroundColor: '#fafafa',
    lightTextColor: '#171717',
    timePosition: 'hidden',
    timeFormat: 'HH:mm:ss',
    closeScreenPrompt: '请关闭投影设备后继续',
    fontSizes: { centerText: 48, subText: 24, bottomText: 14, timeText: 18 },
    textAligns: { centerText: 'center', subText: 'center', bottomText: 'center' },
    fontWeights: { centerText: 'medium', subText: 'normal', bottomText: 'normal' }
  })
  const [language, setLanguage] = useState<AppLanguage>('zh-CN')
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
  const [startup, setStartup] = useState<StartupConfig>({ autoLaunch: true })
  const [update, setUpdate] = useState<UpdateConfig>({
    checkOnStartup: true,
    autoDownload: true,
    autoInstallOnQuit: true
  })
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    status: 'idle',
    message: '等待检查更新'
  })
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [previewNow, setPreviewNow] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<keyof WeeklySchedule>('monday')
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>('dark')

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  const getCurrentSettingsState = (): SavedSettingsState => ({
    password,
    schedule,
    style,
    language,
    selectedCamera: selectedCamera ?? null,
    startup,
    update
  })

  const serializeSettingsState = (state: SavedSettingsState): string => JSON.stringify(state)

  const currentStateSignature = serializeSettingsState(getCurrentSettingsState())
  const savedStateSignature = savedState ? serializeSettingsState(savedState) : ''
  const hasUnsavedChanges = !!savedState && currentStateSignature !== savedStateSignature
  const hasUnsavedRef = useRef(false)

  useEffect(() => {
    window.api.getConfig().then((config) => {
      const nextPassword: PasswordConfig = config.password || {
        type: 'fixed',
        fixedPassword: '123456'
      }
      const nextSchedule: WeeklySchedule = config.schedule || {
        monday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
        tuesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
        wednesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
        thursday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
        friday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      }
      const nextStyle: StyleConfig = config.style
        ? {
            themeMode: config.style.themeMode || 'dark',
            centerText: config.style.centerText || '',
            subText: config.style.subText || '',
            bottomLeftText: config.style.bottomLeftText || '',
            bottomRightText: config.style.bottomRightText || '',
            backgroundColor: config.style.backgroundColor || '#171717',
            textColor: config.style.textColor || '#e5e5e5',
            lightBackgroundColor: config.style.lightBackgroundColor || '#fafafa',
            lightTextColor: config.style.lightTextColor || '#171717',
            timePosition: config.style.timePosition || 'hidden',
            timeFormat: config.style.timeFormat || 'HH:mm:ss',
            closeScreenPrompt: config.style.closeScreenPrompt || '请关闭投影设备后继续',
            fontSizes: config.style.fontSizes || {
              centerText: 48,
              subText: 24,
              bottomText: 14,
              timeText: 18
            },
            textAligns: config.style.textAligns || {
              centerText: 'center',
              subText: 'center',
              bottomText: 'center'
            },
            fontWeights: config.style.fontWeights || {
              centerText: 'medium',
              subText: 'normal',
              bottomText: 'normal'
            }
          }
        : {
            themeMode: 'dark',
            centerText: '此计算机因违规外联已被阻断',
            subText: '请等待安全部门与你联系',
            bottomLeftText: '保密委员会办公室\n意识形态工作领导小组办公室',
            bottomRightText: '',
            backgroundColor: '#0066cc',
            textColor: '#ffffff',
            lightBackgroundColor: '#fafafa',
            lightTextColor: '#171717',
            timePosition: 'hidden',
            timeFormat: 'HH:mm:ss',
            closeScreenPrompt: '请关闭投影设备后继续',
            fontSizes: { centerText: 48, subText: 24, bottomText: 14, timeText: 18 },
            textAligns: { centerText: 'center', subText: 'center', bottomText: 'center' },
            fontWeights: { centerText: 'medium', subText: 'normal', bottomText: 'normal' }
          }
      const nextSelectedCamera = config.selectedCamera ?? null
      const nextLanguage = normalizeLanguage(config.language)
      const nextStartup: StartupConfig = config.startup || { autoLaunch: true }
      const nextUpdate: UpdateConfig = config.update || {
        checkOnStartup: true,
        autoDownload: true,
        autoInstallOnQuit: true
      }

      setPassword(nextPassword)
      setSchedule(nextSchedule)
      setStyle(nextStyle)
      setLanguage(nextLanguage)
      setSelectedCamera(nextSelectedCamera || undefined)
      setStartup(nextStartup)
      setUpdate(nextUpdate)
      setSavedState(
        clone({
          password: nextPassword,
          schedule: nextSchedule,
          style: nextStyle,
          language: nextLanguage,
          selectedCamera: nextSelectedCamera,
          startup: nextStartup,
          update: nextUpdate
        })
      )
    })

    window.api
      .getRuntimeInfo()
      .then((info) => setRuntimeInfo(info))
      .catch(console.error)

    window.api
      .getUpdateStatus()
      .then((status) => setUpdateStatus(status))
      .catch(console.error)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges
    window.api.setSettingsDirty(hasUnsavedChanges).catch(console.error)
  }, [hasUnsavedChanges])

  useEffect(() => {
    window.api.onSettingsCloseAttempt(() => {
      if (!hasUnsavedRef.current) {
        window.api.respondSettingsClose('proceed').catch(console.error)
        return
      }
      setPendingAction({ type: 'close' })
    })
  }, [])

  const handleSave = async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      await window.api.saveConfig({
        password,
        schedule,
        style,
        language,
        selectedCamera,
        startup,
        update
      })
      setSavedState(clone(getCurrentSettingsState()))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      return true
    } catch (e) {
      console.error(t(language, 'settings.saveError'), e)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const restoreSavedState = () => {
    if (!savedState) return
    setPassword(clone(savedState.password))
    setSchedule(clone(savedState.schedule))
    setStyle(clone(savedState.style))
    setLanguage(savedState.language)
    setSelectedCamera(savedState.selectedCamera || undefined)
    setStartup(clone(savedState.startup))
    setUpdate(clone(savedState.update))
  }

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true)
    try {
      const result = await window.api.checkForUpdates()
      setUpdateStatus({
        status: (result.status as UpdateStatus['status']) || 'idle',
        message: result.message,
        version: result.version
      })
    } catch (error) {
      setUpdateStatus({ status: 'error', message: t(language, 'settings.updateCheckFailed') })
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleInstallDownloadedUpdate = async () => {
    try {
      const ok = await window.api.installDownloadedUpdate()
      if (!ok) {
        setUpdateStatus((prev) => ({
          ...prev,
          message: t(language, 'settings.updateNoInstall')
        }))
      }
    } catch (error) {
      setUpdateStatus({ status: 'error', message: t(language, 'settings.updateInstallFailed') })
    }
  }

  const formatPreviewTime = (date: Date, format: string): string => {
    const locale = getLocaleForDate(language)
    if (format === 'YYYY-MM-DD HH:mm') {
      const d = date.toLocaleDateString(locale)
      const time = date.toLocaleTimeString(locale, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${d} ${time}`
    }

    if (format === 'HH:mm') {
      return date.toLocaleTimeString(locale, { hour12: false, hour: '2-digit', minute: '2-digit' })
    }

    if (format === 'hh:mm A') {
      return date.toLocaleTimeString(locale, { hour12: true, hour: '2-digit', minute: '2-digit' })
    }

    if (format === 'hh:mm:ss A') {
      return date.toLocaleTimeString(locale, {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    return date.toLocaleTimeString(locale, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleTabChange = (nextTab: SettingsTab) => {
    if (nextTab === activeTab) return
    if (!hasUnsavedChanges) {
      setActiveTab(nextTab)
      return
    }
    setPendingAction({ type: 'tab', nextTab })
  }

  const continuePendingAction = async () => {
    if (!pendingAction) return
    if (pendingAction.type === 'tab') {
      setActiveTab(pendingAction.nextTab)
    } else {
      await window.api.respondSettingsClose('proceed')
    }
    setPendingAction(null)
  }

  const handleSaveAndContinue = async () => {
    const ok = await handleSave()
    if (!ok) return
    await continuePendingAction()
  }

  const handleDiscardAndContinue = async () => {
    restoreSavedState()
    await continuePendingAction()
  }

  const handleBack = async () => {
    if (pendingAction?.type === 'close') {
      await window.api.respondSettingsClose('cancel')
    }
    setPendingAction(null)
  }

  const applyTheme = (theme: (typeof presetThemes)[0]) => {
    setStyle((s) => ({
      ...s,
      themeMode: theme.themeMode,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      lightBackgroundColor: theme.lightBackgroundColor,
      lightTextColor: theme.lightTextColor
    }))
  }

  const updateDaySchedule = (day: keyof WeeklySchedule, updates: Partial<DaySchedule>) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...updates } }))
  }

  const addSlot = (day: keyof WeeklySchedule) => {
    const slots = schedule[day]?.slots ?? []
    updateDaySchedule(day, { slots: [...slots, { start: '09:00', end: '18:00' }] })
  }

  const updateSlot = (day: keyof WeeklySchedule, index: number, slot: TimeSlot) => {
    const newSlots = [...(schedule[day]?.slots ?? [])]
    newSlots[index] = slot
    updateDaySchedule(day, { slots: newSlots })
  }

  const deleteSlot = (day: keyof WeeklySchedule, index: number) => {
    const newSlots = (schedule[day]?.slots ?? []).filter((_, i) => i !== index)
    updateDaySchedule(day, { slots: newSlots })
  }

  const getPreviewColors = () => {
    if (previewMode === 'dark') {
      return { backgroundColor: style.backgroundColor, textColor: style.textColor }
    } else {
      return {
        backgroundColor: style.lightBackgroundColor || '#fafafa',
        textColor: style.lightTextColor || '#171717'
      }
    }
  }

  const previewColors = getPreviewColors()
  const previewTimeText = formatPreviewTime(previewNow, style.timeFormat)
  const canControlAutoLaunch = runtimeInfo ? runtimeInfo.autoLaunchSupported : true
  const previewTimePositionClass =
    style.timePosition === 'top-left'
      ? 'top-4 left-4'
      : style.timePosition === 'top-right'
        ? 'top-4 right-4'
        : style.timePosition === 'bottom-left'
          ? 'bottom-4 left-4'
          : style.timePosition === 'bottom-right'
            ? 'bottom-4 right-4'
            : ''

  const navItems: { id: typeof activeTab; label: string; icon: React.ElementType }[] = [
    { id: 'schedule', label: t(language, 'settings.tab.schedule'), icon: Calendar },
    { id: 'password', label: t(language, 'settings.tab.password'), icon: Lock },
    { id: 'style', label: t(language, 'settings.tab.style'), icon: Eye },
    { id: 'camera', label: t(language, 'settings.tab.camera'), icon: Aperture },
    { id: 'photos', label: t(language, 'settings.tab.photos'), icon: Image },
    { id: 'about', label: t(language, 'settings.tab.about'), icon: Info }
  ]

  const dayNames = getDayNames(language) as {
    key: keyof WeeklySchedule
    label: string
    short: string
  }[]
  const languageOptions = getLanguageOptions(language)
  const presetThemes = getPresetThemes(language)
  const timePositionOptions = getTimePositionOptions(language)
  const timeFormatOptions = getTimeFormatOptions(language)
  const textAlignOptions = getTextAlignOptions(language)
  const fontWeightOptions = getFontWeightOptions(language)

  return (
    <div className="h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-neutral-900 stroke-[1.5]" />
          <h1 className="text-sm font-medium tracking-wide">{t(language, 'settings.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{t(language, 'settings.language')}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(normalizeLanguage(e.target.value))}
              className="text-xs px-2 py-1 bg-white border border-neutral-300 text-neutral-700"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {hasUnsavedChanges ? (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700">
              {t(language, 'settings.status.unsaved')}
            </span>
          ) : saveSuccess ? (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700">
              {t(language, 'settings.status.saved')}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600">
              {t(language, 'settings.status.synced')}
            </span>
          )}
          <Button onClick={handleSave} disabled={isLoading} size="sm">
            {isLoading ? (
              <>
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {t(language, 'common.saving')}
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t(language, 'settings.status.saved')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t(language, 'settings.saveConfig')}
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 bg-white border-r border-neutral-200 flex flex-col">
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150
                    ${
                      activeTab === item.id
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-neutral-400'}`}
                  />
                  <span>{item.label}</span>
                  {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-8">
          <div className="max-w-3xl mx-auto">
            {/* 锁屏时段 */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">
                    {t(language, 'settings.tab.schedule')}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {t(language, 'settings.section.schedule.desc')}
                  </p>
                </div>

                <Card>
                  <div className="flex gap-1">
                    {dayNames.map(({ key, short }) => {
                      const enabled = schedule[key]?.enabled
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedDay(key)}
                          className={`flex-1 h-10 text-sm font-medium transition-colors
                            ${
                              selectedDay === key
                                ? 'bg-neutral-900 text-white'
                                : enabled
                                  ? 'bg-neutral-100 text-neutral-900'
                                  : 'bg-neutral-50 text-neutral-400'
                            }`}
                        >
                          {short}
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <Card
                  title={dayNames.find((d) => d.key === selectedDay)?.label}
                  subtitle={lt(language, {
                    'zh-CN': '配置该日的锁屏时间段',
                    'en-US': 'Configure lock time slots for this day',
                    'ja-JP': 'この曜日のロック時間帯を設定',
                    'ko-KR': '해당 요일의 잠금 시간대를 설정'
                  })}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={schedule[selectedDay]?.enabled ?? false}
                        onChange={(checked) => updateDaySchedule(selectedDay, { enabled: checked })}
                      />
                      <span className="text-sm">
                        {lt(language, {
                          'zh-CN': '启用锁屏',
                          'en-US': 'Enable Lock',
                          'ja-JP': 'ロックを有効化',
                          'ko-KR': '잠금 활성화'
                        })}
                      </span>
                    </div>
                    {schedule[selectedDay]?.enabled && (
                      <Button size="sm" onClick={() => addSlot(selectedDay)}>
                        <Plus className="w-4 h-4 mr-1" />
                        {lt(language, {
                          'zh-CN': '添加时段',
                          'en-US': 'Add Slot',
                          'ja-JP': '時間帯を追加',
                          'ko-KR': '시간대 추가'
                        })}
                      </Button>
                    )}
                  </div>

                  {schedule[selectedDay]?.enabled && (
                    <div className="space-y-2">
                      {schedule[selectedDay]?.slots.length === 0 ? (
                        <p className="text-sm text-neutral-400 py-4 text-center">
                          {lt(language, {
                            'zh-CN': '点击上方按钮添加时段',
                            'en-US': 'Click above to add a slot',
                            'ja-JP': '上のボタンで時間帯を追加',
                            'ko-KR': '위 버튼으로 시간대 추가'
                          })}
                        </p>
                      ) : (
                        schedule[selectedDay]?.slots.map((slot, i) => (
                          <TimeSlotEditor
                            key={i}
                            slot={slot}
                            onChange={(s) => updateSlot(selectedDay, i, s)}
                            onDelete={() => deleteSlot(selectedDay, i)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* 密码 */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">
                    {t(language, 'settings.tab.password')}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {t(language, 'settings.section.password.desc')}
                  </p>
                </div>
                <PasswordSection password={password} onChange={setPassword} language={language} />
              </div>
            )}

            {/* 界面样式 */}
            {activeTab === 'style' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">{t(language, 'settings.tab.style')}</h2>
                  <p className="text-sm text-neutral-500">
                    {t(language, 'settings.section.style.desc')}
                  </p>
                </div>

                <Card
                  title={lt(language, {
                    'zh-CN': '预设主题',
                    'en-US': 'Preset Themes',
                    'ja-JP': 'プリセットテーマ',
                    'ko-KR': '프리셋 테마'
                  })}
                >
                  <div className="grid grid-cols-3 gap-3">
                    {presetThemes.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => applyTheme(theme)}
                        className="group text-left"
                      >
                        <div className="flex gap-0.5 mb-2">
                          <div
                            className="h-10 flex-1"
                            style={{ backgroundColor: theme.backgroundColor }}
                          />
                          <div
                            className="h-10 flex-1"
                            style={{ backgroundColor: theme.lightBackgroundColor }}
                          />
                        </div>
                        <p className="text-xs text-neutral-600 group-hover:text-neutral-900">
                          {theme.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '主题模式',
                    'en-US': 'Theme Mode',
                    'ja-JP': 'テーマモード',
                    'ko-KR': '테마 모드'
                  })}
                >
                  <div className="flex gap-2">
                    {(['light', 'dark', 'system', 'custom'] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={style.themeMode === mode ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setStyle((s) => ({ ...s, themeMode: mode }))}
                      >
                        {mode === 'light' && <Sun className="w-4 h-4 mr-1.5" />}
                        {mode === 'dark' && <Moon className="w-4 h-4 mr-1.5" />}
                        {mode === 'system' && <Monitor className="w-4 h-4 mr-1.5" />}
                        {mode === 'custom' && <Settings2 className="w-4 h-4 mr-1.5" />}
                        {mode === 'light' &&
                          lt(language, {
                            'zh-CN': '浅色',
                            'en-US': 'Light',
                            'ja-JP': 'ライト',
                            'ko-KR': '라이트'
                          })}
                        {mode === 'dark' &&
                          lt(language, {
                            'zh-CN': '深色',
                            'en-US': 'Dark',
                            'ja-JP': 'ダーク',
                            'ko-KR': '다크'
                          })}
                        {mode === 'system' &&
                          lt(language, {
                            'zh-CN': '跟随系统',
                            'en-US': 'System',
                            'ja-JP': 'システム',
                            'ko-KR': '시스템'
                          })}
                        {mode === 'custom' &&
                          lt(language, {
                            'zh-CN': '自定义',
                            'en-US': 'Custom',
                            'ja-JP': 'カスタム',
                            'ko-KR': '사용자 지정'
                          })}
                      </Button>
                    ))}
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card
                    title={lt(language, {
                      'zh-CN': '深色模式配色',
                      'en-US': 'Dark Palette',
                      'ja-JP': 'ダーク配色',
                      'ko-KR': '다크 색상'
                    })}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.backgroundColor}
                          onChange={(e) =>
                            setStyle((s) => ({ ...s, backgroundColor: e.target.value }))
                          }
                          className="w-8 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input
                          value={style.backgroundColor}
                          onChange={(v) => setStyle((s) => ({ ...s, backgroundColor: v }))}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.textColor}
                          onChange={(e) => setStyle((s) => ({ ...s, textColor: e.target.value }))}
                          className="w-8 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input
                          value={style.textColor}
                          onChange={(v) => setStyle((s) => ({ ...s, textColor: v }))}
                        />
                      </div>
                    </div>
                  </Card>
                  <Card
                    title={lt(language, {
                      'zh-CN': '浅色模式配色',
                      'en-US': 'Light Palette',
                      'ja-JP': 'ライト配色',
                      'ko-KR': '라이트 색상'
                    })}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.lightBackgroundColor || '#fafafa'}
                          onChange={(e) =>
                            setStyle((s) => ({ ...s, lightBackgroundColor: e.target.value }))
                          }
                          className="w-8 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input
                          value={style.lightBackgroundColor || '#fafafa'}
                          onChange={(v) => setStyle((s) => ({ ...s, lightBackgroundColor: v }))}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.lightTextColor || '#171717'}
                          onChange={(e) =>
                            setStyle((s) => ({ ...s, lightTextColor: e.target.value }))
                          }
                          className="w-8 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input
                          value={style.lightTextColor || '#171717'}
                          onChange={(v) => setStyle((s) => ({ ...s, lightTextColor: v }))}
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                <Card
                  title={lt(language, {
                    'zh-CN': '字体大小',
                    'en-US': 'Font Size',
                    'ja-JP': 'フォントサイズ',
                    'ko-KR': '글자 크기'
                  })}
                >
                  <div className="grid grid-cols-2 gap-6">
                    <Slider
                      label={lt(language, {
                        'zh-CN': '主标题',
                        'en-US': 'Main Title',
                        'ja-JP': 'メイン見出し',
                        'ko-KR': '메인 제목'
                      })}
                      value={style.fontSizes.centerText}
                      min={20}
                      max={80}
                      onChange={(v) =>
                        setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, centerText: v } }))
                      }
                    />
                    <Slider
                      label={lt(language, {
                        'zh-CN': '副标题',
                        'en-US': 'Subtitle',
                        'ja-JP': 'サブタイトル',
                        'ko-KR': '부제목'
                      })}
                      value={style.fontSizes.subText}
                      min={16}
                      max={48}
                      onChange={(v) =>
                        setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, subText: v } }))
                      }
                    />
                    <Slider
                      label={lt(language, {
                        'zh-CN': '底部文字',
                        'en-US': 'Bottom Text',
                        'ja-JP': '下部テキスト',
                        'ko-KR': '하단 텍스트'
                      })}
                      value={style.fontSizes.bottomText}
                      min={10}
                      max={32}
                      onChange={(v) =>
                        setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, bottomText: v } }))
                      }
                    />
                    <Slider
                      label={lt(language, {
                        'zh-CN': '时间文字',
                        'en-US': 'Time Text',
                        'ja-JP': '時刻テキスト',
                        'ko-KR': '시간 텍스트'
                      })}
                      value={style.fontSizes.timeText}
                      min={12}
                      max={40}
                      onChange={(v) =>
                        setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, timeText: v } }))
                      }
                    />
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '文字对齐与字重',
                    'en-US': 'Alignment & Weight',
                    'ja-JP': '配置と太さ',
                    'ko-KR': '정렬 및 두께'
                  })}
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <label className="block text-xs text-neutral-600">
                        {lt(language, {
                          'zh-CN': '主标题对齐',
                          'en-US': 'Main Title Align',
                          'ja-JP': 'メイン見出しの配置',
                          'ko-KR': '메인 제목 정렬'
                        })}
                      </label>
                      <Select
                        value={style.textAligns.centerText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            textAligns: {
                              ...s.textAligns,
                              centerText: v as TextAlignConfig['centerText']
                            }
                          }))
                        }
                        options={textAlignOptions}
                      />
                      <label className="block text-xs text-neutral-600">
                        {lt(language, {
                          'zh-CN': '主标题字重',
                          'en-US': 'Main Title Weight',
                          'ja-JP': 'メイン見出しの太さ',
                          'ko-KR': '메인 제목 두께'
                        })}
                      </label>
                      <Select
                        value={style.fontWeights.centerText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            fontWeights: {
                              ...s.fontWeights,
                              centerText: v as FontWeightConfig['centerText']
                            }
                          }))
                        }
                        options={fontWeightOptions}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs text-neutral-600">
                        {lt(language, {
                          'zh-CN': '副标题对齐',
                          'en-US': 'Subtitle Align',
                          'ja-JP': 'サブタイトルの配置',
                          'ko-KR': '부제목 정렬'
                        })}
                      </label>
                      <Select
                        value={style.textAligns.subText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            textAligns: {
                              ...s.textAligns,
                              subText: v as TextAlignConfig['subText']
                            }
                          }))
                        }
                        options={textAlignOptions}
                      />
                      <label className="block text-xs text-neutral-600">
                        {lt(language, {
                          'zh-CN': '副标题字重',
                          'en-US': 'Subtitle Weight',
                          'ja-JP': 'サブタイトルの太さ',
                          'ko-KR': '부제목 두께'
                        })}
                      </label>
                      <Select
                        value={style.fontWeights.subText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            fontWeights: {
                              ...s.fontWeights,
                              subText: v as FontWeightConfig['subText']
                            }
                          }))
                        }
                        options={fontWeightOptions}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs text-neutral-600">
                        {lt(language, {
                          'zh-CN': '底部文字对齐',
                          'en-US': 'Bottom Text Align',
                          'ja-JP': '下部テキストの配置',
                          'ko-KR': '하단 텍스트 정렬'
                        })}
                      </label>
                      <Select
                        value={style.textAligns.bottomText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            textAligns: {
                              ...s.textAligns,
                              bottomText: v as TextAlignConfig['bottomText']
                            }
                          }))
                        }
                        options={textAlignOptions}
                      />
                      <label className="block text-xs text-neutral-600">
                        {lt(language, {
                          'zh-CN': '底部文字字重',
                          'en-US': 'Bottom Text Weight',
                          'ja-JP': '下部テキストの太さ',
                          'ko-KR': '하단 텍스트 두께'
                        })}
                      </label>
                      <Select
                        value={style.fontWeights.bottomText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            fontWeights: {
                              ...s.fontWeights,
                              bottomText: v as FontWeightConfig['bottomText']
                            }
                          }))
                        }
                        options={fontWeightOptions}
                      />
                    </div>
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '时间显示',
                    'en-US': 'Time Display',
                    'ja-JP': '時刻表示',
                    'ko-KR': '시간 표시'
                  })}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">
                        {lt(language, {
                          'zh-CN': '位置',
                          'en-US': 'Position',
                          'ja-JP': '位置',
                          'ko-KR': '위치'
                        })}
                      </label>
                      <Select
                        value={style.timePosition}
                        onChange={(v) => setStyle((s) => ({ ...s, timePosition: v as any }))}
                        options={timePositionOptions}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">
                        {lt(language, {
                          'zh-CN': '格式',
                          'en-US': 'Format',
                          'ja-JP': '形式',
                          'ko-KR': '형식'
                        })}
                      </label>
                      <Select
                        value={style.timeFormat}
                        onChange={(v) => setStyle((s) => ({ ...s, timeFormat: v }))}
                        options={timeFormatOptions}
                      />
                    </div>
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '文字内容',
                    'en-US': 'Text Content',
                    'ja-JP': 'テキスト内容',
                    'ko-KR': '텍스트 내용'
                  })}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">
                        {lt(language, {
                          'zh-CN': '主标题',
                          'en-US': 'Main Title',
                          'ja-JP': 'メイン見出し',
                          'ko-KR': '메인 제목'
                        })}
                      </label>
                      <TextArea
                        value={style.centerText}
                        onChange={(v) => setStyle((s) => ({ ...s, centerText: v }))}
                        placeholder={lt(language, {
                          'zh-CN': '显示在中央的文字',
                          'en-US': 'Text shown in center',
                          'ja-JP': '中央に表示するテキスト',
                          'ko-KR': '중앙에 표시할 문구'
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">
                        {lt(language, {
                          'zh-CN': '副标题',
                          'en-US': 'Subtitle',
                          'ja-JP': 'サブタイトル',
                          'ko-KR': '부제목'
                        })}
                      </label>
                      <TextArea
                        value={style.subText}
                        onChange={(v) => setStyle((s) => ({ ...s, subText: v }))}
                        placeholder={lt(language, {
                          'zh-CN': '主标题下方的文字',
                          'en-US': 'Text below main title',
                          'ja-JP': 'メイン見出し下のテキスト',
                          'ko-KR': '메인 제목 아래 문구'
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1.5">
                          {lt(language, {
                            'zh-CN': '左下角',
                            'en-US': 'Bottom Left',
                            'ja-JP': '左下',
                            'ko-KR': '좌하단'
                          })}
                        </label>
                        <TextArea
                          value={style.bottomLeftText}
                          onChange={(v) => setStyle((s) => ({ ...s, bottomLeftText: v }))}
                          rows={1}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1.5">
                          {lt(language, {
                            'zh-CN': '右下角',
                            'en-US': 'Bottom Right',
                            'ja-JP': '右下',
                            'ko-KR': '우하단'
                          })}
                        </label>
                        <TextArea
                          value={style.bottomRightText}
                          onChange={(v) => setStyle((s) => ({ ...s, bottomRightText: v }))}
                          rows={1}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">
                        {lt(language, {
                          'zh-CN': '提示文字',
                          'en-US': 'Prompt Text',
                          'ja-JP': '案内テキスト',
                          'ko-KR': '안내 문구'
                        })}
                      </label>
                      <TextArea
                        value={style.closeScreenPrompt}
                        onChange={(v) => setStyle((s) => ({ ...s, closeScreenPrompt: v }))}
                        placeholder={lt(language, {
                          'zh-CN': '点击背景后显示的提示',
                          'en-US': 'Prompt shown after background click',
                          'ja-JP': '背景クリック後に表示する案内',
                          'ko-KR': '배경 클릭 후 표시할 안내 문구'
                        })}
                      />
                    </div>
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '预览',
                    'en-US': 'Preview',
                    'ja-JP': 'プレビュー',
                    'ko-KR': '미리보기'
                  })}
                  subtitle={
                    lt(language, {
                      'zh-CN': '当前模式',
                      'en-US': 'Mode',
                      'ja-JP': '現在モード',
                      'ko-KR': '현재 모드'
                    }) +
                    `: ${previewMode === 'dark' ? lt(language, { 'zh-CN': '深色', 'en-US': 'Dark', 'ja-JP': 'ダーク', 'ko-KR': '다크' }) : lt(language, { 'zh-CN': '浅色', 'en-US': 'Light', 'ja-JP': 'ライト', 'ko-KR': '라이트' })}`
                  }
                >
                  <div className="mb-4 flex gap-2">
                    <Button
                      variant={previewMode === 'dark' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPreviewMode('dark')}
                    >
                      {lt(language, {
                        'zh-CN': '深色',
                        'en-US': 'Dark',
                        'ja-JP': 'ダーク',
                        'ko-KR': '다크'
                      })}
                    </Button>
                    <Button
                      variant={previewMode === 'light' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPreviewMode('light')}
                    >
                      {lt(language, {
                        'zh-CN': '浅色',
                        'en-US': 'Light',
                        'ja-JP': 'ライト',
                        'ko-KR': '라이트'
                      })}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowFullPreview(true)}>
                      {lt(language, {
                        'zh-CN': '全屏仿真预览',
                        'en-US': 'Fullscreen Simulation',
                        'ja-JP': '全画面シミュレーション',
                        'ko-KR': '전체화면 시뮬레이션'
                      })}
                    </Button>
                  </div>
                  <div className="border border-neutral-200 overflow-hidden">
                    <div className="h-7 px-3 bg-neutral-100 text-xs text-neutral-500 flex items-center">
                      {lt(language, {
                        'zh-CN': 'Lock It 锁屏预览',
                        'en-US': 'Lock It Preview',
                        'ja-JP': 'Lock It プレビュー',
                        'ko-KR': 'Lock It 미리보기'
                      })}
                    </div>
                    <div
                      className="aspect-video relative px-6 py-5"
                      style={{
                        backgroundColor: previewColors.backgroundColor,
                        color: previewColors.textColor
                      }}
                    >
                      {style.timePosition !== 'hidden' && style.timePosition !== 'center' && (
                        <div
                          className={`absolute font-mono opacity-75 ${previewTimePositionClass}`}
                          style={{ fontSize: Math.max(10, Math.min(style.fontSizes.timeText, 20)) }}
                        >
                          {previewTimeText}
                        </div>
                      )}

                      <div className="h-full flex flex-col justify-center">
                        {style.timePosition === 'center' && (
                          <div
                            className="font-mono mb-3 opacity-70"
                            style={{
                              fontSize: Math.max(10, Math.min(style.fontSizes.timeText, 22)),
                              textAlign: 'center'
                            }}
                          >
                            {previewTimeText}
                          </div>
                        )}
                        <div
                          className="whitespace-pre-line leading-tight"
                          style={{
                            fontSize: Math.max(14, Math.min(style.fontSizes.centerText, 34)),
                            textAlign: style.textAligns.centerText,
                            fontWeight: style.fontWeights.centerText
                          }}
                        >
                          {style.centerText ||
                            lt(language, {
                              'zh-CN': '主标题',
                              'en-US': 'Main Title',
                              'ja-JP': 'メイン見出し',
                              'ko-KR': '메인 제목'
                            })}
                        </div>
                        <div
                          className="opacity-85 whitespace-pre-line mt-2"
                          style={{
                            fontSize: Math.max(12, Math.min(style.fontSizes.subText, 22)),
                            textAlign: style.textAligns.subText,
                            fontWeight: style.fontWeights.subText
                          }}
                        >
                          {style.subText ||
                            lt(language, {
                              'zh-CN': '副标题',
                              'en-US': 'Subtitle',
                              'ja-JP': 'サブタイトル',
                              'ko-KR': '부제목'
                            })}
                        </div>
                      </div>

                      <div
                        className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-3 opacity-80"
                        style={{
                          fontSize: Math.max(10, Math.min(style.fontSizes.bottomText, 16)),
                          fontWeight: style.fontWeights.bottomText
                        }}
                      >
                        <span
                          className="whitespace-pre-line"
                          style={{ textAlign: style.textAligns.bottomText }}
                        >
                          {style.bottomLeftText ||
                            lt(language, {
                              'zh-CN': '左下角文字',
                              'en-US': 'Bottom Left Text',
                              'ja-JP': '左下テキスト',
                              'ko-KR': '좌하단 텍스트'
                            })}
                        </span>
                        <span
                          className="whitespace-pre-line text-right"
                          style={{ textAlign: style.textAligns.bottomText }}
                        >
                          {style.bottomRightText ||
                            lt(language, {
                              'zh-CN': '右下角文字',
                              'en-US': 'Bottom Right Text',
                              'ja-JP': '右下テキスト',
                              'ko-KR': '우하단 텍스트'
                            })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 摄像头 */}
            {activeTab === 'camera' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">
                    {t(language, 'settings.section.camera.title')}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {t(language, 'settings.section.camera.desc')}
                  </p>
                </div>
                <CameraSection
                  selectedCamera={selectedCamera}
                  onChange={setSelectedCamera}
                  language={language}
                />
              </div>
            )}

            {/* 解锁记录 */}
            {activeTab === 'photos' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">{t(language, 'settings.tab.photos')}</h2>
                  <p className="text-sm text-neutral-500">
                    {t(language, 'settings.section.photos.desc')}
                  </p>
                </div>
                <PhotosSection language={language} />
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">{t(language, 'settings.tab.about')}</h2>
                  <p className="text-sm text-neutral-500">
                    {t(language, 'settings.section.about.desc')}
                  </p>
                </div>

                <Card
                  title={lt(language, {
                    'zh-CN': '应用信息',
                    'en-US': 'App Info',
                    'ja-JP': 'アプリ情報',
                    'ko-KR': '앱 정보'
                  })}
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">
                        {lt(language, {
                          'zh-CN': '版本',
                          'en-US': 'Version',
                          'ja-JP': 'バージョン',
                          'ko-KR': '버전'
                        })}
                      </p>
                      <p className="text-neutral-900 mt-1">
                        {runtimeInfo?.appVersion ||
                          lt(language, {
                            'zh-CN': '未知',
                            'en-US': 'Unknown',
                            'ja-JP': '不明',
                            'ko-KR': '알 수 없음'
                          })}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">
                        {lt(language, {
                          'zh-CN': '平台',
                          'en-US': 'Platform',
                          'ja-JP': 'プラットフォーム',
                          'ko-KR': '플랫폼'
                        })}
                      </p>
                      <p className="text-neutral-900 mt-1">
                        {runtimeInfo?.platform ||
                          lt(language, {
                            'zh-CN': '未知',
                            'en-US': 'Unknown',
                            'ja-JP': '不明',
                            'ko-KR': '알 수 없음'
                          })}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '自动启动',
                    'en-US': 'Auto Launch',
                    'ja-JP': '自動起動',
                    'ko-KR': '자동 시작'
                  })}
                  subtitle={lt(language, {
                    'zh-CN': '系统登录后自动运行 Lock It',
                    'en-US': 'Run Lock It when system logs in',
                    'ja-JP': 'ログイン後にLock Itを自動起動',
                    'ko-KR': '시스템 로그인 후 Lock It 자동 실행'
                  })}
                >
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm">
                      <Toggle
                        checked={canControlAutoLaunch ? startup.autoLaunch : false}
                        onChange={(checked) => {
                          if (!canControlAutoLaunch) return
                          setStartup((s) => ({ ...s, autoLaunch: checked }))
                        }}
                      />
                      {lt(language, {
                        'zh-CN': '启用自动启动',
                        'en-US': 'Enable Auto Launch',
                        'ja-JP': '自動起動を有効化',
                        'ko-KR': '자동 시작 활성화'
                      })}
                    </label>
                    {runtimeInfo && !runtimeInfo.autoLaunchSupported && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
                        {lt(language, {
                          'zh-CN': '当前平台暂不支持自动启动配置。',
                          'en-US': 'Current platform does not support auto-launch configuration.',
                          'ja-JP': '現在のプラットフォームは自動起動設定に対応していません。',
                          'ko-KR': '현재 플랫폼은 자동 시작 설정을 지원하지 않습니다.'
                        })}
                      </p>
                    )}
                  </div>
                </Card>

                <Card
                  title={lt(language, {
                    'zh-CN': '软件更新',
                    'en-US': 'Software Update',
                    'ja-JP': 'ソフトウェア更新',
                    'ko-KR': '소프트웨어 업데이트'
                  })}
                  subtitle={lt(language, {
                    'zh-CN': '配置自动更新行为并可手动检查更新',
                    'en-US': 'Configure auto-update behavior and manually check updates',
                    'ja-JP': '自動更新設定と手動確認',
                    'ko-KR': '자동 업데이트 설정 및 수동 확인'
                  })}
                >
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 text-sm">
                      <Toggle
                        checked={update.checkOnStartup}
                        onChange={(checked) =>
                          setUpdate((u) => ({
                            ...u,
                            checkOnStartup: checked
                          }))
                        }
                      />
                      {lt(language, {
                        'zh-CN': '启动时自动检查更新',
                        'en-US': 'Check updates on startup',
                        'ja-JP': '起動時に更新を確認',
                        'ko-KR': '시작 시 업데이트 확인'
                      })}
                    </label>

                    <label className="flex items-center gap-3 text-sm">
                      <Toggle
                        checked={update.autoDownload}
                        onChange={(checked) =>
                          setUpdate((u) => ({
                            ...u,
                            autoDownload: checked
                          }))
                        }
                      />
                      {lt(language, {
                        'zh-CN': '自动下载更新',
                        'en-US': 'Auto download updates',
                        'ja-JP': '更新を自動ダウンロード',
                        'ko-KR': '업데이트 자동 다운로드'
                      })}
                    </label>

                    <label className="flex items-center gap-3 text-sm">
                      <Toggle
                        checked={update.autoInstallOnQuit}
                        onChange={(checked) =>
                          setUpdate((u) => ({
                            ...u,
                            autoInstallOnQuit: checked
                          }))
                        }
                      />
                      {lt(language, {
                        'zh-CN': '退出时自动安装已下载更新',
                        'en-US': 'Auto install downloaded updates on quit',
                        'ja-JP': '終了時にダウンロード済み更新を自動インストール',
                        'ko-KR': '종료 시 다운로드된 업데이트 자동 설치'
                      })}
                    </label>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleCheckForUpdates()}
                        disabled={isCheckingUpdate}
                      >
                        {isCheckingUpdate ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                            {lt(language, {
                              'zh-CN': '检查中',
                              'en-US': 'Checking',
                              'ja-JP': '確認中',
                              'ko-KR': '확인 중'
                            })}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1.5" />
                            {lt(language, {
                              'zh-CN': '立即检查更新',
                              'en-US': 'Check Now',
                              'ja-JP': '今すぐ確認',
                              'ko-KR': '지금 확인'
                            })}
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => void handleInstallDownloadedUpdate()}
                        disabled={updateStatus.status !== 'downloaded'}
                      >
                        <Power className="w-4 h-4 mr-1.5" />
                        {lt(language, {
                          'zh-CN': '立即安装已下载更新',
                          'en-US': 'Install Downloaded Update',
                          'ja-JP': 'ダウンロード済み更新を今すぐインストール',
                          'ko-KR': '다운로드된 업데이트 지금 설치'
                        })}
                      </Button>
                    </div>

                    <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                      <p className="font-medium text-neutral-700 mb-1">
                        {lt(language, {
                          'zh-CN': '更新状态',
                          'en-US': 'Update Status',
                          'ja-JP': '更新状態',
                          'ko-KR': '업데이트 상태'
                        })}
                      </p>
                      <p>{updateStatus.message}</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {showFullPreview && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: previewColors.backgroundColor }}
        >
          <button
            onClick={() => setShowFullPreview(false)}
            className="absolute top-4 right-4 z-50 px-3 py-2 text-sm border border-white/30 text-white/90 hover:bg-white/10"
          >
            <X className="w-4 h-4 inline-block mr-1" />
            {lt(language, {
              'zh-CN': '关闭仿真预览',
              'en-US': 'Close Preview',
              'ja-JP': 'プレビューを閉じる',
              'ko-KR': '미리보기 닫기'
            })}
          </button>

          {style.timePosition !== 'hidden' && style.timePosition !== 'center' && (
            <div
              className={`absolute font-mono opacity-70 ${
                style.timePosition === 'top-left'
                  ? 'top-8 left-8'
                  : style.timePosition === 'top-right'
                    ? 'top-8 right-8'
                    : style.timePosition === 'bottom-left'
                      ? 'bottom-20 left-8'
                      : 'bottom-20 right-8'
              }`}
              style={{ color: previewColors.textColor, fontSize: style.fontSizes.timeText }}
            >
              {previewTimeText}
            </div>
          )}

          <div
            className="h-full flex flex-col justify-center px-12"
            style={{ color: previewColors.textColor }}
          >
            {style.timePosition === 'center' && (
              <div
                className="font-mono mb-5 opacity-70"
                style={{ fontSize: style.fontSizes.timeText, textAlign: 'center' }}
              >
                {previewTimeText}
              </div>
            )}
            <div
              className="whitespace-pre-line"
              style={{
                fontSize: style.fontSizes.centerText,
                textAlign: style.textAligns.centerText,
                fontWeight: style.fontWeights.centerText
              }}
            >
              {style.centerText ||
                lt(language, {
                  'zh-CN': '主标题',
                  'en-US': 'Main Title',
                  'ja-JP': 'メイン見出し',
                  'ko-KR': '메인 제목'
                })}
            </div>
            <div
              className="opacity-85 whitespace-pre-line mt-3"
              style={{
                fontSize: style.fontSizes.subText,
                textAlign: style.textAligns.subText,
                fontWeight: style.fontWeights.subText
              }}
            >
              {style.subText ||
                lt(language, {
                  'zh-CN': '副标题',
                  'en-US': 'Subtitle',
                  'ja-JP': 'サブタイトル',
                  'ko-KR': '부제목'
                })}
            </div>
          </div>

          <div
            className="absolute bottom-8 left-8 right-8 grid grid-cols-2 gap-4 opacity-80"
            style={{ color: previewColors.textColor, fontSize: style.fontSizes.bottomText }}
          >
            <span
              className="whitespace-pre-line"
              style={{
                textAlign: style.textAligns.bottomText,
                fontWeight: style.fontWeights.bottomText
              }}
            >
              {style.bottomLeftText ||
                lt(language, {
                  'zh-CN': '左下角文字',
                  'en-US': 'Bottom Left Text',
                  'ja-JP': '左下テキスト',
                  'ko-KR': '좌하단 텍스트'
                })}
            </span>
            <span
              className="whitespace-pre-line text-right"
              style={{
                textAlign: style.textAligns.bottomText,
                fontWeight: style.fontWeights.bottomText
              }}
            >
              {style.bottomRightText ||
                lt(language, {
                  'zh-CN': '右下角文字',
                  'en-US': 'Bottom Right Text',
                  'ja-JP': '右下テキスト',
                  'ko-KR': '우하단 텍스트'
                })}
            </span>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-[440px] max-w-[calc(100vw-2rem)] bg-white border border-neutral-200">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-medium text-neutral-900">
                {t(language, 'settings.unsaved.title')}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {t(language, 'settings.unsaved.subtitle')}
              </p>
            </div>
            <div className="p-6 space-y-3">
              <Button
                onClick={handleSaveAndContinue}
                disabled={isLoading}
                className="w-full justify-center"
              >
                {t(language, 'settings.unsaved.saveContinue')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDiscardAndContinue}
                disabled={isLoading}
                className="w-full justify-center"
              >
                {t(language, 'settings.unsaved.discardContinue')}
              </Button>
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full justify-center"
              >
                {t(language, 'settings.unsaved.back')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d4d4d4;
          border-radius: 0;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a3a3a3;
        }
      `}</style>
    </div>
  )
}
