import { ElectronAPI } from '@electron-toolkit/preload'

export interface FontSizeConfig {
  centerText: number
  subText: number
  bottomText: number
  timeText: number
}

export interface TextAlignConfig {
  centerText: 'left' | 'center' | 'right'
  subText: 'left' | 'center' | 'right'
  bottomText: 'left' | 'center' | 'right'
}

export interface FontWeightConfig {
  centerText: 'light' | 'normal' | 'medium' | 'bold'
  subText: 'light' | 'normal' | 'medium' | 'bold'
  bottomText: 'light' | 'normal' | 'medium' | 'bold'
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
  textAligns: TextAlignConfig
  fontWeights: FontWeightConfig
}

export interface UnlockRecord {
  id: string
  timestamp: number
  success: boolean
  attemptCount: number
  unlockMethod?: 'fixed' | 'totp'
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
  totpDeviceName?: string
}

export interface API {
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
  getStyle: () => Promise<StyleConfig & { backgroundColor: string; textColor: string }>
  verifyPassword: (password: string) => Promise<boolean>
  verifyPasswordWithMethod: (password: string) => Promise<{ success: boolean; method?: 'fixed' | 'totp' }>
  verifySettingsPassword: (password: string) => Promise<boolean>
  generateTOTPSecret: (deviceName?: string) => Promise<{ secret: string; otpauthUrl: string; deviceName: string }>
  completeSetup: () => Promise<boolean>
  unlock: () => Promise<boolean>
  openSettings: () => Promise<boolean>
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
  getCameras: () => Promise<CameraDevice[]>
  getSelectedCamera: () => Promise<string | undefined>
  setSelectedCamera: (deviceId: string) => Promise<boolean>
  setSettingsDirty: (dirty: boolean) => Promise<boolean>
  onSettingsCloseAttempt: (callback: () => void) => void
  respondSettingsClose: (result: 'proceed' | 'cancel') => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
