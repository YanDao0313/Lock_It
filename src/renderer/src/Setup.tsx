import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Shield, Calendar, KeyRound } from 'lucide-react'
import QRCode from 'qrcode'

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

const dayNames: { key: keyof WeeklySchedule; label: string; short: string }[] = [
  { key: 'monday', label: '周一', short: '一' },
  { key: 'tuesday', label: '周二', short: '二' },
  { key: 'wednesday', label: '周三', short: '三' },
  { key: 'thursday', label: '周四', short: '四' },
  { key: 'friday', label: '周五', short: '五' },
  { key: 'saturday', label: '周六', short: '六' },
  { key: 'sunday', label: '周日', short: '日' }
]

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
  backgroundColor: '#0066cc',
  textColor: '#ffffff',
  lightBackgroundColor: '#fafafa',
  lightTextColor: '#171717',
  timePosition: 'hidden',
  timeFormat: 'HH:mm:ss',
  closeScreenPrompt: '请关闭班级大屏后再继续操作',
  fontSizes: { centerText: 48, subText: 24, bottomText: 14, timeText: 18 },
  textAligns: { centerText: 'center', subText: 'center', bottomText: 'center' },
  fontWeights: { centerText: 'medium', subText: 'normal', bottomText: 'normal' }
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
    secondary: 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
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
  const [step, setStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

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

  const passwordError = useMemo(() => {
    if (!fixedPassword && !confirmPassword) return ''
    if (!/^\d{6}$/.test(fixedPassword)) return '固定密码必须是6位数字'
    if (confirmPassword && fixedPassword !== confirmPassword) return '两次输入的固定密码不一致'
    return ''
  }, [fixedPassword, confirmPassword])

  const hasValidPassword = /^\d{6}$/.test(fixedPassword) && fixedPassword === confirmPassword

  const hasAnyEnabledSchedule = Object.values(schedule).some((d) => d.enabled && d.slots.length > 0)
  const normalizedTotpDeviceName = totpDeviceName.trim().toUpperCase()
  const isTotpDeviceLocked = isTotpDeviceConfirmed || Boolean(totpSecret.trim())

  const canProceed = () => {
    if (step === 1) return hasValidPassword
    if (step === 2) return !totpEnabled || (!!totpSecret && !!totpQrCodeDataUrl)
    if (step === 3) return hasAnyEnabledSchedule
    return true
  }

  const confirmTotpDeviceName = () => {
    const normalized = normalizedTotpDeviceName
    if (!normalized) {
      setTotpError('设备标识名称不能为空')
      return
    }

    if (isTotpDeviceLocked) {
      return
    }

    const confirmed = window.confirm(`确认将设备标识锁定为“${normalized}”吗？锁定后不可更改。`)
    if (!confirmed) return

    setTotpDeviceName(normalized)
    setIsTotpDeviceConfirmed(true)
    setTotpError('')
  }

  const generateTotpBindingQr = async () => {
    setTotpError('')

    if (!isTotpDeviceConfirmed) {
      setTotpError('请先确认设备标识名称，再进行扫码绑定')
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
        const { secret, otpauthUrl, deviceName } = await window.api.generateTOTPSecret(totpDeviceName)
        const qrcode = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 })

        setTotpSecret(secret)
        setTotpDeviceName(deviceName)
        setTotpQrCodeDataUrl(qrcode)
      }
    } catch (e) {
      console.error('Generate TOTP secret failed:', e)
      setTotpError('生成 TOTP 密钥失败，请重试')
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
        style
      })
      await window.api.completeSetup()
    } catch (e) {
      console.error('Setup failed:', e)
      alert('保存配置失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const steps = ['欢迎', '固定密码', '可选TOTP', '锁屏时段', '界面样式', '完成']

  return (
    <div className="h-dvh bg-neutral-50 text-neutral-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white border border-neutral-200">
        <header className="h-14 px-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-neutral-900" />
            <h1 className="text-sm font-medium">首次配置向导</h1>
          </div>
          <span className="text-xs text-neutral-500">
            第 {step + 1} / {steps.length} 步
          </span>
        </header>

        <div className="px-6 py-4 border-b border-neutral-200 flex gap-1">
          {steps.map((name, index) => (
            <div key={name} className="flex-1">
              <div
                className={`h-1 ${index <= step ? 'bg-neutral-900' : 'bg-neutral-200'}`}
              />
              <p className="text-[11px] text-neutral-500 mt-1 truncate">{name}</p>
            </div>
          ))}
        </div>

        <main className="p-6 min-h-[460px]">
          {step === 0 && (
            <Card title="欢迎" subtitle="完成以下步骤即可开始使用">
              <div className="space-y-3 text-sm text-neutral-700">
                <p>• 必须设置固定密码（6位数字）</p>
                <p>• 可选配置 TOTP 动态密码，增强安全性</p>
                <p>• 设置锁屏时段与锁屏界面文案</p>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card title="固定密码（必填）" subtitle="固定密码是必选项，后续可叠加 TOTP">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1.5">固定密码</label>
                  <Input value={fixedPassword} onChange={setFixedPassword} placeholder="输入6位数字" type="password" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1.5">确认固定密码</label>
                  <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入6位数字" type="password" />
                </div>
              </div>
              {passwordError && <p className="text-xs text-red-600 mt-3">{passwordError}</p>}
              {!passwordError && hasValidPassword && (
                <p className="text-xs text-green-600 mt-3">固定密码设置完成</p>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title="TOTP 动态密码（可选）" subtitle="开启后可通过固定密码或 TOTP 任一方式解锁">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={totpEnabled}
                    onChange={(e) => void handleToggleTotp(e.target.checked)}
                  />
                  启用 TOTP 动态密码
                </label>

                <div>
                  <label className="block text-xs text-neutral-600 mb-1.5">设备标识名称</label>
                  <Input
                    value={totpDeviceName}
                    onChange={(v) => {
                      if (isTotpDeviceLocked) return
                      setTotpDeviceName(v)
                      setIsTotpDeviceConfirmed(false)
                      setTotpQrCodeDataUrl('')
                      setTotpError('')
                    }}
                    placeholder="例如 A1B2"
                    disabled={isTotpDeviceLocked}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={confirmTotpDeviceName}
                    disabled={!totpEnabled || totpLoading || isTotpDeviceLocked}
                  >
                    {isTotpDeviceLocked ? '设备标识已锁定' : '确认设备标识'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void generateTotpBindingQr()}
                    disabled={!totpEnabled || totpLoading || !isTotpDeviceConfirmed}
                  >
                    扫码绑定
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTotpVisible((v) => !v)}
                    disabled={!totpEnabled || !totpSecret}
                  >
                    {totpVisible ? '隐藏密钥' : '显示密钥'}
                  </Button>
                </div>

                {totpLoading && <p className="text-xs text-neutral-500">正在生成密钥...</p>}
                {totpError && <p className="text-xs text-red-600">{totpError}</p>}

                {isTotpDeviceConfirmed && (
                  <p className="text-xs text-neutral-500">当前设备名称：LockIt - {totpDeviceName}</p>
                )}

                {totpEnabled && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200">
                    <p className="text-xs text-neutral-500 mb-1">TOTP 密钥</p>
                    <p className="text-sm font-mono break-all">
                      {totpSecret ? (totpVisible ? totpSecret : '••••••••••••••••••••••••••••••••') : '尚未生成'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">可在认证器应用中手动添加该密钥</p>
                  </div>
                )}

                {totpQrCodeDataUrl && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 inline-block">
                    <p className="text-xs text-neutral-500 mb-2">请使用认证器应用扫码</p>
                    <img src={totpQrCodeDataUrl} alt="TOTP 绑定二维码" className="w-56 h-56" />
                  </div>
                )}
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card title="锁屏时段" subtitle="至少启用一个日期并添加时段">
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
                          isSelected ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{short}</span>
                          <span>{label}</span>
                        </span>
                        <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-neutral-500'}`}>
                          {enabled ? count : '关'}
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
                        onChange={(e) => updateDaySchedule(selectedDay, { enabled: e.target.checked })}
                      />
                      启用 {dayNames.find((d) => d.key === selectedDay)?.label}
                    </label>
                    {schedule[selectedDay].enabled && (
                      <Button size="sm" onClick={() => addSlot(selectedDay)}>
                        <Calendar className="w-4 h-4 mr-1" />
                        添加时段
                      </Button>
                    )}
                  </div>

                  {schedule[selectedDay].enabled ? (
                    <div className="space-y-2">
                      {schedule[selectedDay].slots.length === 0 ? (
                        <p className="text-xs text-neutral-500">暂无时段，请添加至少一个时段</p>
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
                            <Button variant="ghost" size="sm" onClick={() => deleteSlot(selectedDay, index)}>
                              删除
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">当前日期未启用锁屏</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card title="界面样式" subtitle="与设置页字段保持一致，可在设置页继续精细调整">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">主标题</label>
                    <Input value={style.centerText} onChange={(v) => setStyle((s) => ({ ...s, centerText: v }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">副标题</label>
                    <Input value={style.subText} onChange={(v) => setStyle((s) => ({ ...s, subText: v }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">左下角文字</label>
                    <Input
                      value={style.bottomLeftText}
                      onChange={(v) => setStyle((s) => ({ ...s, bottomLeftText: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">右下角文字</label>
                    <Input
                      value={style.bottomRightText}
                      onChange={(v) => setStyle((s) => ({ ...s, bottomRightText: v }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">背景色</label>
                    <Input
                      value={style.backgroundColor}
                      onChange={(v) => setStyle((s) => ({ ...s, backgroundColor: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">文字色</label>
                    <Input value={style.textColor} onChange={(v) => setStyle((s) => ({ ...s, textColor: v }))} />
                  </div>
                </div>

                <div className="p-6" style={{ backgroundColor: style.backgroundColor, color: style.textColor }}>
                  <p className="text-2xl font-medium text-center whitespace-pre-line">{style.centerText}</p>
                  <p className="text-lg mt-2 text-center whitespace-pre-line opacity-90">{style.subText}</p>
                  <div className="grid grid-cols-2 gap-2 mt-6 text-sm opacity-70">
                    <span className="whitespace-pre-line">{style.bottomLeftText}</span>
                    <span className="text-right whitespace-pre-line">{style.bottomRightText}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card title="配置完成" subtitle="点击下方按钮保存并进入设置页面">
              <div className="text-sm text-neutral-700 space-y-2">
                <p>固定密码：已配置</p>
                <p>TOTP：{totpEnabled && totpSecret ? '已启用（与固定密码任一可解锁）' : '未启用'}</p>
                <p>锁屏时段：已配置</p>
                <p>界面样式：已配置</p>
              </div>
            </Card>
          )}
        </main>

        <footer className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || isSaving}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一步
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed() || isSaving}>
              下一步
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => void handleComplete()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  保存中
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  完成并进入设置
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
            正在保存配置并初始化...
          </div>
        </div>
      )}
    </div>
  )
}
