import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Shield, Calendar, KeyRound } from 'lucide-react'
import QRCode from 'qrcode'
import { AppLanguage, getDayNames, getLanguageOptions, normalizeLanguage, t } from './i18n'

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
  centerText: 'left' | 'center' | 'right' | 'justify'
  subText: 'left' | 'center' | 'right' | 'justify'
  bottomText: 'left' | 'center' | 'right' | 'justify'
  bottomLeftText: 'left' | 'center' | 'right' | 'justify'
  bottomRightText: 'left' | 'center' | 'right' | 'justify'
}

interface FontWeightConfig {
  centerText: 'light' | 'normal' | 'medium' | 'bold'
  subText: 'light' | 'normal' | 'medium' | 'bold'
  bottomText: 'light' | 'normal' | 'medium' | 'bold'
}

type CornerContentMode = 'text' | 'image'

interface LayoutConfig {
  centerWidth: number
  centerPadding: number
  centerOffsetX: number
  centerOffsetY: number
  bottomLeftWidth: number
  bottomLeftPadding: number
  bottomRightWidth: number
  bottomRightPadding: number
  bottomOffsetX: number
  bottomOffsetY: number
  timeOffsetX: number
  timeOffsetY: number
}

interface StyleConfig {
  themeMode: 'light' | 'dark' | 'system' | 'custom'
  themeName?: string
  centerText: string
  subText: string
  bottomLeftText: string
  bottomRightText: string
  bottomLeftMode: CornerContentMode
  bottomRightMode: CornerContentMode
  bottomLeftImage?: string
  bottomRightImage?: string
  backgroundColor: string
  textColor: string
  textOpacity: number
  textOpacities: {
    centerText: number
    subText: number
    bottomLeftText: number
    bottomRightText: number
  }
  imageScales: {
    bottomLeft: number
    bottomRight: number
  }
  lightBackgroundColor?: string
  lightTextColor?: string
  timePosition: 'hidden' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  timeFormat: string
  closeScreenPrompt: string
  fontSizes: FontSizeConfig
  textAligns: TextAlignConfig
  fontWeights: FontWeightConfig
  layout: LayoutConfig
}

function generateDefaultTotpDeviceName(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 4; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const defaultSchedule = (): WeeklySchedule => ({
  monday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  friday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] }
})

const defaultStyle = (): StyleConfig => ({
  themeMode: 'dark',
  centerText: '此计算机因违规外联已被阻断',
  subText: '请等待安全部门与你联系',
  bottomLeftText: '保密委员会办公室\n意识形态工作领导小组办公室',
  bottomRightText: '',
  bottomLeftMode: 'text',
  bottomRightMode: 'text',
  bottomLeftImage: '',
  bottomRightImage: '',
  backgroundColor: '#0066cc',
  textColor: '#ffffff',
  textOpacity: 100,
  textOpacities: {
    centerText: 100,
    subText: 100,
    bottomLeftText: 100,
    bottomRightText: 100
  },
  imageScales: {
    bottomLeft: 100,
    bottomRight: 100
  },
  lightBackgroundColor: '#fafafa',
  lightTextColor: '#171717',
  timePosition: 'hidden',
  timeFormat: 'HH:mm:ss',
  closeScreenPrompt: '请关闭班级大屏后再继续操作',
  fontSizes: { centerText: 48, subText: 24, bottomText: 14, timeText: 18 },
  textAligns: {
    centerText: 'center',
    subText: 'center',
    bottomText: 'center',
    bottomLeftText: 'left',
    bottomRightText: 'right'
  },
  fontWeights: { centerText: 'medium', subText: 'normal', bottomText: 'normal' },
  layout: {
    centerWidth: 100,
    centerPadding: 0,
    centerOffsetX: 0,
    centerOffsetY: 0,
    bottomLeftWidth: 45,
    bottomLeftPadding: 0,
    bottomRightWidth: 45,
    bottomRightPadding: 0,
    bottomOffsetX: 32,
    bottomOffsetY: 32,
    timeOffsetX: 0,
    timeOffsetY: 0
  }
})

