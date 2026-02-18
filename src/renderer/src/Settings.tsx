import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Save,
  Lock,
  Clock,
  Palette,
  Plus,
  Trash2,
  Check,
  Shield,
  Monitor,
  Moon,
  Sun,
  Camera,
  Layout,
  Type,
  Image,
  X,
  AlertCircle,
  Download,
  Settings2
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
}

interface PasswordConfig {
  type: 'fixed' | 'totp' | 'both'
  fixedPassword?: string
}

interface UnlockRecord {
  id: string
  timestamp: number
  success: boolean
  attemptCount: number
  photoData?: string
  photoPath?: string
  error?: string
}

interface CameraDevice {
  deviceId: string
  label: string
}

// ============================================================================
// 预置主题 - 支持浅色/深色配色
// ============================================================================
const presetThemes = [
  {
    name: '蓝色警告',
    themeMode: 'custom' as const,
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    lightBackgroundColor: '#dbeafe',
    lightTextColor: '#1e40af',
    centerText: '此计算机因违规外联已被阻断',
    subText: '请等待安全部门与你联系'
  },
  {
    name: '红色警告',
    themeMode: 'custom' as const,
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    lightBackgroundColor: '#fee2e2',
    lightTextColor: '#991b1b',
    centerText: '系统已被锁定',
    subText: '未经授权禁止操作'
  },
  {
    name: '黑色严肃',
    themeMode: 'custom' as const,
    backgroundColor: '#0f172a',
    textColor: '#f8fafc',
    lightBackgroundColor: '#f1f5f9',
    lightTextColor: '#0f172a',
    centerText: '计算机已被安全锁定',
    subText: '请联系管理员解锁'
  },
  {
    name: '深色模式',
    themeMode: 'dark' as const,
    backgroundColor: '#1e293b',
    textColor: '#e2e8f0',
    lightBackgroundColor: '#f8fafc',
    lightTextColor: '#1e293b',
    centerText: '屏幕已锁定',
    subText: '请输入密码解锁'
  },
  {
    name: '浅色模式',
    themeMode: 'light' as const,
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    lightBackgroundColor: '#ffffff',
    lightTextColor: '#1f2937',
    centerText: '设备已锁定',
    subText: '点击屏幕解锁'
  },
  {
    name: '绿色安全',
    themeMode: 'custom' as const,
    backgroundColor: '#065f46',
    textColor: '#d1fae5',
    lightBackgroundColor: '#d1fae5',
    lightTextColor: '#065f46',
    centerText: '系统保护中',
    subText: '正在进行安全检查'
  }
]

const timePositionOptions = [
  { value: 'hidden', label: '隐藏' },
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-right', label: '右下角' },
  { value: 'center', label: '居中（标题上方）' }
]

