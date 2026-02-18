/// <reference types="vite/client" />

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

interface PasswordConfig {
  type: 'fixed' | 'totp' | 'both'
  fixedPassword?: string
  totpSecret?: string
  totpDeviceName?: string
}

interface API {
  // 配置管理
  getConfig: () => Promise<{
    password: PasswordConfig
    schedule: {
      monday: { enabled: boolean; slots: { start: string; end: string }[] }
      tuesday: { enabled: boolean; slots: { start: string; end: string }[] }
      wednesday: { enabled: boolean; slots: { start: string; end: string }[] }
      thursday: { enabled: boolean; slots: { start: string; end: string }[] }
      friday: { enabled: boolean; slots: { start: string; end: string }[] }
      saturday: { enabled: boolean; slots: { start: string; end: string }[] }
      sunday: { enabled: boolean; slots: { start: string; end: string }[] }
    }
    style: StyleConfig
    selectedCamera?: string
  }>
  saveConfig: (config: {
    password?: PasswordConfig
    schedule?: any
    style?: Partial<StyleConfig>
    selectedCamera?: string
  }) => Promise<boolean>

  // 样式获取
  getStyle: () => Promise<StyleConfig & { backgroundColor: string; textColor: string }>

  // 密码验证
  verifyPassword: (password: string) => Promise<boolean>
  verifyPasswordWithMethod: (password: string) => Promise<{ success: boolean; method?: 'fixed' | 'totp' }>
  verifySettingsPassword: (password: string) => Promise<boolean>

  // TOTP
  generateTOTPSecret: (deviceName?: string) => Promise<{ secret: string; otpauthUrl: string; deviceName: string }>

  // 设置和解锁
  completeSetup: () => Promise<boolean>
  unlock: () => Promise<boolean>
  openSettings: () => Promise<boolean>

  // 解锁记录
  saveUnlockRecord: (record: {
    timestamp: number
    success: boolean
    attemptCount: number
    unlockMethod?: 'fixed' | 'totp'
    photoData?: string
    error?: string
  }) => Promise<boolean>
  getUnlockRecords: () => Promise<UnlockRecord[]>
  deleteUnlockRecord: (id: string) => Promise<boolean>
  clearUnlockRecords: (password: string) => Promise<boolean>

  // 摄像头
  getCameras: () => Promise<CameraDevice[]>
  getSelectedCamera: () => Promise<string | undefined>
  setSelectedCamera: (deviceId: string) => Promise<boolean>

  // 设置页未保存拦截
  setSettingsDirty: (dirty: boolean) => Promise<boolean>
  onSettingsCloseAttempt: (callback: () => void) => void
  respondSettingsClose: (result: 'proceed' | 'cancel') => Promise<boolean>
}

declare global {
  interface Window {
    api: API
  }
}

export {}
