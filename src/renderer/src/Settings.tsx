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
  Aperture
} from 'lucide-react'

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

// ============================================================================
// 预置主题 - 瑞士风格配色
// ============================================================================
const presetThemes = [
  {
    name: '警示蓝',
    themeMode: 'custom' as const,
    backgroundColor: '#1a365d',
    textColor: '#ffffff',
    lightBackgroundColor: '#e2e8f0',
    lightTextColor: '#1a365d',
    centerText: '系统已锁定',
    subText: '未经授权禁止访问'
  },
  {
    name: '警戒红',
    themeMode: 'custom' as const,
    backgroundColor: '#7f1d1d',
    textColor: '#ffffff',
    lightBackgroundColor: '#fee2e2',
    lightTextColor: '#7f1d1d',
    centerText: '安全警报',
    subText: '检测到未授权访问尝试'
  },
  {
    name: '极简黑',
    themeMode: 'custom' as const,
    backgroundColor: '#0a0a0a',
    textColor: '#fafafa',
    lightBackgroundColor: '#f5f5f5',
    lightTextColor: '#0a0a0a',
    centerText: '设备已锁定',
    subText: '请联系管理员'
  },
  {
    name: '深色',
    themeMode: 'dark' as const,
    backgroundColor: '#171717',
    textColor: '#e5e5e5',
    lightBackgroundColor: '#f5f5f5',
    lightTextColor: '#171717',
    centerText: '屏幕锁定',
    subText: '输入密码解锁'
  },
  {
    name: '浅色',
    themeMode: 'light' as const,
    backgroundColor: '#fafafa',
    textColor: '#171717',
    lightBackgroundColor: '#ffffff',
    lightTextColor: '#171717',
    centerText: '设备锁定',
    subText: '点击屏幕继续'
  },
  {
    name: '安全绿',
    themeMode: 'custom' as const,
    backgroundColor: '#064e3b',
    textColor: '#ecfdf5',
    lightBackgroundColor: '#d1fae5',
    lightTextColor: '#064e3b',
    centerText: '系统保护中',
    subText: '正在进行安全检查'
  }
]

const timePositionOptions = [
  { value: 'hidden', label: '隐藏' },
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
  { value: 'center', label: '居中' }
]

const timeFormatOptions = [
  { value: 'HH:mm:ss', label: '24时:分:秒' },
  { value: 'HH:mm', label: '24时:分' },
  { value: 'hh:mm:ss A', label: '12时:分:秒' },
  { value: 'hh:mm A', label: '12时:分' },
  { value: 'YYYY-MM-DD HH:mm', label: '年-月-日 时:分' }
]

const textAlignOptions = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' }
]

const fontWeightOptions = [
  { value: 'light', label: '细体' },
  { value: 'normal', label: '常规' },
  { value: 'medium', label: '中等' },
  { value: 'bold', label: '粗体' }
]