const timeFormatOptions = [
  { value: 'HH:mm:ss', label: '24小时制带秒 (14:30:25)' },
  { value: 'HH:mm', label: '24小时制 (14:30)' },
  { value: 'hh:mm:ss A', label: '12小时制带秒 (02:30:25 PM)' },
  { value: 'hh:mm A', label: '12小时制 (02:30 PM)' },
  { value: 'YYYY-MM-DD HH:mm', label: '完整日期时间 (2024-01-15 14:30)' }
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    if (newPassword.length !== 6) {
      setError('密码必须为6位数字')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
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
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">当前密码</span>
          <span className="text-sm font-medium">••••••</span>
        </div>
        <button
          onClick={() => setShowChangeForm(!showChangeForm)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showChangeForm ? '取消' : '修改'}
        </button>
      </div>

      {showChangeForm && (
        <div className="p-4 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">新密码（6位数字）</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPassword}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setNewPassword(e.target.value)
                  setError('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="输入6位数字"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPassword}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setConfirmPassword(e.target.value)
                  setError('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="再次输入"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">密码修改成功</p>}

          <button
            onClick={handleSave}
            disabled={!newPassword || !confirmPassword}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            保存
          </button>
        </div>
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<UnlockRecord | null>(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await window.api.getUnlockRecords()
      setRecords(data || [])
      setCurrentIndex(0)
    } catch (e) {
      console.error('Failed to load records:', e)
      setError('加载记录失败')
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
      if (selectedRecord?.id === id) {
        setSelectedRecord(null)
      }
      if (currentIndex >= records.length - 1) {
        setCurrentIndex(Math.max(0, records.length - 2))
      }
    } catch (e) {
      console.error('Failed to delete record:', e)
      alert('删除失败')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有记录吗？此操作不可恢复。')) return
    try {
      await window.api.clearUnlockRecords()
      setRecords([])
      setCurrentIndex(0)
      setSelectedRecord(null)
    } catch (e) {
      console.error('Failed to clear records:', e)
      alert('清空失败')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const successRecords = records.filter((r) => r.success)
  const failRecords = records.filter((r) => !r.success)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>{error}</p>
        <button
          onClick={loadRecords}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Image className="w-16 h-16 mb-4 opacity-50" />
        <p>暂无解锁记录</p>
        <p className="text-sm mt-1">解锁时会自动拍摄照片并记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{records.length}</p>
          <p className="text-xs text-gray-600">总记录</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{successRecords.length}</p>
          <p className="text-xs text-gray-600">成功解锁</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{failRecords.length}</p>
          <p className="text-xs text-gray-600">密码错误</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">共 {records.length} 条记录（最多保留100条）</p>
        <button
          onClick={handleClearAll}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          清空所有
        </button>
      </div>

      {/* 记录列表 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          {records.map((record) => (
            <div
              key={record.id}
              onClick={() => setSelectedRecord(record)}
              className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer
                hover:bg-gray-50 transition-colors ${selectedRecord?.id === record.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* 缩略图或占位符 */}
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {record.photoData ? (
                    <img
                      src={record.photoData}
                      alt="解锁照片"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium
                      ${record.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {record.success ? '成功' : '失败'}
                    </span>
                    <span className="text-xs text-gray-500">第 {record.attemptCount} 次尝试</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {formatTime(record.timestamp)}
                  </p>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(record.id)
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 照片详情弹窗 */}
      {selectedRecord && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-xl overflow-hidden max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium
                  ${selectedRecord.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {selectedRecord.success ? '解锁成功' : '密码错误'}
                </span>
                <span className="text-sm text-gray-500">
                  第 {selectedRecord.attemptCount} 次尝试
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 照片 */}
            <div className="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-hidden">
              {selectedRecord.photoData ? (
                <img
                  src={selectedRecord.photoData}
                  alt="解锁照片"
                  className="max-w-full max-h-[50vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>没有照片</p>
                  {selectedRecord.error && (
                    <p className="text-sm mt-2 text-red-400">{selectedRecord.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="p-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">时间</p>
                  <p className="font-medium">{formatTime(selectedRecord.timestamp)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">状态</p>
                  <p className="font-medium">{selectedRecord.success ? '解锁成功' : '密码错误'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">尝试次数</p>
                  <p className="font-medium">第 {selectedRecord.attemptCount} 次</p>
                </div>
                {selectedRecord.error && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">错误信息</p>
                    <p className="font-medium text-red-600">{selectedRecord.error}</p>
                  </div>
                )}
              </div>

              {selectedRecord.photoData && (
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = selectedRecord.photoData!
                    link.download = `unlock-${selectedRecord.id}.jpg`
                    link.click()
                  }}
                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                    text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载照片
                </button>
              )}
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
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const loadCameras = useCallback(async () => {
    setLoading(true)
    setPermissionDenied(false)
    try {
      // 先请求权限
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())

      // 获取设备列表
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `摄像头 ${device.deviceId.slice(0, 8)}...`
        }))

      setCameras(videoDevices)

      // 如果没有选中相机且组件仍挂载，默认选第一个
      if (!selectedCamera && videoDevices.length > 0) {
        // 使用函数式更新避免依赖问题
        onChange(videoDevices[0].deviceId)
      }
    } catch (e) {
      console.error('Failed to get cameras:', e)
      if ((e as Error).name === 'NotAllowedError') {
        setPermissionDenied(true)
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadCameras()

    // 监听设备变化
    navigator.mediaDevices.addEventListener('devicechange', loadCameras)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadCameras)
    }
  }, [loadCameras])

  // 预览选中的相机
  useEffect(() => {
    if (!selectedCamera) return

    let stream: MediaStream | null = null

    const startPreview = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } }
        })
        setPreviewStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (e) {
        console.error('Failed to start preview:', e)
      }
    }

    startPreview()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      setPreviewStream(null)
    }
  }, [selectedCamera])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700">摄像头权限被拒绝</p>
        <p className="text-xs text-red-600 mt-1">请在系统设置中允许应用访问摄像头</p>
        <button
          onClick={loadCameras}
          className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  if (cameras.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg text-center">
        <Camera className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-sm text-yellow-800">未找到摄像头设备</p>
        <button
          onClick={loadCameras}
          className="mt-3 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm transition-colors"
        >
          刷新
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 预览窗口 */}
      <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
        {selectedCamera ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span>请选择摄像头</span>
          </div>
        )}
        {previewStream && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
            预览中
          </div>
        )}
      </div>

      {/* 相机列表 */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600">选择摄像头</label>
        <div className="space-y-2">
          {cameras.map((camera) => (
            <label
              key={camera.deviceId}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${selectedCamera === camera.deviceId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <input
                type="radio"
                name="camera"
                value={camera.deviceId}
                checked={selectedCamera === camera.deviceId}
                onChange={() => onChange(camera.deviceId)}
                className="w-4 h-4 text-blue-600"
              />
              <Camera className="w-4 h-4 text-gray-500" />
              <span className="text-sm flex-1">{camera.label}</span>
              {selectedCamera === camera.deviceId && <Check className="w-4 h-4 text-blue-600" />}
            </label>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">共找到 {cameras.length} 个摄像头设备</p>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================
export default function Settings() {
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'password' | 'style' | 'photos' | 'camera'
  >('schedule')
  const [isLoading, setIsLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 配置状态
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
    bottomLeftText: '保密委员会办公室',
    bottomRightText: '',
    backgroundColor: '#0066cc',
    textColor: '#ffffff',
    lightBackgroundColor: '#dbeafe',
    lightTextColor: '#1e40af',
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
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<keyof WeeklySchedule>('monday')
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>('dark')

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.api.getConfig()
        if (config.password) setPassword(config.password)
        if (config.schedule) setSchedule(config.schedule)
        if (config.style) {
          setStyle({
            themeMode: config.style.themeMode || 'dark',
            centerText: config.style.centerText || '',
            subText: config.style.subText || '',
            bottomLeftText: config.style.bottomLeftText || '',
            bottomRightText: config.style.bottomRightText || '',
            backgroundColor: config.style.backgroundColor || '#0066cc',
            textColor: config.style.textColor || '#ffffff',
            lightBackgroundColor: config.style.lightBackgroundColor || '#dbeafe',
            lightTextColor: config.style.lightTextColor || '#1e40af',
            timePosition: config.style.timePosition || 'hidden',
            timeFormat: config.style.timeFormat || 'HH:mm:ss',
            closeScreenPrompt: config.style.closeScreenPrompt || '请关闭班级大屏后再继续操作',
            fontSizes: config.style.fontSizes || {
              centerText: 48,
              subText: 28,
              bottomText: 16,
              timeText: 20
            }
          })
        }
        if (config.selectedCamera) setSelectedCamera(config.selectedCamera)
      } catch (e) {
        console.error('Failed to load config:', e)
      }
    }
    loadConfig()
  }, [])

  // 保存配置
  const handleSave = async () => {
    setIsLoading(true)
    try {
      await window.api.saveConfig({ password, schedule, style, selectedCamera })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e) {
      console.error('Failed to save config:', e)
      alert('保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 应用预置主题
  const applyTheme = (theme: (typeof presetThemes)[0]) => {
    setStyle((s) => ({
      ...s,
      themeMode: theme.themeMode,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      lightBackgroundColor: theme.lightBackgroundColor,
      lightTextColor: theme.lightTextColor,
      centerText: theme.centerText,
      subText: theme.subText
    }))
  }

  // 日程操作
  const updateDaySchedule = (day: keyof WeeklySchedule, updates: Partial<DaySchedule>) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...updates } }))
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

  // 获取预览颜色
  const getPreviewColors = () => {
    if (previewMode === 'dark') {
      return {
        backgroundColor: style.backgroundColor || '#0066cc',
        textColor: style.textColor || '#ffffff'
      }
    } else {
      return {
        backgroundColor: style.lightBackgroundColor || '#ffffff',
        textColor: style.lightTextColor || '#1f2937'
      }
    }
  }

  const previewColors = getPreviewColors()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-medium text-gray-800">设置</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </header>

      {/* 内容 */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-6">
          {/* 侧边栏 */}
          <nav className="w-48 flex flex-col gap-1 shrink-0">
            {/* 主设置组 */}
            <div className="mb-2">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                基本设置
              </p>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <Clock
                  className={`w-4 h-4 ${activeTab === 'schedule' ? 'text-white' : 'text-gray-400'}`}
                />
                <span>锁屏时段</span>
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                  activeTab === 'password'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <Lock
                  className={`w-4 h-4 ${activeTab === 'password' ? 'text-white' : 'text-gray-400'}`}
                />
                <span>密码设置</span>
              </button>
            </div>

            {/* 外观组 */}
            <div className="mb-2">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                外观
              </p>
              <button
                onClick={() => setActiveTab('style')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                  activeTab === 'style'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <Palette
                  className={`w-4 h-4 ${activeTab === 'style' ? 'text-white' : 'text-gray-400'}`}
                />
                <span>界面样式</span>
              </button>
            </div>

            {/* 安全组 */}
            <div className="mb-2">
              <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                安全监控
              </p>
              <button
                onClick={() => setActiveTab('camera')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                  activeTab === 'camera'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <Camera
                  className={`w-4 h-4 ${activeTab === 'camera' ? 'text-white' : 'text-gray-400'}`}
                />
                <span>摄像头</span>
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                  activeTab === 'photos'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <Image
                  className={`w-4 h-4 ${activeTab === 'photos' ? 'text-white' : 'text-gray-400'}`}
                />
                <span>解锁记录</span>
                {activeTab !== 'photos' && (
                  <span className="ml-auto text-xs text-gray-400">查看照片</span>
                )}
              </button>
            </div>
          </nav>

          {/* 主内容区 */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {activeTab === 'schedule' && (
              <div className="p-6">
                <h2 className="text-base font-medium text-gray-800 mb-4">锁屏时段</h2>

                {/* 星期选择 */}
                <div className="flex gap-2 mb-6">
                  {dayNames.map(({ key, short }) => {
                    const isEnabled = schedule[key]?.enabled ?? false
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          selectedDay === key
                            ? 'bg-blue-600 text-white'
                            : isEnabled
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {short}
                      </button>
                    )
                  })}
                </div>

                {/* 当日设置 */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={schedule[selectedDay]?.enabled ?? false}
                        onChange={(e) =>
                          updateDaySchedule(selectedDay, { enabled: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        启用 {dayNames.find((d) => d.key === selectedDay)?.label} 锁屏
                      </span>
                    </label>
                    {(schedule[selectedDay]?.enabled ?? false) && (
                      <button
                        onClick={() => addSlot(selectedDay)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        添加时段
                      </button>
                    )}
                  </div>

                  {(schedule[selectedDay]?.enabled ?? false) && (
                    <div className="space-y-2">
                      {(schedule[selectedDay]?.slots ?? []).length === 0 ? (
                        <p className="text-sm text-gray-400 py-4">暂无时段，点击上方按钮添加</p>
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
                  )}
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="p-6">
                <h2 className="text-base font-medium text-gray-800 mb-4">密码设置</h2>
                <PasswordSection password={password} onChange={setPassword} />
              </div>
            )}

            {activeTab === 'style' && (
              <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <h2 className="text-base font-medium text-gray-800">界面样式</h2>

                {/* 预置主题 */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Layout className="w-4 h-4" />
                    快速主题
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {presetThemes.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => applyTheme(theme)}
                        className="p-3 rounded-lg border border-gray-200 hover:border-blue-500 
                          transition-all duration-200 hover:shadow-md group"
                      >
                        <div className="flex gap-1 mb-2">
                          <div
                            className="h-10 flex-1 rounded-l-md transition-transform group-hover:scale-105"
                            style={{ backgroundColor: theme.backgroundColor }}
                          />
                          <div
                            className="h-10 flex-1 rounded-r-md transition-transform group-hover:scale-105"
                            style={{ backgroundColor: theme.lightBackgroundColor }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 主题模式 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">主题模式</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setStyle((s) => ({ ...s, themeMode: 'light' }))}
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
                      onClick={() => setStyle((s) => ({ ...s, themeMode: 'dark' }))}
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
                      onClick={() => setStyle((s) => ({ ...s, themeMode: 'system' }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        style.themeMode === 'system'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      跟随系统
                    </button>
                    <button
                      onClick={() => setStyle((s) => ({ ...s, themeMode: 'custom' }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        style.themeMode === 'custom'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Settings2 className="w-4 h-4" />
                      自定义
                    </button>
                  </div>
                </div>

                {/* 深色模式颜色 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      <Moon className="w-3 h-3 inline mr-1" />
                      深色背景色
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.backgroundColor}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, backgroundColor: e.target.value }))
                        }
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={style.backgroundColor}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, backgroundColor: e.target.value }))
                        }
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      <Moon className="w-3 h-3 inline mr-1" />
                      深色文字色
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.textColor}
                        onChange={(e) => setStyle((s) => ({ ...s, textColor: e.target.value }))}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={style.textColor}
                        onChange={(e) => setStyle((s) => ({ ...s, textColor: e.target.value }))}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 浅色模式颜色 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      <Sun className="w-3 h-3 inline mr-1" />
                      浅色背景色
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.lightBackgroundColor || '#ffffff'}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, lightBackgroundColor: e.target.value }))
                        }
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={style.lightBackgroundColor || '#ffffff'}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, lightBackgroundColor: e.target.value }))
                        }
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      <Sun className="w-3 h-3 inline mr-1" />
                      浅色文字色
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.lightTextColor || '#1f2937'}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, lightTextColor: e.target.value }))
                        }
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={style.lightTextColor || '#1f2937'}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, lightTextColor: e.target.value }))
                        }
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 字体大小设置 */}
                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Type className="w-4 h-4" />
                    字体大小
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        主标题 ({style.fontSizes.centerText}px)
                      </label>
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={style.fontSizes.centerText}
                        onChange={(e) =>
                          setStyle((s) => ({
                            ...s,
                            fontSizes: { ...s.fontSizes, centerText: parseInt(e.target.value) }
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        副标题 ({style.fontSizes.subText}px)
                      </label>
                      <input
                        type="range"
                        min={16}
                        max={48}
                        value={style.fontSizes.subText}
                        onChange={(e) =>
                          setStyle((s) => ({
                            ...s,
                            fontSizes: { ...s.fontSizes, subText: parseInt(e.target.value) }
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        底部文字 ({style.fontSizes.bottomText}px)
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={32}
                        value={style.fontSizes.bottomText}
                        onChange={(e) =>
                          setStyle((s) => ({
                            ...s,
                            fontSizes: { ...s.fontSizes, bottomText: parseInt(e.target.value) }
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        时间文字 ({style.fontSizes.timeText}px)
                      </label>
                      <input
                        type="range"
                        min={12}
                        max={40}
                        value={style.fontSizes.timeText}
                        onChange={(e) =>
                          setStyle((s) => ({
                            ...s,
                            fontSizes: { ...s.fontSizes, timeText: parseInt(e.target.value) }
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 时间显示设置 */}
                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Clock className="w-4 h-4" />
                    时间显示
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">位置</label>
                      <select
                        value={style.timePosition}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, timePosition: e.target.value as any }))
                        }
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      >
                        {timePositionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">格式</label>
                      <select
                        value={style.timeFormat}
                        onChange={(e) => setStyle((s) => ({ ...s, timeFormat: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      >
                        {timeFormatOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 文字内容 - 使用 textarea 支持换行 */}
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <Type className="w-4 h-4" />
                    文字内容（支持换行）
                  </label>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">主标题</label>
                    <textarea
                      value={style.centerText}
                      onChange={(e) => setStyle((s) => ({ ...s, centerText: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm 
                        focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="显示在屏幕中央的文字"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">副标题</label>
                    <textarea
                      value={style.subText}
                      onChange={(e) => setStyle((s) => ({ ...s, subText: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm 
                        focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="显示在主标题下方的文字"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">左下角文字</label>
                      <textarea
                        value={style.bottomLeftText}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, bottomLeftText: e.target.value }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm 
                          focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="左下角"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">右下角文字</label>
                      <textarea
                        value={style.bottomRightText}
                        onChange={(e) =>
                          setStyle((s) => ({ ...s, bottomRightText: e.target.value }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm 
                          focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="右下角"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      <Camera className="w-3 h-3 inline mr-1" />
                      关闭大屏提示
                    </label>
                    <textarea
                      value={style.closeScreenPrompt}
                      onChange={(e) =>
                        setStyle((s) => ({ ...s, closeScreenPrompt: e.target.value }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm 
                        focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="点击背景后显示的提示文字"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      点击锁屏背景时会先显示此提示，确认后才可输入密码
                    </p>
                  </div>
                </div>

                {/* 预览 */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-gray-600">预览</label>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setPreviewMode('dark')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          previewMode === 'dark'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        深色
                      </button>
                      <button
                        onClick={() => setPreviewMode('light')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          previewMode === 'light'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        浅色
                      </button>
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-8 text-center min-h-[200px] flex flex-col justify-center
                      transition-all duration-300"
                    style={{
                      backgroundColor: previewColors.backgroundColor,
                      color: previewColors.textColor
                    }}
                  >
                    {style.timePosition === 'center' && (
                      <div
                        className="opacity-60 font-mono mb-2"
                        style={{ fontSize: style.fontSizes.timeText }}
                      >
                        {new Date().toLocaleTimeString()}
                      </div>
                    )}
                    <div
                      className="font-medium whitespace-pre-line leading-relaxed"
                      style={{
                        fontSize: Math.min(style.fontSizes.centerText, 32),
                        marginBottom: '12px'
                      }}
                    >
                      {style.centerText || '主标题'}
                    </div>
                    <div
                      className="opacity-80 whitespace-pre-line"
                      style={{ fontSize: Math.min(style.fontSizes.subText, 24) }}
                    >
                      {style.subText || '副标题'}
                    </div>
                    {(style.timePosition === 'bottom-left' ||
                      style.timePosition === 'bottom-right') && (
                      <div
                        className="opacity-60 font-mono mt-6"
                        style={{ fontSize: Math.min(style.fontSizes.timeText, 16) }}
                      >
                        {new Date().toLocaleTimeString()}
                      </div>
                    )}
                    <div
                      className="flex justify-between mt-8 opacity-60 whitespace-pre-line"
                      style={{ fontSize: Math.min(style.fontSizes.bottomText, 14) }}
                    >
                      <span>{style.bottomLeftText}</span>
                      <span>{style.bottomRightText}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="p-6">
                <h2 className="text-base font-medium text-gray-800 mb-4">摄像头设置</h2>
                <CameraSection selectedCamera={selectedCamera} onChange={setSelectedCamera} />
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="p-6">
                <h2 className="text-base font-medium text-gray-800 mb-4">解锁记录</h2>
                <PhotosSection />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
