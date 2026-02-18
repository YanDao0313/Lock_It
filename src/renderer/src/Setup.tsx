import { useState, useEffect } from 'react'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  Shield,
  Calendar,
  Palette,
  Plus,
  Trash2,
  Monitor,
  Moon,
  Sun
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

interface StyleConfig {
  themeMode: 'light' | 'dark' | 'system'
  centerText: string
  subText: string
  bottomLeftText: string
  bottomRightText: string
  backgroundColor: string
  textColor: string
  timePosition: 'hidden' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  timeFormat: string
  closeScreenPrompt: string
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

const defaultSchedule = (): WeeklySchedule => ({
  monday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  friday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] }
})

// ============================================================================
// 步骤指示器
// ============================================================================
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < currentStep
              ? 'w-8 bg-blue-600'
              : i === currentStep
                ? 'w-8 bg-blue-400'
                : 'w-2 bg-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

// ============================================================================
// 步骤 1: 欢迎
// ============================================================================
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
        <Shield className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-2xl font-medium text-gray-800 mb-3">欢迎使用 Lock It</h1>
      <p className="text-gray-600 mb-8 max-w-sm">智能锁屏助手，帮助您在指定时间段自动锁定屏幕</p>
      <div className="space-y-2 text-left bg-gray-50 p-4 rounded-lg mb-8 text-sm">
        <div className="flex items-center gap-3 text-gray-700">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>按周设置锁屏时间段</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <Shield className="w-4 h-4 text-green-600" />
          <span>6位数字密码保护</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <Palette className="w-4 h-4 text-purple-600" />
          <span>自定义锁屏界面样式</span>
        </div>
      </div>
      <button
        onClick={onNext}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
      >
        开始配置
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================================
// 步骤 2: 密码设置
// ============================================================================
function PasswordStep({
  password,
  onChange
}: {
  password: string
  onChange: (pwd: string) => void
}) {
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handlePasswordChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      onChange(value)
      setError('')
    }
  }

  const handleConfirmChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setConfirmPassword(value)
      setError('')
    }
  }

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setError('两次输入的密码不一致')
    } else if (password.length > 0 && password.length < 6) {
      setError('密码需要6位数字')
    } else {
      setError('')
    }
  }, [password, confirmPassword])

  const isValid = password.length === 6 && password === confirmPassword

  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-6">
        <h2 className="text-xl font-medium text-gray-800 mb-1">设置解锁密码</h2>
        <p className="text-gray-500 text-sm">设置6位数字密码用于解锁屏幕</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-5">
          {/* 密码输入 */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">输入密码</label>
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`w-10 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold transition-colors ${
                    i < password.length
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-300'
                  }`}
                >
                  {password[i] ? '●' : ''}
                </div>
              ))}
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className="absolute opacity-0 w-0 h-0"
              autoFocus
              id="password-input"
            />
            <button
              onClick={() => document.getElementById('password-input')?.focus()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 w-full text-center"
            >
              点击输入密码
            </button>
          </div>

          {/* 确认密码 */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">确认密码</label>
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`w-10 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold transition-colors ${
                    i < confirmPassword.length
                      ? confirmPassword === password
                        ? 'border-green-500 bg-green-50 text-green-600'
                        : 'border-red-500 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-300'
                  }`}
                >
                  {confirmPassword[i] ? '●' : ''}
                </div>
              ))}
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPassword}
              onChange={(e) => handleConfirmChange(e.target.value)}
              className="absolute opacity-0 w-0 h-0"
              id="confirm-password-input"
            />
            <button
              onClick={() => document.getElementById('confirm-password-input')?.focus()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 w-full text-center"
            >
              点击确认密码
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
              {error}
            </div>
          )}

          {isValid && (
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 py-2 rounded-lg">
              <Check className="w-4 h-4" />
              <span className="text-sm">密码设置成功</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 时间段配置组件
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
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={slot.start}
        onChange={(e) => onChange({ ...slot, start: e.target.value })}
        className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
      />
      <span className="text-gray-400">-</span>
      <input
        type="time"
        value={slot.end}
        onChange={(e) => onChange({ ...slot, end: e.target.value })}
        className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================================
// 步骤 3: 锁屏时段配置
// ============================================================================
function ScheduleStep({
  schedule,
  onChange
}: {
  schedule: WeeklySchedule
  onChange: (s: WeeklySchedule) => void
}) {
  const [selectedDay, setSelectedDay] = useState<keyof WeeklySchedule>('monday')

  const updateDaySchedule = (day: keyof WeeklySchedule, updates: Partial<DaySchedule>) => {
    onChange({
      ...schedule,
      [day]: { ...schedule[day], ...updates }
    })
  }

  const addSlot = (day: keyof WeeklySchedule) => {
    const currentSlots = schedule[day]?.slots ?? []
    const newSlot: TimeSlot = { start: '09:00', end: '18:00' }
    updateDaySchedule(day, { slots: [...currentSlots, newSlot] })
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

  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-4">
        <h2 className="text-xl font-medium text-gray-800 mb-1">配置锁屏时段</h2>
        <p className="text-gray-500 text-sm">选择日期并设置当天的锁屏时间段</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：星期选择 */}
        <div className="w-40 flex flex-col gap-1">
          {dayNames.map(({ key, label, short }) => {
            const daySchedule = schedule[key]
            const isEnabled = daySchedule?.enabled ?? false
            const slotCount = daySchedule?.slots?.length ?? 0
            const isSelected = selectedDay === key

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                      isSelected
                        ? 'bg-white/20'
                        : isEnabled
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {short}
                  </span>
                  <span>{label}</span>
                </div>
                {isEnabled && slotCount > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}
                  >
                    {slotCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 右侧：时段配置 */}
        <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-gray-800">
                {dayNames.find((d) => d.key === selectedDay)?.label}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedule[selectedDay]?.enabled ?? false}
                  onChange={(e) => updateDaySchedule(selectedDay, { enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">启用</span>
              </label>
            </div>
            {(schedule[selectedDay]?.enabled ?? false) && (
              <button
                onClick={() => addSlot(selectedDay)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
            )}
          </div>

          {(schedule[selectedDay]?.enabled ?? false) ? (
            <div className="space-y-2">
              {(schedule[selectedDay]?.slots ?? []).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无时段</p>
                  <button
                    onClick={() => addSlot(selectedDay)}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    添加时段
                  </button>
                </div>
              ) : (
                (schedule[selectedDay]?.slots ?? []).map((slot, index) => (
                  <TimeSlotEditor
                    key={index}
                    slot={slot}
                    onChange={(s) => updateSlot(selectedDay, index, s)}
                    onDelete={() => deleteSlot(selectedDay, index)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>该日期未启用锁屏</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 步骤 4: 样式设置
// ============================================================================
function StyleStep({
  style,
  onChange
}: {
  style: StyleConfig
  onChange: (s: StyleConfig) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-4">
        <h2 className="text-xl font-medium text-gray-800 mb-1">自定义锁屏样式</h2>
        <p className="text-gray-500 text-sm">设置锁屏界面的外观和文字</p>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* 主题模式 */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">主题模式</label>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...style, themeMode: 'light' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                style.themeMode === 'light'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              浅色
            </button>
            <button
              onClick={() => onChange({ ...style, themeMode: 'dark' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                style.themeMode === 'dark'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              深色
            </button>
            <button
              onClick={() => onChange({ ...style, themeMode: 'system' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                style.themeMode === 'system'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              跟随系统
            </button>
          </div>
        </div>

        {/* 颜色 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-2">背景色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => onChange({ ...style, backgroundColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={style.backgroundColor}
                onChange={(e) => onChange({ ...style, backgroundColor: e.target.value })}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">文字色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => onChange({ ...style, textColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={style.textColor}
                onChange={(e) => onChange({ ...style, textColor: e.target.value })}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 文字内容 */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">主标题</label>
            <input
              type="text"
              value={style.centerText}
              onChange={(e) => onChange({ ...style, centerText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">副标题</label>
            <input
              type="text"
              value={style.subText}
              onChange={(e) => onChange({ ...style, subText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">左下角文字</label>
              <input
                type="text"
                value={style.bottomLeftText}
                onChange={(e) => onChange({ ...style, bottomLeftText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">右下角文字</label>
              <input
                type="text"
                value={style.bottomRightText}
                onChange={(e) => onChange({ ...style, bottomRightText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 预览 */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">预览</label>
          <div
            className="rounded-lg p-4 text-center"
            style={{ backgroundColor: style.backgroundColor, color: style.textColor }}
          >
            <div className="text-base font-medium">{style.centerText || '主标题'}</div>
            <div className="text-sm mt-1 opacity-80">{style.subText || '副标题'}</div>
            <div className="flex justify-between mt-4 text-xs opacity-60">
              <span>{style.bottomLeftText}</span>
              <span>{style.bottomRightText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 步骤 5: 完成
// ============================================================================
function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6">
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-medium text-gray-800 mb-3">配置完成！</h2>
      <p className="text-gray-600 mb-8 max-w-sm text-sm">
        Lock It 将在后台运行，在配置的时段自动锁定屏幕。
      </p>
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        开始使用
      </button>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================
export default function Setup() {
  const [step, setStep] = useState(0)
  const [password, setPassword] = useState('')
  const [schedule, setSchedule] = useState<WeeklySchedule>(defaultSchedule())
  const [style, setStyle] = useState<StyleConfig>({
    themeMode: 'dark',
    centerText: '此计算机因违规外联已被阻断',
    subText: '请等待安全部门与你联系',
    bottomLeftText: '保密委员会办公室',
    bottomRightText: '',
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    timePosition: 'hidden',
    timeFormat: 'HH:mm:ss',
    closeScreenPrompt: '请关闭班级大屏后再继续操作'
  })
  const [isLoading, setIsLoading] = useState(false)

  const steps = [
    { title: '欢迎', component: WelcomeStep },
    { title: '密码', component: PasswordStep },
    { title: '时段', component: ScheduleStep },
    { title: '样式', component: StyleStep },
    { title: '完成', component: CompleteStep }
  ]

  const canProceed = () => {
    switch (step) {
      case 1:
        return password.length === 6
      case 2:
        return Object.values(schedule).some((day) => day.enabled && day.slots.length > 0)
      default:
        return true
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await window.api.saveConfig({
        password: { type: 'fixed', fixedPassword: password },
        schedule,
        style
      })
      await window.api.completeSetup()
    } catch (error) {
      console.error('Setup failed:', error)
      alert('配置保存失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          {/* 步骤指示器 */}
          <StepIndicator currentStep={step} totalSteps={steps.length} />

          {/* 步骤内容 */}
          <div className="h-[400px]">
            {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
            {step === 1 && <PasswordStep password={password} onChange={setPassword} />}
            {step === 2 && <ScheduleStep schedule={schedule} onChange={setSchedule} />}
            {step === 3 && <StyleStep style={style} onChange={setStyle} />}
            {step === 4 && <CompleteStep onComplete={handleComplete} />}
          </div>

          {/* 导航按钮 */}
          {step > 0 && step < 4 && (
            <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-600 text-sm">正在保存配置...</p>
          </div>
        </div>
      )}
    </div>
  )
}