const dayNames: { key: keyof WeeklySchedule; label: string; short: string }[] = [
  { key: 'monday', label: '周一', short: '一' },
  { key: 'tuesday', label: '周二', short: '二' },
  { key: 'wednesday', label: '周三', short: '三' },
  { key: 'thursday', label: '周四', short: '四' },
  { key: 'friday', label: '周五', short: '五' },
  { key: 'saturday', label: '周六', short: '六' },
  { key: 'sunday', label: '周日', short: '日' }
]

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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950',
    secondary: 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
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
function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
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
  onChange
}: {
  password: PasswordConfig
  onChange: (p: PasswordConfig) => void
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
      setError('请先填写并确认设备标识名称')
      return
    }
    if (!isDeviceConfirmed) {
      setError('请先确认设备标识名称，再生成扫码绑定二维码')
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
        const { secret, otpauthUrl, deviceName } = await window.api.generateTOTPSecret(normalizedDeviceName)
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
      setError('生成扫码绑定二维码失败，请重试')
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
      setError('复制失败，请手动复制')
    }
  }

  const handleSave = () => {
    if (!/^\d{6}$/.test(newPassword)) {
      setError('密码必须为6位数字')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入不一致')
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
      <Card title="解锁方式" subtitle="固定密码为必选项，TOTP为可选附加（两者任一可解锁）">
        <div className="flex gap-2">
          <Button
            variant={password.type === 'fixed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => void setPasswordType('fixed')}
            disabled={isGeneratingTotp}
          >
            仅固定密码
          </Button>
          <Button
            variant={password.type === 'both' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => void setPasswordType('both')}
            disabled={isGeneratingTotp}
          >
            固定密码 / TOTP 任一
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
              <p className="text-sm font-medium text-neutral-900">固定密码</p>
              <p className="text-xs text-neutral-500">当前密码: {password.fixedPassword ? '••••••' : '未配置'}</p>
            </div>
          </div>
          <Button
            variant={showChangeForm ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowChangeForm(!showChangeForm)}
          >
            {showChangeForm ? '取消' : '修改'}
          </Button>
        </div>
      </Card>

      <Card title="TOTP 动态密码" subtitle="请先确认设备标识，再点击扫码绑定生成二维码">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-600 mb-1.5">设备标识名称</label>
            <Input
              value={password.totpDeviceName || ''}
              onChange={(v) => {
                if (isDeviceLocked) return
                onChange({ ...password, totpDeviceName: v })
                setIsDeviceConfirmed(false)
                setError('')
              }}
              placeholder="例如 A1B2"
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
                  setError('设备标识名称不能为空')
                  return
                }
                const confirmed = window.confirm(
                  `确认将设备标识锁定为“${value}”吗？锁定后不可更改。`
                )
                if (!confirmed) return
                onChange({ ...password, totpDeviceName: value })
                setIsDeviceConfirmed(true)
                setError('')
              }}
              disabled={isDeviceLocked}
            >
              {isDeviceLocked ? '设备标识已锁定' : '确认设备标识'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void generateBindingQr()}
              disabled={isGeneratingTotp || !isDeviceConfirmed}
            >
              扫码绑定
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTotpSecret((v) => !v)}
              disabled={!password.totpSecret}
            >
              {showTotpSecret ? '隐藏密钥' : '显示密钥'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copyTotpSecret()}
              disabled={!password.totpSecret}
            >
              复制密钥
            </Button>
          </div>

          {isDeviceConfirmed && normalizedDeviceName && (
            <p className="text-xs text-neutral-500">当前设备名称：LockIt - {normalizedDeviceName}</p>
          )}

          {password.totpSecret ? (
            <div className="p-3 bg-neutral-50 border border-neutral-200">
              <p className="text-xs text-neutral-500 mb-1">当前 TOTP 密钥</p>
              <p className="text-sm font-mono break-all text-neutral-900">
                {showTotpSecret ? password.totpSecret : '••••••••••••••••••••••••••••••••'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">尚未生成 TOTP 密钥</p>
          )}

          {qrCodeDataUrl && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 inline-block">
              <p className="text-xs text-neutral-500 mb-2">请使用认证器应用扫码</p>
              <img src={qrCodeDataUrl} alt="TOTP 绑定二维码" className="w-56 h-56" />
            </div>
          )}

          <p className="text-xs text-neutral-500">
            当前模式：{password.type === 'both' ? '固定密码 / TOTP 任一可解锁' : '仅固定密码'}
          </p>
        </div>
      </Card>

      {showChangeForm && (
        <Card title="设置新密码" subtitle="请输入6位数字密码">
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">新密码</label>
              <Input
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="输入6位数字"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1.5">确认密码</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="再次输入"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">修改成功</p>}
            <Button onClick={handleSave} disabled={!newPassword || !confirmPassword}>
              保存密码
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
function PhotosSection() {
  const [records, setRecords] = useState<UnlockRecord[]>([])
  const [loading, setLoading] = useState(true)
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
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleDelete = async (id: string) => {
    try {
      await window.api.deleteUnlockRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      if (selectedRecord?.id === id) setSelectedRecord(null)
    } catch (e) {
      alert('删除失败')
    }
  }

  const getUnlockMethodLabel = (method?: 'fixed' | 'totp') => {
    if (method === 'fixed') return '固定密码'
    if (method === 'totp') return 'TOTP'
    return '未知方式'
  }

  const handleClearAll = () => {
    setShowClearAuthModal(true)
    setClearPassword('')
    setClearAuthError('')
  }

  const handleConfirmClearAll = async () => {
    const input = clearPassword.trim()
    if (!input) {
      setClearAuthError('请输入密码进行验证')
      return
    }

    try {
      setIsVerifyingClearPassword(true)
      setClearAuthError('')
      if (!confirm('确定清空所有记录？此操作不可恢复。')) return

      const cleared = await window.api.clearUnlockRecords(input)
      if (!cleared) {
        setClearAuthError('密码验证失败或清空失败')
        return
      }
      setRecords([])
      setSelectedRecord(null)
      setShowClearAuthModal(false)
    } catch (e) {
      alert('清空失败')
    } finally {
      setIsVerifyingClearPassword(false)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
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
        <Button variant="secondary" size="sm" onClick={loadRecords} className="mt-4">
          重试
        </Button>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
        <Image className="w-16 h-16 mb-4 stroke-1" />
        <p className="text-sm">暂无解锁记录</p>
        <p className="text-xs mt-1 text-neutral-400">解锁时会自动拍摄照片</p>
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
          <p className="text-xs text-neutral-500 mt-1">总记录</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-light text-green-600">{successCount}</p>
          <p className="text-xs text-neutral-500 mt-1">成功解锁</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-light text-red-600">{failCount}</p>
          <p className="text-xs text-neutral-500 mt-1">密码错误</p>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-neutral-500">共 {records.length} 条记录（保留最近100条）</p>
        <Button variant="danger" size="sm" onClick={handleClearAll}>
          清空所有
        </Button>
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
                      record.success
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {record.success ? '成功' : '失败'}
                  </span>
                  {record.success && (
                    <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600">
                      {getUnlockMethodLabel(record.unlockMethod)}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">第 {record.attemptCount} 次</span>
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
                  {selectedRecord.success ? '解锁成功' : '密码错误'}
                </span>
                <span className="text-sm text-neutral-500">第 {selectedRecord.attemptCount} 次尝试</span>
                {selectedRecord.success && (
                  <span className="text-sm text-neutral-500">
                    解锁方式：{getUnlockMethodLabel(selectedRecord.unlockMethod)}
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
                  alt="解锁照片"
                  className="max-w-full max-h-[50vh] object-contain"
                />
              ) : (
                <div className="text-center text-neutral-500 py-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>无照片</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-neutral-500 mb-1">时间</p>
                  <p className="font-medium">{formatTime(selectedRecord.timestamp)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-1">状态</p>
                  <p className="font-medium">{selectedRecord.success ? '成功' : '失败'}</p>
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
                  下载照片
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
              <h3 className="text-sm font-medium text-neutral-900">清空记录前验证密码</h3>
              <p className="text-xs text-neutral-500 mt-1">
                请输入当前解锁密码（固定密码或 TOTP，遵循全局配置）
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
                placeholder="输入6位密码"
              />
              {clearAuthError && <p className="text-xs text-red-600">{clearAuthError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowClearAuthModal(false)}
                  disabled={isVerifyingClearPassword}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleConfirmClearAll()}
                  disabled={isVerifyingClearPassword}
                >
                  {isVerifyingClearPassword ? '验证中...' : '验证并清空'}
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
  onChange
}: {
  selectedCamera: string | undefined
  onChange: (deviceId: string | undefined) => void
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
          label: d.label || `摄像头 ${d.deviceId.slice(0, 8)}`
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
  }, [])

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
        <p className="text-sm text-neutral-900">摄像头权限被拒绝</p>
        <p className="text-xs text-neutral-500 mt-1">请在系统设置中允许访问</p>
        <Button variant="secondary" size="sm" onClick={loadCameras} className="mt-4">
          重试
        </Button>
      </Card>
    )
  }

  if (cameras.length === 0) {
    return (
      <Card className="text-center py-8">
        <Camera className="w-10 h-10 mx-auto mb-3 text-neutral-400 stroke-1" />
        <p className="text-sm text-neutral-900">未找到摄像头</p>
        <Button variant="secondary" size="sm" onClick={loadCameras} className="mt-4">
          刷新
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden">
        <div className="aspect-video bg-neutral-900 flex items-center justify-center relative">
          {selectedCamera ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <span className="text-neutral-500">请选择摄像头</span>
          )}
          {stream && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-green-600 text-white text-xs">
              预览中
            </div>
          )}
        </div>
      </Card>

      <Card title="选择设备" subtitle={`找到 ${cameras.length} 个摄像头`}>
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
  type SettingsTab = 'schedule' | 'password' | 'style' | 'photos' | 'camera'
  type PendingAction = { type: 'tab'; nextTab: SettingsTab } | { type: 'close' } | null
  type SavedSettingsState = {
    password: PasswordConfig
    schedule: WeeklySchedule
    style: StyleConfig
    selectedCamera: string | null
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
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<keyof WeeklySchedule>('monday')
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>('dark')

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  const getCurrentSettingsState = (): SavedSettingsState => ({
    password,
    schedule,
    style,
    selectedCamera: selectedCamera ?? null
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

      setPassword(nextPassword)
      setSchedule(nextSchedule)
      setStyle(nextStyle)
      setSelectedCamera(nextSelectedCamera || undefined)
      setSavedState(
        clone({
          password: nextPassword,
          schedule: nextSchedule,
          style: nextStyle,
          selectedCamera: nextSelectedCamera
        })
      )
    })
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
      await window.api.saveConfig({ password, schedule, style, selectedCamera })
      setSavedState(clone(getCurrentSettingsState()))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      return true
    } catch (e) {
      console.error('保存失败:', e)
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
    setSelectedCamera(savedState.selectedCamera || undefined)
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

  const navItems: { id: typeof activeTab; label: string; icon: React.ElementType }[] = [
    { id: 'schedule', label: '锁屏时段', icon: Calendar },
    { id: 'password', label: '密码', icon: Lock },
    { id: 'style', label: '界面样式', icon: Eye },
    { id: 'camera', label: '摄像头', icon: Aperture },
    { id: 'photos', label: '解锁记录', icon: Image }
  ]

  return (
    <div className="h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-neutral-900 stroke-[1.5]" />
          <h1 className="text-sm font-medium tracking-wide">系统设置</h1>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges ? (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700">未保存</span>
          ) : saveSuccess ? (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700">已保存</span>
          ) : (
            <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600">已同步</span>
          )}
          <Button onClick={handleSave} disabled={isLoading} size="sm">
            {isLoading ? (
              <>
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                保存中
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存配置
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
                    ${activeTab === item.id
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-neutral-400'}`} />
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
                  <h2 className="text-lg font-medium mb-1">锁屏时段</h2>
                  <p className="text-sm text-neutral-500">设置自动锁屏的时间范围</p>
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
                            ${selectedDay === key
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
                  subtitle="配置该日的锁屏时间段"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={schedule[selectedDay]?.enabled ?? false}
                        onChange={(checked) => updateDaySchedule(selectedDay, { enabled: checked })}
                      />
                      <span className="text-sm">启用锁屏</span>
                    </div>
                    {schedule[selectedDay]?.enabled && (
                      <Button size="sm" onClick={() => addSlot(selectedDay)}>
                        <Plus className="w-4 h-4 mr-1" />
                        添加时段
                      </Button>
                    )}
                  </div>

                  {schedule[selectedDay]?.enabled && (
                    <div className="space-y-2">
                      {schedule[selectedDay]?.slots.length === 0 ? (
                        <p className="text-sm text-neutral-400 py-4 text-center">点击上方按钮添加时段</p>
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
                  <h2 className="text-lg font-medium mb-1">密码设置</h2>
                  <p className="text-sm text-neutral-500">管理解锁密码</p>
                </div>
                <PasswordSection password={password} onChange={setPassword} />
              </div>
            )}

            {/* 界面样式 */}
            {activeTab === 'style' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">界面样式</h2>
                  <p className="text-sm text-neutral-500">自定义锁屏界面外观</p>
                </div>

                <Card title="预设主题">
                  <div className="grid grid-cols-3 gap-3">
                    {presetThemes.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => applyTheme(theme)}
                        className="group text-left"
                      >
                        <div className="flex gap-0.5 mb-2">
                          <div className="h-10 flex-1" style={{ backgroundColor: theme.backgroundColor }} />
                          <div
                            className="h-10 flex-1"
                            style={{ backgroundColor: theme.lightBackgroundColor }}
                          />
                        </div>
                        <p className="text-xs text-neutral-600 group-hover:text-neutral-900">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="主题模式">
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
                        {mode === 'light' && '浅色'}
                        {mode === 'dark' && '深色'}
                        {mode === 'system' && '跟随系统'}
                        {mode === 'custom' && '自定义'}
                      </Button>
                    ))}
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card title="深色模式配色">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.backgroundColor}
                          onChange={(e) => setStyle((s) => ({ ...s, backgroundColor: e.target.value }))}
                          className="w-8 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input value={style.backgroundColor} onChange={(v) => setStyle((s) => ({ ...s, backgroundColor: v }))} />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.textColor}
                          onChange={(e) => setStyle((s) => ({ ...s, textColor: e.target.value }))}
                          className="w-8 h-8 p-0 border-0 cursor-pointer"
                        />
                        <Input value={style.textColor} onChange={(v) => setStyle((s) => ({ ...s, textColor: v }))} />
                      </div>
                    </div>
                  </Card>
                  <Card title="浅色模式配色">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={style.lightBackgroundColor || '#fafafa'}
                          onChange={(e) => setStyle((s) => ({ ...s, lightBackgroundColor: e.target.value }))}
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
                          onChange={(e) => setStyle((s) => ({ ...s, lightTextColor: e.target.value }))}
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

                <Card title="字体大小">
                  <div className="grid grid-cols-2 gap-6">
                    <Slider
                      label="主标题"
                      value={style.fontSizes.centerText}
                      min={20}
                      max={80}
                      onChange={(v) => setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, centerText: v } }))}
                    />
                    <Slider
                      label="副标题"
                      value={style.fontSizes.subText}
                      min={16}
                      max={48}
                      onChange={(v) => setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, subText: v } }))}
                    />
                    <Slider
                      label="底部文字"
                      value={style.fontSizes.bottomText}
                      min={10}
                      max={32}
                      onChange={(v) => setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, bottomText: v } }))}
                    />
                    <Slider
                      label="时间文字"
                      value={style.fontSizes.timeText}
                      min={12}
                      max={40}
                      onChange={(v) => setStyle((s) => ({ ...s, fontSizes: { ...s.fontSizes, timeText: v } }))}
                    />
                  </div>
                </Card>

                <Card title="文字对齐与字重">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <label className="block text-xs text-neutral-600">主标题对齐</label>
                      <Select
                        value={style.textAligns.centerText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            textAligns: { ...s.textAligns, centerText: v as TextAlignConfig['centerText'] }
                          }))
                        }
                        options={textAlignOptions}
                      />
                      <label className="block text-xs text-neutral-600">主标题字重</label>
                      <Select
                        value={style.fontWeights.centerText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            fontWeights: { ...s.fontWeights, centerText: v as FontWeightConfig['centerText'] }
                          }))
                        }
                        options={fontWeightOptions}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs text-neutral-600">副标题对齐</label>
                      <Select
                        value={style.textAligns.subText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            textAligns: { ...s.textAligns, subText: v as TextAlignConfig['subText'] }
                          }))
                        }
                        options={textAlignOptions}
                      />
                      <label className="block text-xs text-neutral-600">副标题字重</label>
                      <Select
                        value={style.fontWeights.subText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            fontWeights: { ...s.fontWeights, subText: v as FontWeightConfig['subText'] }
                          }))
                        }
                        options={fontWeightOptions}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs text-neutral-600">底部文字对齐</label>
                      <Select
                        value={style.textAligns.bottomText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            textAligns: { ...s.textAligns, bottomText: v as TextAlignConfig['bottomText'] }
                          }))
                        }
                        options={textAlignOptions}
                      />
                      <label className="block text-xs text-neutral-600">底部文字字重</label>
                      <Select
                        value={style.fontWeights.bottomText}
                        onChange={(v) =>
                          setStyle((s) => ({
                            ...s,
                            fontWeights: { ...s.fontWeights, bottomText: v as FontWeightConfig['bottomText'] }
                          }))
                        }
                        options={fontWeightOptions}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="时间显示">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">位置</label>
                      <Select
                        value={style.timePosition}
                        onChange={(v) => setStyle((s) => ({ ...s, timePosition: v as any }))}
                        options={timePositionOptions}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">格式</label>
                      <Select
                        value={style.timeFormat}
                        onChange={(v) => setStyle((s) => ({ ...s, timeFormat: v }))}
                        options={timeFormatOptions}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="文字内容">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">主标题</label>
                      <TextArea
                        value={style.centerText}
                        onChange={(v) => setStyle((s) => ({ ...s, centerText: v }))}
                        placeholder="显示在中央的文字"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">副标题</label>
                      <TextArea
                        value={style.subText}
                        onChange={(v) => setStyle((s) => ({ ...s, subText: v }))}
                        placeholder="主标题下方的文字"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1.5">左下角</label>
                        <TextArea
                          value={style.bottomLeftText}
                          onChange={(v) => setStyle((s) => ({ ...s, bottomLeftText: v }))}
                          rows={1}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1.5">右下角</label>
                        <TextArea
                          value={style.bottomRightText}
                          onChange={(v) => setStyle((s) => ({ ...s, bottomRightText: v }))}
                          rows={1}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1.5">提示文字</label>
                      <TextArea
                        value={style.closeScreenPrompt}
                        onChange={(v) => setStyle((s) => ({ ...s, closeScreenPrompt: v }))}
                        placeholder="点击背景后显示的提示"
                      />
                    </div>
                  </div>
                </Card>

                <Card title="预览" subtitle={`当前模式: ${previewMode === 'dark' ? '深色' : '浅色'}`}>
                  <div className="mb-4 flex gap-2">
                    <Button
                      variant={previewMode === 'dark' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPreviewMode('dark')}
                    >
                      深色
                    </Button>
                    <Button
                      variant={previewMode === 'light' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPreviewMode('light')}
                    >
                      浅色
                    </Button>
                  </div>
                  <div
                    className="p-8 text-center min-h-[180px] flex flex-col justify-center"
                    style={{ backgroundColor: previewColors.backgroundColor, color: previewColors.textColor }}
                  >
                    {style.timePosition === 'center' && (
                      <div className="font-mono mb-3 opacity-60" style={{ fontSize: style.fontSizes.timeText }}>
                        {new Date().toLocaleTimeString()}
                      </div>
                    )}
                    <div
                      className="whitespace-pre-line mb-2"
                      style={{
                        fontSize: Math.min(style.fontSizes.centerText, 28),
                        textAlign: style.textAligns.centerText,
                        fontWeight: style.fontWeights.centerText
                      }}
                    >
                      {style.centerText || '主标题'}
                    </div>
                    <div
                      className="opacity-80 whitespace-pre-line"
                      style={{
                        fontSize: Math.min(style.fontSizes.subText, 18),
                        textAlign: style.textAligns.subText,
                        fontWeight: style.fontWeights.subText
                      }}
                    >
                      {style.subText || '副标题'}
                    </div>
                    <div
                      className="grid grid-cols-2 gap-4 mt-6 opacity-60"
                      style={{
                        fontSize: Math.min(style.fontSizes.bottomText, 12),
                        textAlign: style.textAligns.bottomText,
                        fontWeight: style.fontWeights.bottomText
                      }}
                    >
                      <span>{style.bottomLeftText}</span>
                      <span>{style.bottomRightText}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 摄像头 */}
            {activeTab === 'camera' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">摄像头设置</h2>
                  <p className="text-sm text-neutral-500">选择用于拍摄解锁照片的设备</p>
                </div>
                <CameraSection selectedCamera={selectedCamera} onChange={setSelectedCamera} />
              </div>
            )}

            {/* 解锁记录 */}
            {activeTab === 'photos' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium mb-1">解锁记录</h2>
                  <p className="text-sm text-neutral-500">查看历史解锁记录及拍摄的照片</p>
                </div>
                <PhotosSection />
              </div>
            )}
          </div>
        </main>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-[440px] max-w-[calc(100vw-2rem)] bg-white border border-neutral-200">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-medium text-neutral-900">检测到未保存的修改</h3>
              <p className="text-xs text-neutral-500 mt-1">请选择接下来要执行的操作</p>
            </div>
            <div className="p-6 space-y-3">
              <Button onClick={handleSaveAndContinue} disabled={isLoading} className="w-full justify-center">
                保存并继续
              </Button>
              <Button
                variant="secondary"
                onClick={handleDiscardAndContinue}
                disabled={isLoading}
                className="w-full justify-center"
              >
                不保存并继续
              </Button>
              <Button variant="ghost" onClick={handleBack} disabled={isLoading} className="w-full justify-center">
                返回
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
