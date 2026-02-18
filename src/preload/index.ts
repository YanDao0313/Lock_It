import { contextBridge, ipcRenderer } from 'electron'

// ============================================================================
// 类型定义
// ============================================================================
export interface TimeSlot {
  start: string
  end: string
}

export interface DaySchedule {
  enabled: boolean
  slots: TimeSlot[]
}

export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface FontSizeConfig {
  centerText: number
  subText: number
  bottomText: number
  timeText: number
}

export interface StyleConfig {
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

export interface UnlockRecord {
  id: string
  timestamp: number
  success: boolean
  attemptCount: number
  photoData?: string
  photoPath?: string
  error?: string
}

export interface CameraDevice {
  deviceId: string
  label: string
}

export interface PasswordConfig {
  type: 'fixed' | 'totp' | 'both'
  fixedPassword?: string
  totpSecret?: string
}

// ============================================================================
// API 定义
// ============================================================================
export interface API {
  // 保存配置
  saveConfig: (config: {
    password?: PasswordConfig
    schedule?: WeeklySchedule
    style?: Partial<StyleConfig>
    selectedCamera?: string
  }) => Promise<boolean>

  // 配置管理
  getConfig: () => Promise<{
    password: PasswordConfig
    schedule: WeeklySchedule
    style: StyleConfig
    selectedCamera?: string
  }>

  // 样式获取（给锁屏界面用）
  getStyle: () => Promise<StyleConfig & { backgroundColor: string; textColor: string }>

  // 密码验证
  verifyPassword: (password: string) => Promise<boolean>

  // TOTP
  generateTOTPSecret: () => Promise<{ secret: string; otpauthUrl: string }>

  // 完成设置
  completeSetup: () => Promise<boolean>

  // 解锁（通知主进程关闭锁屏窗口）
  unlock: () => Promise<boolean>

  // 打开设置
  openSettings: () => Promise<boolean>

  // 保存解锁记录（带照片）
  saveUnlockRecord: (record: {
    timestamp: number
    success: boolean
    attemptCount: number
    photoData?: string
    error?: string
  }) => Promise<boolean>

  // 获取解锁记录
  getUnlockRecords: () => Promise<UnlockRecord[]>

  // 删除解锁记录
  deleteUnlockRecord: (id: string) => Promise<boolean>

  // 清空所有解锁记录
  clearUnlockRecords: () => Promise<boolean>

  // 获取相机列表
  getCameras: () => Promise<CameraDevice[]>

  // 获取选中的相机
  getSelectedCamera: () => Promise<string | undefined>

  // 设置选中的相机
  setSelectedCamera: (deviceId: string) => Promise<boolean>
}

// ============================================================================
// 暴露 API 到渲染进程
// ============================================================================
contextBridge.exposeInMainWorld('api', {
  // 保存配置
  saveConfig: (config: any) => ipcRenderer.invoke('set-config', config),

  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),

  // 样式获取
  getStyle: () => ipcRenderer.invoke('get-style'),

  // 密码验证
  verifyPassword: (password: string) => ipcRenderer.invoke('verify-password', password),

  // TOTP
  generateTOTPSecret: () => ipcRenderer.invoke('generate-totp-secret'),

  // 完成设置
  completeSetup: () => ipcRenderer.invoke('complete-setup'),

  // 解锁（通知主进程关闭锁屏窗口）
  unlock: () => ipcRenderer.invoke('unlock'),

  // 打开设置
  openSettings: () => ipcRenderer.invoke('open-settings'),

  // 保存解锁记录
  saveUnlockRecord: (record: any) => ipcRenderer.invoke('save-unlock-record', record),

  // 获取解锁记录
  getUnlockRecords: () => ipcRenderer.invoke('get-unlock-records'),

  // 删除解锁记录
  deleteUnlockRecord: (id: string) => ipcRenderer.invoke('delete-unlock-record', id),

  // 清空所有解锁记录
  clearUnlockRecords: () => ipcRenderer.invoke('clear-unlock-records'),

  // 获取相机列表
  getCameras: () => ipcRenderer.invoke('get-cameras'),

  // 获取选中的相机
  getSelectedCamera: () => ipcRenderer.invoke('get-selected-camera'),

  // 设置选中的相机
  setSelectedCamera: (deviceId: string) => ipcRenderer.invoke('set-selected-camera', deviceId)
} as API)

// 类型声明
declare global {
  interface Window {
    api: API
  }
}
