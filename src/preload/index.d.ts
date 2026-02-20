import { ElectronAPI } from '@electron-toolkit/preload'

export interface FontSizeConfig {
  centerText: number
  subText: number
  bottomText: number
  timeText: number
}

export interface TextAlignConfig {
  centerText: 'left' | 'center' | 'right' | 'justify'
  subText: 'left' | 'center' | 'right' | 'justify'
  bottomText: 'left' | 'center' | 'right' | 'justify'
  bottomLeftText: 'left' | 'center' | 'right' | 'justify'
  bottomRightText: 'left' | 'center' | 'right' | 'justify'
}

export interface FontWeightConfig {
  centerText: 'light' | 'normal' | 'medium' | 'bold'
  subText: 'light' | 'normal' | 'medium' | 'bold'
  bottomText: 'light' | 'normal' | 'medium' | 'bold'
}

export interface TextOpacityConfig {
  centerText: number
  subText: number
  bottomLeftText: number
  bottomRightText: number
}

export interface ImageScaleConfig {
  bottomLeft: number
  bottomRight: number
}

export type CornerContentMode = 'text' | 'image'

export interface LayoutConfig {
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

export interface StyleConfig {
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
  textOpacities: TextOpacityConfig
  imageScales: ImageScaleConfig
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

export type AppLanguage = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR'

export interface StartupConfig {
  autoLaunch: boolean
}

export interface UpdateConfig {
  channel: 'stable' | 'preview'
  checkOnStartup: boolean
  autoDownload: boolean
  autoInstallOnQuit: boolean
}

export interface RuntimeInfo {
  platform: string
  appVersion: string
  autoLaunchSupported: boolean
  isPackaged: boolean
}

export interface UpdateStatus {
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
    language: AppLanguage
    selectedCamera?: string
    startup: StartupConfig
    update: UpdateConfig
  }>
  saveConfig: (config: {
    password?: PasswordConfig
    schedule?: any
    style?: Partial<StyleConfig>
    language?: AppLanguage
    selectedCamera?: string
    startup?: StartupConfig
    update?: UpdateConfig
  }) => Promise<boolean>
  getRuntimeInfo: () => Promise<RuntimeInfo>
  getStyle: () => Promise<StyleConfig & { backgroundColor: string; textColor: string }>
  verifyPassword: (password: string) => Promise<boolean>
  verifyPasswordWithMethod: (
    password: string
  ) => Promise<{ success: boolean; method?: 'fixed' | 'totp' }>
  verifySettingsPassword: (password: string) => Promise<boolean>
  generateTOTPSecret: (
    deviceName?: string
  ) => Promise<{ secret: string; otpauthUrl: string; deviceName: string }>
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
  verifyQuitPassword: (payload: { requestId: string; password: string }) => Promise<boolean>
  cancelQuitPasswordAuth: (requestId: string) => Promise<boolean>
  onQuitAuthRequest: (callback: (payload: { requestId: string }) => void) => void
  checkForUpdates: () => Promise<{ ok: boolean; status: string; message: string; version?: string }>
  getUpdateStatus: () => Promise<UpdateStatus>
  installDownloadedUpdate: () => Promise<boolean>
  openPreviewWindow: (payload: {
    style: Partial<StyleConfig>
    mode: 'dark' | 'light'
  }) => Promise<boolean>
  getPreviewStyle: () => Promise<{ style: StyleConfig; mode: 'dark' | 'light' }>
  closePreviewWindow: () => Promise<boolean>
  onPreviewStyleUpdated: (
    callback: (payload: { style: StyleConfig; mode: 'dark' | 'light' }) => void
  ) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
