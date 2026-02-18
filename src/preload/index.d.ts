import { ElectronAPI } from '@electron-toolkit/preload'

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
  generateTOTPSecret: () => Promise<{ secret: string; otpauthUrl: string }>
  completeSetup: () => Promise<boolean>
  unlock: () => Promise<boolean>
  openSettings: () => Promise<boolean>
  saveUnlockRecord: (record: {
    timestamp: number
    success: boolean
    attemptCount: number
    photoData?: string
    error?: string
  }) => Promise<boolean>
  getUnlockRecords: () => Promise<UnlockRecord[]>
  deleteUnlockRecord: (id: string) => Promise<boolean>
  clearUnlockRecords: () => Promise<boolean>
  getCameras: () => Promise<CameraDevice[]>
  getSelectedCamera: () => Promise<string | undefined>
  setSelectedCamera: (deviceId: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