function Card({
  children,
  title,
  subtitle,
  className = ''
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={`bg-white border border-neutral-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-neutral-200">
          {title && <h3 className="text-sm font-medium text-neutral-900">{title}</h3>}
          {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

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
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950',
    secondary:
      'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
    ghost: 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
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

function Input({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 bg-white border border-neutral-300 text-sm text-neutral-900
        placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500"
    />
  )
}

export default function Setup() {
  const [language, setLanguage] = useState<AppLanguage>('zh-CN')
  const [step, setStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [autoLaunchSupported, setAutoLaunchSupported] = useState(true)
  const [platform, setPlatform] = useState('')

  const [fixedPassword, setFixedPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpSecret, setTotpSecret] = useState('')
  const [totpDeviceName, setTotpDeviceName] = useState(generateDefaultTotpDeviceName())
  const [isTotpDeviceConfirmed, setIsTotpDeviceConfirmed] = useState(false)
  const [totpQrCodeDataUrl, setTotpQrCodeDataUrl] = useState('')
  const [totpVisible, setTotpVisible] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState('')

  const [schedule, setSchedule] = useState<WeeklySchedule>(defaultSchedule())
  const [selectedDay, setSelectedDay] = useState<keyof WeeklySchedule>('monday')

  const [style, setStyle] = useState<StyleConfig>(defaultStyle())

  const dayNames = getDayNames(language) as {
    key: keyof WeeklySchedule
    label: string
    short: string
  }[]
  const languageOptions = getLanguageOptions(language)

  const passwordError = useMemo(() => {
    if (!fixedPassword && !confirmPassword) return ''
    if (!/^\d{6}$/.test(fixedPassword)) return t(language, 'setup.password.invalid')
    if (confirmPassword && fixedPassword !== confirmPassword)
      return t(language, 'setup.password.mismatch')
    return ''
  }, [fixedPassword, confirmPassword, language])

  const hasValidPassword = /^\d{6}$/.test(fixedPassword) && fixedPassword === confirmPassword

  const hasAnyEnabledSchedule = Object.values(schedule).some((d) => d.enabled && d.slots.length > 0)
  const normalizedTotpDeviceName = totpDeviceName.trim().toUpperCase()
  const isTotpDeviceLocked = isTotpDeviceConfirmed || Boolean(totpSecret.trim())

  useEffect(() => {
    window.api
      .getRuntimeInfo()
      .then((info) => {
        setAutoLaunchSupported(info.autoLaunchSupported)
        setPlatform(info.platform)
      })
      .catch(() => {
        setAutoLaunchSupported(true)
      })

    window.api
      .getConfig()
      .then((config) => {
        setLanguage(normalizeLanguage(config.language))
      })
      .catch(() => {
        setLanguage('zh-CN')
      })
  }, [])

  const canProceed = () => {
    if (step === 1) return hasValidPassword
    if (step === 2) return !totpEnabled || (!!totpSecret && !!totpQrCodeDataUrl)
    if (step === 3) return hasAnyEnabledSchedule
    return true
  }

  const confirmTotpDeviceName = () => {
    const normalized = normalizedTotpDeviceName
    if (!normalized) {
      setTotpError(t(language, 'setup.totp.emptyName'))
      return
    }

    if (isTotpDeviceLocked) {
      return
    }

    const confirmed = window.confirm(t(language, 'setup.totp.confirmLock', { name: normalized }))
    if (!confirmed) return

    setTotpDeviceName(normalized)
    setIsTotpDeviceConfirmed(true)
    setTotpError('')
  }

  const generateTotpBindingQr = async () => {
    setTotpError('')

    if (!isTotpDeviceConfirmed) {
      setTotpError(t(language, 'setup.totp.confirmFirst'))
      return
    }

    setTotpLoading(true)
    try {
      const existingSecret = totpSecret.trim()

      if (existingSecret) {
        const normalizedDeviceName = totpDeviceName.trim().toUpperCase()
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(`LockIt - ${normalizedDeviceName}`)}?secret=${encodeURIComponent(existingSecret)}&issuer=${encodeURIComponent('LockIt')}`
        const qrcode = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 })
        setTotpDeviceName(normalizedDeviceName)
        setTotpQrCodeDataUrl(qrcode)
      } else {
        const { secret, otpauthUrl, deviceName } =
          await window.api.generateTOTPSecret(totpDeviceName)
        const qrcode = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 })

        setTotpSecret(secret)
        setTotpDeviceName(deviceName)
        setTotpQrCodeDataUrl(qrcode)
      }
    } catch (e) {
      console.error('Generate TOTP secret failed:', e)
      setTotpError(t(language, 'setup.totp.generateFailed'))
    } finally {
      setTotpLoading(false)
    }
  }

  const handleToggleTotp = async (enabled: boolean) => {
    setTotpEnabled(enabled)
    if (!enabled) {
      setTotpSecret('')
      setTotpQrCodeDataUrl('')
      setIsTotpDeviceConfirmed(false)
      setTotpError('')
    }
  }

  const updateDaySchedule = (day: keyof WeeklySchedule, updates: Partial<DaySchedule>) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...updates } }))
  }

  const addSlot = (day: keyof WeeklySchedule) => {
    const slots = schedule[day]?.slots ?? []
    updateDaySchedule(day, { slots: [...slots, { start: '09:00', end: '18:00' }] })
  }

  const updateSlot = (day: keyof WeeklySchedule, index: number, slot: TimeSlot) => {
    const slots = [...(schedule[day]?.slots ?? [])]
    slots[index] = slot
    updateDaySchedule(day, { slots })
  }

  const deleteSlot = (day: keyof WeeklySchedule, index: number) => {
    const slots = (schedule[day]?.slots ?? []).filter((_, i) => i !== index)
    updateDaySchedule(day, { slots })
  }

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      await window.api.saveConfig({
        password: {
          type: totpEnabled && totpSecret ? 'both' : 'fixed',
          fixedPassword,
          totpSecret: totpEnabled && totpSecret ? totpSecret : undefined,
          totpDeviceName: totpEnabled && totpSecret ? totpDeviceName : undefined
        },
        schedule,
        style,
        startup: {
          autoLaunch: autoLaunchSupported ? autoLaunch : false
        },
        language
      })
      await window.api.completeSetup()
    } catch (e) {
      console.error('Setup failed:', e)
      alert(t(language, 'common.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const steps = [
    t(language, 'setup.steps.welcome'),
    t(language, 'setup.steps.password'),
    t(language, 'setup.steps.totp'),
    t(language, 'setup.steps.schedule'),
    t(language, 'setup.steps.startup'),
    t(language, 'setup.steps.style'),
    t(language, 'setup.steps.done')
  ]

  return (
    <div className="h-dvh bg-neutral-50 text-neutral-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white border border-neutral-200">
        <header className="h-14 px-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-neutral-900" />
            <h1 className="text-sm font-medium">{t(language, 'setup.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
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
            <span className="text-xs text-neutral-500">
              {t(language, 'setup.step', { current: step + 1, total: steps.length })}
            </span>
          </div>
        </header>

        <div className="px-6 py-4 border-b border-neutral-200 flex gap-1">
          {steps.map((name, index) => (
            <div key={name} className="flex-1">
              <div className={`h-1 ${index <= step ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
              <p className="text-[11px] text-neutral-500 mt-1 truncate">{name}</p>
            </div>
          ))}
        </div>

        <main className="p-6 min-h-[460px]">
          {step === 0 && (
            <Card
              title={t(language, 'setup.welcome.title')}
              subtitle={t(language, 'setup.welcome.subtitle')}
            >
              <div className="space-y-3 text-sm text-neutral-700">
                <p>{t(language, 'setup.welcome.line1')}</p>
                <p>{t(language, 'setup.welcome.line2')}</p>
                <p>{t(language, 'setup.welcome.line3')}</p>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card
              title={t(language, 'setup.password.title')}
              subtitle={t(language, 'setup.password.subtitle')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1.5">
                    {t(language, 'setup.password.label')}
                  </label>
                  <Input
                    value={fixedPassword}
                    onChange={setFixedPassword}
                    placeholder={t(language, 'setup.password.placeholder')}
                    type="password"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1.5">
                    {t(language, 'setup.password.confirm')}
                  </label>
                  <Input
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder={t(language, 'setup.password.confirmPlaceholder')}
                    type="password"
                  />
                </div>
              </div>
              {passwordError && <p className="text-xs text-red-600 mt-3">{passwordError}</p>}
              {!passwordError && hasValidPassword && (
                <p className="text-xs text-green-600 mt-3">{t(language, 'setup.password.done')}</p>
              )}
              <div className="mt-4 p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 leading-5">
                {(() => {
                  if (language === 'en-US') {
                    return 'Security notice: Exiting the app and uninstalling both require current unlock credentials (Fixed PIN or TOTP, based on global config). Windows Task Manager force-kill is an OS-level action and cannot be blocked 100%; the app will try to auto-recover.'
                  }
                  if (language === 'ja-JP') {
                    return 'セキュリティ通知: アプリ終了とアンインストールはいずれも現在の解除認証（固定PINまたはTOTP、グローバル設定に準拠）が必要です。Windowsタスクマネージャーの強制終了はOSレベル操作のため100%遮断はできませんが、本アプリは自動復帰を試みます。'
                  }
                  if (language === 'ko-KR') {
                    return '보안 안내: 앱 종료와 제거는 모두 현재 잠금 해제 인증(고정 PIN 또는 TOTP, 전역 설정 기준)이 필요합니다. Windows 작업 관리자 강제 종료는 OS 수준 동작이라 100% 차단할 수 없으며, 앱은 자동 복구를 시도합니다.'
                  }
                  return '安全提示：退出软件与卸载程序都需要输入当前解锁凭据（固定密码或 TOTP，遵循全局配置）。Windows 任务管理器“结束任务”属于系统级强制终止，无法 100% 完全拦截，本软件会尽力自动拉起恢复。'
                })()}
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card
              title={t(language, 'setup.totp.title')}
              subtitle={t(language, 'setup.totp.subtitle')}
            >
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={totpEnabled}
                    onChange={(e) => void handleToggleTotp(e.target.checked)}
                  />
                  {t(language, 'setup.totp.enable')}
                </label>

                <div>
                  <label className="block text-xs text-neutral-600 mb-1.5">
                    {t(language, 'setup.totp.device')}
                  </label>
                  <Input
                    value={totpDeviceName}
                    onChange={(v) => {
                      if (isTotpDeviceLocked) return
                      setTotpDeviceName(v)
                      setIsTotpDeviceConfirmed(false)
                      setTotpQrCodeDataUrl('')
                      setTotpError('')
                    }}
                    placeholder={t(language, 'setup.totp.example')}
                    disabled={isTotpDeviceLocked}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={confirmTotpDeviceName}
                    disabled={!totpEnabled || totpLoading || isTotpDeviceLocked}
                  >
                    {isTotpDeviceLocked
                      ? t(language, 'setup.totp.locked')
                      : t(language, 'setup.totp.confirm')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void generateTotpBindingQr()}
                    disabled={!totpEnabled || totpLoading || !isTotpDeviceConfirmed}
                  >
                    {t(language, 'setup.totp.bind')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTotpVisible((v) => !v)}
                    disabled={!totpEnabled || !totpSecret}
                  >
                    {totpVisible
                      ? t(language, 'setup.totp.hideSecret')
                      : t(language, 'setup.totp.showSecret')}
                  </Button>
                </div>

                {totpLoading && (
                  <p className="text-xs text-neutral-500">{t(language, 'setup.totp.loading')}</p>
                )}
                {totpError && <p className="text-xs text-red-600">{totpError}</p>}

                {isTotpDeviceConfirmed && (
                  <p className="text-xs text-neutral-500">
                    {t(language, 'setup.totp.currentName', { name: totpDeviceName })}
                  </p>
                )}

                {totpEnabled && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200">
                    <p className="text-xs text-neutral-500 mb-1">
                      {t(language, 'setup.totp.secret')}
                    </p>
                    <p className="text-sm font-mono break-all">
                      {totpSecret
                        ? totpVisible
                          ? totpSecret
                          : '••••••••••••••••••••••••••••••••'
                        : t(language, 'setup.totp.notGenerated')}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      {t(language, 'setup.totp.manual')}
                    </p>
                  </div>
                )}

                {totpQrCodeDataUrl && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 inline-block">
                    <p className="text-xs text-neutral-500 mb-2">
                      {t(language, 'setup.totp.scan')}
                    </p>
                    <img
                      src={totpQrCodeDataUrl}
                      alt={t(language, 'setup.totp.qrAlt')}
                      className="w-56 h-56"
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card
              title={t(language, 'setup.schedule.title')}
              subtitle={t(language, 'setup.schedule.subtitle')}
            >
              <div className="grid grid-cols-[220px_1fr] gap-4">
                <div className="space-y-1">
                  {dayNames.map(({ key, label, short }) => {
                    const isSelected = key === selectedDay
                    const enabled = schedule[key].enabled
                    const count = schedule[key].slots.length
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white border-neutral-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{short}</span>
                          <span>{label}</span>
                        </span>
                        <span
                          className={`text-xs ${isSelected ? 'text-white/80' : 'text-neutral-500'}`}
                        >
                          {enabled ? count : t(language, 'setup.schedule.off')}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={schedule[selectedDay].enabled}
                        onChange={(e) =>
                          updateDaySchedule(selectedDay, { enabled: e.target.checked })
                        }
                      />
                      {t(language, 'setup.schedule.enableDay', {
                        day: dayNames.find((d) => d.key === selectedDay)?.label || ''
                      })}
                    </label>
                    {schedule[selectedDay].enabled && (
                      <Button size="sm" onClick={() => addSlot(selectedDay)}>
                        <Calendar className="w-4 h-4 mr-1" />
                        {t(language, 'setup.schedule.addSlot')}
                      </Button>
                    )}
                  </div>

                  {schedule[selectedDay].enabled ? (
                    <div className="space-y-2">
                      {schedule[selectedDay].slots.length === 0 ? (
                        <p className="text-xs text-neutral-500">
                          {t(language, 'setup.schedule.none')}
                        </p>
                      ) : (
                        schedule[selectedDay].slots.map((slot, index) => (
                          <div key={`${selectedDay}-${index}`} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                updateSlot(selectedDay, index, { ...slot, start: e.target.value })
                              }
                              className="px-2 py-1.5 border border-neutral-300 text-sm"
                            />
                            <span className="text-neutral-400">—</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                updateSlot(selectedDay, index, { ...slot, end: e.target.value })
                              }
                              className="px-2 py-1.5 border border-neutral-300 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSlot(selectedDay, index)}
                            >
                              {t(language, 'setup.schedule.delete')}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      {t(language, 'setup.schedule.dayDisabled')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card
              title={t(language, 'setup.startup.title')}
              subtitle={t(language, 'setup.startup.subtitle')}
            >
              <div className="space-y-4 text-sm text-neutral-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoLaunchSupported ? autoLaunch : false}
                    onChange={(e) => setAutoLaunch(e.target.checked)}
                    disabled={!autoLaunchSupported}
                  />
                  {t(language, 'setup.startup.enable')}
                </label>
                {!autoLaunchSupported && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
                    {t(language, 'setup.startup.unsupported', { platform: platform || 'unknown' })}
                  </p>
                )}
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card
              title={t(language, 'setup.style.title')}
              subtitle={t(language, 'setup.style.subtitle')}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">
                      {t(language, 'setup.style.center')}
                    </label>
                    <Input
                      value={style.centerText}
                      onChange={(v) => setStyle((s) => ({ ...s, centerText: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">
                      {t(language, 'setup.style.sub')}
                    </label>
                    <Input
                      value={style.subText}
                      onChange={(v) => setStyle((s) => ({ ...s, subText: v }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">
                      {t(language, 'setup.style.left')}
                    </label>
                    <Input
                      value={style.bottomLeftText}
                      onChange={(v) => setStyle((s) => ({ ...s, bottomLeftText: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">
                      {t(language, 'setup.style.right')}
                    </label>
                    <Input
                      value={style.bottomRightText}
                      onChange={(v) => setStyle((s) => ({ ...s, bottomRightText: v }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">
                      {t(language, 'setup.style.bg')}
                    </label>
                    <Input
                      value={style.backgroundColor}
                      onChange={(v) => setStyle((s) => ({ ...s, backgroundColor: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">
                      {t(language, 'setup.style.text')}
                    </label>
                    <Input
                      value={style.textColor}
                      onChange={(v) => setStyle((s) => ({ ...s, textColor: v }))}
                    />
                  </div>
                </div>

                <div
                  className="p-6"
                  style={{ backgroundColor: style.backgroundColor, color: style.textColor }}
                >
                  <p className="text-2xl font-medium text-center whitespace-pre-line">
                    {style.centerText}
                  </p>
                  <p className="text-lg mt-2 text-center whitespace-pre-line opacity-90">
                    {style.subText}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-6 text-sm opacity-70">
                    <span className="whitespace-pre-line">{style.bottomLeftText}</span>
                    <span className="text-right whitespace-pre-line">{style.bottomRightText}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {step === 6 && (
            <Card
              title={t(language, 'setup.done.title')}
              subtitle={t(language, 'setup.done.subtitle')}
            >
              <div className="text-sm text-neutral-700 space-y-2">
                <p>{t(language, 'setup.done.fixed')}</p>
                <p>
                  {t(language, 'setup.done.totp', {
                    status:
                      totpEnabled && totpSecret
                        ? t(language, 'setup.done.totpOn')
                        : t(language, 'setup.done.totpOff')
                  })}
                </p>
                <p>{t(language, 'setup.done.schedule')}</p>
                <p>
                  {t(language, 'setup.done.startup', {
                    status: autoLaunchSupported
                      ? autoLaunch
                        ? t(language, 'setup.done.startupOn')
                        : t(language, 'setup.done.startupOff')
                      : t(language, 'setup.done.startupUnsupported')
                  })}
                </p>
                <p>{t(language, 'setup.done.style')}</p>
              </div>
            </Card>
          )}
        </main>

        <footer className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || isSaving}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t(language, 'setup.prev')}
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed() || isSaving}>
              {t(language, 'setup.next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => void handleComplete()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  {t(language, 'common.saving')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  {t(language, 'setup.finish')}
                </>
              )}
            </Button>
          )}
        </footer>
      </div>

      {isSaving && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white border border-neutral-200 px-6 py-4 text-sm text-neutral-700 flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            {t(language, 'setup.savingInit')}
          </div>
        </div>
      )}
    </div>
  )
}
