import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  globalShortcut
} from 'electron'
import { join } from 'path'
import * as os from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { format } from 'date-fns'
import { autoUpdater } from 'electron-updater'

// ============================================================================
// 类型定义
// ============================================================================
interface TimeSlot {
  start: string // "HH:mm"
  end: string // "HH:mm"
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

interface TextOpacityConfig {
  centerText: number
  subText: number
  bottomLeftText: number
  bottomRightText: number
}

interface ImageScaleConfig {
  bottomLeft: number
  bottomRight: number
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

interface PasswordConfig {
  type: 'fixed' | 'totp' | 'both'
  fixedPassword?: string
  totpSecret?: string
  totpDeviceName?: string
}

interface AppConfig {
  hasCompletedSetup: boolean
  password: PasswordConfig
  schedule: WeeklySchedule
  style: StyleConfig
  language: AppLanguage
  selectedCamera?: string
  startup?: StartupConfig
  update?: UpdateConfig
}

type AppLanguage = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR'

interface StartupConfig {
  autoLaunch: boolean
}

interface UpdateConfig {
  channel: 'stable' | 'preview'
  checkOnStartup: boolean
  autoDownload: boolean
  autoInstallOnQuit: boolean
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

type TOTPModule = {
  generateSecret: () => string
  verifySync: (params: {
    token: string
    secret: string
  }) => boolean | { valid?: boolean } | undefined
}

type PasswordVerifyResult = {
  success: boolean
  method?: 'fixed' | 'totp'
}

type DebugInfo = {
  app: {
    name: string
    version: string
    isPackaged: boolean
    locale: string
    execPath: string
    userDataPath: string
    logsPath: string
  }
  update: UpdateConfig & {
    feedReleaseType: 'release' | 'prerelease'
    updaterState: typeof updaterState
  }
  system: {
    platform: NodeJS.Platform
    arch: string
    osType: string
    osRelease: string
    osVersion?: string
    hostname: string
    timezone?: string
  }
  hardware: {
    cpuModel?: string
    cpuCores: number
    memoryTotalMB: number
    memoryFreeMB: number
  }
  versions: {
    node?: string
    electron?: string
    chrome?: string
    v8?: string
  }
}

function collectDebugInfo(): DebugInfo {
  const cpuInfo = os.cpus()
  const cpuModel = cpuInfo?.[0]?.model

  const update = normalizeUpdateConfig(store?.get('update') as Partial<UpdateConfig>)
  const feedReleaseType: 'release' | 'prerelease' = update.channel === 'preview' ? 'prerelease' : 'release'

  let osVersion: string | undefined
  try {
    // Node 20+ 支持 os.version()；部分平台可能不可用
    osVersion = typeof (os as any).version === 'function' ? (os as any).version() : undefined
  } catch {
    osVersion = undefined
  }

  let timezone: string | undefined
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    timezone = undefined
  }

  return {
    app: {
      name: app.getName(),
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      locale: app.getLocale(),
      execPath: process.execPath,
      userDataPath: app.getPath('userData'),
      logsPath: app.getPath('logs')
    },
    update: {
      ...update,
      feedReleaseType,
      updaterState: { ...updaterState }
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      osType: os.type(),
      osRelease: os.release(),
      osVersion,
      hostname: os.hostname(),
      timezone
    },
    hardware: {
      cpuModel,
      cpuCores: Array.isArray(cpuInfo) ? cpuInfo.length : 0,
      memoryTotalMB: Math.round(os.totalmem() / 1024 / 1024),
      memoryFreeMB: Math.round(os.freemem() / 1024 / 1024)
    },
    versions: {
      node: process.versions?.node,
      electron: process.versions?.electron,
      chrome: process.versions?.chrome,
      v8: process.versions?.v8
    }
  }
}

// ============================================================================
// 全局状态
// ============================================================================
let mainWindow: BrowserWindow | null = null
let lockWindow: BrowserWindow | null = null
let previewWindow: BrowserWindow | null = null
let tray: Tray | null = null
let store: any = null
let totpModule: TOTPModule | null = null
let checkInterval: NodeJS.Timeout | null = null
let isLocked = false
let isQuitting = false
let autoLockEnabled = true // 解锁后设为false，停止自动锁屏
let settingsDirty = false
let isHandlingMainClose = false
let pendingSettingsCloseResolver: ((result: 'proceed' | 'cancel') => void) | null = null
let updateCheckTimer: NodeJS.Timeout | null = null
let isQuitAuthorized = false
let isHandlingQuitAttempt = false
let pendingQuitAuthResolver: ((result: boolean) => void) | null = null
let pendingQuitAuthRequestId: string | null = null
let watchdogStarted = false

const uninstallAuthModeArg = '--request-uninstall-auth'
const uninstallVerifyArgPrefix = '--verify-password-for-uninstall='

let previewStyleState: {
  style: StyleConfig
  mode: 'dark' | 'light'
} | null = null

const updaterState: {
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
} = {
  status: 'idle',
  message: '等待检查更新'
}

// 默认配置
const defaultSchedule = (): WeeklySchedule => ({
  monday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  friday: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] }
})

const defaultFontSizes = (): FontSizeConfig => ({
  centerText: 48,
  subText: 28,
  bottomText: 16,
  timeText: 20
})

const defaultTextAligns = (): TextAlignConfig => ({
  centerText: 'center',
  subText: 'center',
  bottomText: 'center',
  bottomLeftText: 'left',
  bottomRightText: 'right'
})

const defaultFontWeights = (): FontWeightConfig => ({
  centerText: 'medium',
  subText: 'normal',
  bottomText: 'normal'
})

const defaultLayout = (): LayoutConfig => ({
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
})

const defaultStyle = (): StyleConfig => ({
  themeMode: 'dark',
  centerText: '此计算机因违规外联已被阻断',
  subText: '请等待安全部门与你联系',
  bottomLeftText: '夏莱保密委员会办公室\n联邦学生会意识形态工作领导小组办公室',
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
  lightBackgroundColor: '#e0f2fe',
  lightTextColor: '#1e3a5f',
  timePosition: 'hidden',
  timeFormat: 'HH:mm:ss',
  closeScreenPrompt: '请关闭班级大屏后再继续操作',
  fontSizes: defaultFontSizes(),
  textAligns: defaultTextAligns(),
  fontWeights: defaultFontWeights(),
  layout: defaultLayout()
})

const defaultStartup = (): StartupConfig => ({
  autoLaunch: true
})

const defaultUpdate = (): UpdateConfig => ({
  channel: 'stable',
  checkOnStartup: true,
  autoDownload: true,
  autoInstallOnQuit: true
})

function normalizeStyle(style?: Partial<StyleConfig>): StyleConfig {
  const defaults = defaultStyle()
  const source = style || {}

  const globalOpacity = normalizeTextOpacity(source.textOpacity, defaults.textOpacity)

  return {
    ...defaults,
    ...source,
    textOpacity: globalOpacity,
    textOpacities: normalizeTextOpacities(
      source.textOpacities,
      globalOpacity,
      defaults.textOpacities
    ),
    imageScales: normalizeImageScales(source.imageScales, defaults.imageScales),
    bottomLeftMode: source.bottomLeftMode === 'image' ? 'image' : 'text',
    bottomRightMode: source.bottomRightMode === 'image' ? 'image' : 'text',
    fontSizes: {
      ...defaults.fontSizes,
      ...(source.fontSizes || {})
    },
    textAligns: {
      ...defaults.textAligns,
      ...(source.textAligns || {}),
      bottomLeftText:
        source.textAligns?.bottomLeftText ||
        source.textAligns?.bottomText ||
        defaults.textAligns.bottomLeftText,
      bottomRightText:
        source.textAligns?.bottomRightText ||
        source.textAligns?.bottomText ||
        defaults.textAligns.bottomRightText
    },
    fontWeights: {
      ...defaults.fontWeights,
      ...(source.fontWeights || {})
    },
    layout: {
      ...defaults.layout,
      ...(source.layout || {})
    }
  }
}

function normalizeTextOpacity(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(100, value))
}

function normalizeTextOpacities(
  value: Partial<TextOpacityConfig> | undefined,
  fallbackGlobal: number,
  defaults: TextOpacityConfig
): TextOpacityConfig {
  return {
    centerText: normalizeTextOpacity(value?.centerText, fallbackGlobal ?? defaults.centerText),
    subText: normalizeTextOpacity(value?.subText, fallbackGlobal ?? defaults.subText),
    bottomLeftText: normalizeTextOpacity(
      value?.bottomLeftText,
      fallbackGlobal ?? defaults.bottomLeftText
    ),
    bottomRightText: normalizeTextOpacity(
      value?.bottomRightText,
      fallbackGlobal ?? defaults.bottomRightText
    )
  }
}

function normalizeImageScales(
  value: Partial<ImageScaleConfig> | undefined,
  defaults: ImageScaleConfig
): ImageScaleConfig {
  const clampScale = (raw: number | undefined, fallback: number) => {
    if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback
    return Math.max(10, Math.min(300, raw))
  }

  return {
    bottomLeft: clampScale(value?.bottomLeft, defaults.bottomLeft),
    bottomRight: clampScale(value?.bottomRight, defaults.bottomRight)
  }
}

function normalizeStartupConfig(startup?: Partial<StartupConfig>): StartupConfig {
  const defaults = defaultStartup()
  return {
    autoLaunch: typeof startup?.autoLaunch === 'boolean' ? startup.autoLaunch : defaults.autoLaunch
  }
}

function normalizeUpdateConfig(update?: Partial<UpdateConfig>): UpdateConfig {
  const defaults = defaultUpdate()
  const channel = update?.channel === 'preview' ? 'preview' : defaults.channel
  return {
    channel,
    checkOnStartup:
      typeof update?.checkOnStartup === 'boolean' ? update.checkOnStartup : defaults.checkOnStartup,
    autoDownload:
      typeof update?.autoDownload === 'boolean' ? update.autoDownload : defaults.autoDownload,
    autoInstallOnQuit:
      typeof update?.autoInstallOnQuit === 'boolean'
        ? update.autoInstallOnQuit
        : defaults.autoInstallOnQuit
  }
}

function normalizeLanguage(language?: string): AppLanguage {
  if (!language) return 'zh-CN'
  const normalized = String(language).trim().replace(/_/g, '-').toLowerCase()
  if (normalized === 'en' || normalized === 'en-us') return 'en-US'
  if (normalized === 'ja' || normalized === 'ja-jp') return 'ja-JP'
  if (normalized === 'ko' || normalized === 'ko-kr') return 'ko-KR'
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN'
  return 'zh-CN'
}

function getArgValue(prefix: string): string | undefined {
  const matched = process.argv.find((arg) => arg.startsWith(prefix))
  if (!matched) return undefined
  return matched.slice(prefix.length)
}

function hasArg(flag: string): boolean {
  return process.argv.includes(flag)
}

type TrayI18n = {
  tooltip: string
  showSettings: string
  locked: string
  unlocked: string
  autoEnabled: string
  autoPaused: string
  lockNow: string
  resumeAutoLock: string
  unlockNeedPassword: string
  quit: string
}

const trayI18nMap: Record<AppLanguage, TrayI18n> = {
  'zh-CN': {
    tooltip: 'Lock It - 自动锁屏',
    showSettings: '显示设置',
    locked: '🔒 已锁定',
    unlocked: '🔓 未锁定',
    autoEnabled: '✓ 自动锁屏已启用',
    autoPaused: '✗ 自动锁屏已暂停',
    lockNow: '立即锁定',
    resumeAutoLock: '恢复自动锁屏',
    unlockNeedPassword: '解锁（需密码）',
    quit: '退出'
  },
  'en-US': {
    tooltip: 'Lock It - Auto Lock',
    showSettings: 'Open Settings',
    locked: '🔒 Locked',
    unlocked: '🔓 Unlocked',
    autoEnabled: '✓ Auto lock enabled',
    autoPaused: '✗ Auto lock paused',
    lockNow: 'Lock Now',
    resumeAutoLock: 'Resume Auto Lock',
    unlockNeedPassword: 'Unlock (Password Required)',
    quit: 'Quit'
  },
  'ja-JP': {
    tooltip: 'Lock It - 自動ロック',
    showSettings: '設定を開く',
    locked: '🔒 ロック中',
    unlocked: '🔓 ロック解除',
    autoEnabled: '✓ 自動ロック有効',
    autoPaused: '✗ 自動ロック一時停止',
    lockNow: '今すぐロック',
    resumeAutoLock: '自動ロックを再開',
    unlockNeedPassword: '解除（パスワード必要）',
    quit: '終了'
  },
  'ko-KR': {
    tooltip: 'Lock It - 자동 잠금',
    showSettings: '설정 열기',
    locked: '🔒 잠금됨',
    unlocked: '🔓 잠금 해제됨',
    autoEnabled: '✓ 자동 잠금 활성화',
    autoPaused: '✗ 자동 잠금 일시중지',
    lockNow: '지금 잠그기',
    resumeAutoLock: '자동 잠금 재개',
    unlockNeedPassword: '잠금 해제(비밀번호 필요)',
    quit: '종료'
  }
}

function getTrayI18n(): TrayI18n {
  const language = normalizeLanguage(store?.get('language') as string | undefined)
  return trayI18nMap[language]
}

function isAutoLaunchSupported(): boolean {
  return (process.platform === 'win32' || process.platform === 'darwin') && app.isPackaged
}

function applyAutoLaunchSetting(autoLaunch: boolean): boolean {
  if (!isAutoLaunchSupported()) {
    return false
  }

  app.setLoginItemSettings({
    openAtLogin: autoLaunch,
    ...(process.platform === 'darwin' ? { openAsHidden: true } : {})
  })

  return true
}

function syncStartupSettingFromConfig(): void {
  const startup = normalizeStartupConfig(store.get('startup') as Partial<StartupConfig>)
  store.set('startup', startup)
  applyAutoLaunchSetting(startup.autoLaunch)
}

function applyUpdaterConfigFromStore(): UpdateConfig {
  const update = normalizeUpdateConfig(store.get('update') as Partial<UpdateConfig>)
  store.set('update', update)

  applyUpdaterFeed(update)

  autoUpdater.allowPrerelease = update.channel === 'preview'
  autoUpdater.autoDownload = update.autoDownload
  autoUpdater.autoInstallOnAppQuit = update.autoInstallOnQuit
  return update
}

function isPreviewBuildVersion(version: string): boolean {
  const normalized = String(version || '').toLowerCase()
  return normalized.includes('-preview.') || normalized.includes('-preview-') || normalized.endsWith('-preview')
}

function isDefaultUpdateConfig(config: UpdateConfig): boolean {
  const defaults = defaultUpdate()
  return (
    config.channel === defaults.channel &&
    config.checkOnStartup === defaults.checkOnStartup &&
    config.autoDownload === defaults.autoDownload &&
    config.autoInstallOnQuit === defaults.autoInstallOnQuit
  )
}

function applyUpdaterFeed(update: UpdateConfig): void {
  const releaseType = update.channel === 'preview' ? 'prerelease' : 'release'

  // 说明：electron-builder 打包时会写入 app-update.yml，但 preview 构建与 stable 构建共用同一份
  // publish 配置（releaseType=release），会导致 preview 通道仍只看正式 Release。
  // 这里按运行时通道显式覆盖 feed，确保 stable/preview 通道都按预期工作。
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'YanDao0313',
    repo: 'Lock_It',
    releaseType,
    private: false
  })
}

async function runUpdateCheck(manual = false): Promise<{
  ok: boolean
  status: string
  message: string
  version?: string
}> {
  if (is.dev) {
    return {
      ok: false,
      status: 'disabled',
      message: '开发模式下不检查更新'
    }
  }

  try {
    updaterState.status = 'checking'
    updaterState.message = '正在检查更新'

    const result = await autoUpdater.checkForUpdates()
    const targetVersion = result?.updateInfo?.version

    const currentVersion = app.getVersion()

    if (targetVersion && targetVersion !== currentVersion) {
      updaterState.status = 'available'
      updaterState.message = `发现新版本 ${targetVersion}`
      updaterState.version = targetVersion
      return {
        ok: true,
        status: 'available',
        message: `发现新版本 ${targetVersion}`,
        version: targetVersion
      }
    }

    updaterState.status = 'not-available'
    updaterState.message = '当前已是最新版本'
    updaterState.version = undefined

    return {
      ok: true,
      status: 'not-available',
      message: '当前已是最新版本'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updaterState.status = 'error'
    updaterState.message = `检查更新失败：${message}`
    if (!manual) {
      console.error('[updater] scheduled check failed:', error)
    }
    return {
      ok: false,
      status: 'error',
      message: `检查更新失败：${message}`
    }
  }
}

// 获取实际使用的颜色（根据主题模式，提供默认值）
function getThemeColors(style: StyleConfig) {
  // 根据系统主题判断
  const systemIsDark = nativeTheme?.shouldUseDarkColors ?? false

  // 确定当前是深色模式还是浅色模式
  let isDark: boolean
  if (style.themeMode === 'system') {
    isDark = systemIsDark
  } else if (style.themeMode === 'dark') {
    isDark = true
  } else if (style.themeMode === 'light') {
    isDark = false
  } else {
    // custom 模式下，根据用户选择或默认深色
    isDark = true
  }

  // 返回对应的颜色配置
  if (isDark) {
    return {
      backgroundColor: style.backgroundColor || '#0f172a',
      textColor: style.textColor || '#ffffff'
    }
  } else {
    return {
      backgroundColor: style.lightBackgroundColor || style.backgroundColor || '#ffffff',
      textColor: style.lightTextColor || style.textColor || '#1f2937'
    }
  }
}

// ============================================================================
// ESM 模块加载
// ============================================================================
async function initModules(): Promise<void> {
  const StoreModule = await import('electron-store')
  store = new StoreModule.default({
    name: 'config',
    defaults: {
      hasCompletedSetup: false,
      password: { type: 'fixed', fixedPassword: '123456' },
      schedule: defaultSchedule(),
      style: defaultStyle(),
      language: 'zh-CN',
      startup: defaultStartup(),
      update: defaultUpdate()
    }
  })

  // 预览构建：如果用户的更新设置仍是“完全默认值”，则自动把通道切到 preview。
  // 这主要解决“从 stable 安装覆盖到 preview 时，AppData 配置沿用导致通道仍是 stable”的困惑。
  try {
    const appVersion = app.getVersion()
    if (isPreviewBuildVersion(appVersion)) {
      const currentUpdate = normalizeUpdateConfig(store.get('update') as Partial<UpdateConfig>)
      if (isDefaultUpdateConfig(currentUpdate) && currentUpdate.channel !== 'preview') {
        const nextUpdate: UpdateConfig = { ...currentUpdate, channel: 'preview' }
        store.set('update', nextUpdate)
      }
    }
  } catch (e) {
    console.warn('[updater] failed to auto adjust channel for preview build:', e)
  }

  // 初始化 feed（此时 store 里可能已被自动切到 preview）
  try {
    const effectiveUpdate = normalizeUpdateConfig(store.get('update') as Partial<UpdateConfig>)
    applyUpdaterFeed(effectiveUpdate)
  } catch (e) {
    console.warn('[updater] failed to apply updater feed:', e)
  }

  const otplib = await import('otplib')
  const moduleAny = otplib as any

  if (
    typeof moduleAny.generateSecret === 'function' &&
    typeof moduleAny.verifySync === 'function'
  ) {
    totpModule = {
      generateSecret: () => moduleAny.generateSecret(),
      verifySync: ({ token, secret }) => moduleAny.verifySync({ token, secret })
    }
    return
  }

  const authenticator = moduleAny.authenticator || moduleAny.default?.authenticator
  if (authenticator) {
    totpModule = {
      generateSecret: () => authenticator.generateSecret(),
      verifySync: ({ token, secret }) => authenticator.verify({ token, secret })
    }
    return
  }

  throw new Error('Failed to initialize otplib authenticator module')
}

function normalizePasswordConfig(password?: PasswordConfig): PasswordConfig {
  const source = password || { type: 'fixed', fixedPassword: '123456' }
  const fixedPassword =
    source.fixedPassword && /^\d{6}$/.test(source.fixedPassword) ? source.fixedPassword : '123456'
  const totpDeviceName = normalizeTotpDeviceName(source.totpDeviceName)

  if (source.type === 'both') {
    return {
      type: 'both',
      fixedPassword,
      totpSecret: source.totpSecret,
      totpDeviceName
    }
  }

  return {
    type: 'fixed',
    fixedPassword,
    totpSecret: source.totpSecret,
    totpDeviceName
  }
}

function generateDefaultTotpDeviceName(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 4; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function normalizeTotpDeviceName(name?: string): string {
  const trimmed = (name || '').trim()
  return trimmed || generateDefaultTotpDeviceName()
}

function getExitAuthorizationFlagPath(): string {
  return join(app.getPath('userData'), 'authorized-exit.flag')
}

async function markAuthorizedExit(): Promise<void> {
  try {
    const fs = await import('fs')
    fs.writeFileSync(getExitAuthorizationFlagPath(), String(Date.now()), 'utf-8')
  } catch (error) {
    console.error('Failed to mark authorized exit:', error)
  }
}

async function clearAuthorizedExitFlag(): Promise<void> {
  try {
    const fs = await import('fs')
    const flagPath = getExitAuthorizationFlagPath()
    if (fs.existsSync(flagPath)) {
      fs.unlinkSync(flagPath)
    }
  } catch (error) {
    console.error('Failed to clear authorized exit flag:', error)
  }
}

async function startWindowsWatchdog(): Promise<void> {
  if (watchdogStarted) return
  if (process.platform !== 'win32') return
  if (!app.isPackaged) return

  const executablePath = app.getPath('exe')
  const currentPid = process.pid
  const flagPath = getExitAuthorizationFlagPath().replace(/'/g, "''")
  const escapedExecutablePath = executablePath.replace(/'/g, "''")

  const script = [
    `$parentPid=${currentPid}`,
    `$exe='${escapedExecutablePath}'`,
    `$flag='${flagPath}'`,
    'while($true){',
    '  Start-Sleep -Seconds 2',
    '  $p = Get-Process -Id $parentPid -ErrorAction SilentlyContinue',
    '  if($p){ continue }',
    '  if(Test-Path $flag){',
    '    Remove-Item -Path $flag -Force -ErrorAction SilentlyContinue',
    '    exit 0',
    '  }',
    '  Start-Sleep -Seconds 1',
    '  Start-Process -FilePath $exe',
    '  exit 0',
    '}'
  ].join('; ')

  try {
    const { spawn } = await import('child_process')
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script],
      {
        detached: true,
        stdio: 'ignore'
      }
    )
    child.unref()
    watchdogStarted = true
  } catch (error) {
    console.error('Failed to start watchdog:', error)
  }
}

function sendQuitAuthRequest(requestId: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const send = () => {
    mainWindow?.webContents.send('quit-auth-request', { requestId })
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.once('did-finish-load', send)
    return
  }

  send()
}

function requestQuitAuthorization(): Promise<boolean> {
  if (pendingQuitAuthResolver) {
    return Promise.resolve(false)
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  pendingQuitAuthRequestId = requestId

  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
  } else {
    navigateMainWindowTo('settings')
  }

  mainWindow?.show()
  mainWindow?.focus()

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (pendingQuitAuthResolver) {
        pendingQuitAuthResolver = null
      }
      pendingQuitAuthRequestId = null
      resolve(false)
    }, 60000)

    pendingQuitAuthResolver = (result) => {
      clearTimeout(timeout)
      pendingQuitAuthResolver = null
      pendingQuitAuthRequestId = null
      resolve(result)
    }

    sendQuitAuthRequest(requestId)
  })
}

function finishQuitAuth(result: boolean): void {
  if (pendingQuitAuthResolver) {
    pendingQuitAuthResolver(result)
  }
}

async function initiateQuitFlow(): Promise<void> {
  if (isQuitting || isQuitAuthorized) {
    return
  }

  if (isHandlingQuitAttempt) {
    return
  }

  isHandlingQuitAttempt = true
  try {
    const authorized = await requestQuitAuthorization()
    if (!authorized) return

    isQuitAuthorized = true
    isQuitting = true
    await markAuthorizedExit()
    app.quit()
  } finally {
    isHandlingQuitAttempt = false
  }
}

async function runUninstallAuthWindow(): Promise<boolean> {
  if (!totpModule || !store) {
    await initModules()
  }

  return await new Promise((resolve) => {
    const verifyChannel = 'verify-uninstall-auth-password'
    const completeChannel = 'complete-uninstall-auth'
    let settled = false

    const cleanup = () => {
      ipcMain.removeHandler(verifyChannel)
      ipcMain.removeHandler(completeChannel)
    }

    ipcMain.handle(verifyChannel, (_, password: string) => {
      const result = verifyPasswordAgainstConfig(password)
      return result.success
    })

    ipcMain.handle(completeChannel, async (_, ok: boolean) => {
      if (settled) return true
      settled = true
      cleanup()
      if (ok) {
        await markAuthorizedExit()
      }
      resolve(Boolean(ok))
      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close()
      }
      return true
    })

    const authWindow = new BrowserWindow({
      width: 460,
      height: 300,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      show: false,
      title: 'Lock It - 卸载验证',
      icon: join(__dirname, '../../resources/icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false
      }
    })

    const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Lock It 卸载验证</title>
    <style>
      body { margin: 0; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f5f5f5; color: #171717; }
      .wrap { padding: 24px; }
      .card { background: #fff; border: 1px solid #e5e5e5; padding: 20px; }
      h1 { margin: 0 0 10px; font-size: 18px; font-weight: 600; }
      p { margin: 0 0 14px; font-size: 13px; color: #525252; line-height: 1.5; }
      input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d4d4d4; font-size: 14px; outline: none; }
      input:focus { border-color: #171717; }
      .error { min-height: 18px; color: #dc2626; font-size: 12px; margin-top: 8px; }
      .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
      button { min-width: 88px; padding: 8px 12px; border: 1px solid #d4d4d4; background: #fff; cursor: pointer; font-size: 13px; }
      .primary { background: #171717; color: #fff; border-color: #171717; }
      button:disabled { opacity: .6; cursor: not-allowed; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>卸载前请验证密码</h1>
        <p>请输入当前解锁密码（固定密码或 TOTP）后，才可继续卸载。</p>
        <input id="pwd" type="password" placeholder="输入固定密码或 TOTP" autofocus />
        <div id="error" class="error"></div>
        <div class="actions">
          <button id="cancel">取消</button>
          <button id="ok" class="primary">验证并继续</button>
        </div>
      </div>
    </div>
    <script>
      const { ipcRenderer } = require('electron')
      const pwd = document.getElementById('pwd')
      const error = document.getElementById('error')
      const ok = document.getElementById('ok')
      const cancel = document.getElementById('cancel')

      const resetError = () => { error.textContent = '' }
      const setBusy = (busy) => {
        ok.disabled = busy
        cancel.disabled = busy
        pwd.disabled = busy
      }

      pwd.addEventListener('input', resetError)
      pwd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ok.click()
        }
      })

      cancel.addEventListener('click', async () => {
        await ipcRenderer.invoke('${completeChannel}', false)
      })

      ok.addEventListener('click', async () => {
        const value = String(pwd.value || '').trim()
        if (!value) {
          error.textContent = '请输入密码或 TOTP。'
          return
        }
        setBusy(true)
        try {
          const pass = await ipcRenderer.invoke('${verifyChannel}', value)
          if (!pass) {
            error.textContent = '验证失败，请重试。'
            setBusy(false)
            return
          }
          await ipcRenderer.invoke('${completeChannel}', true)
        } catch (e) {
          error.textContent = '验证失败，请重试。'
          setBusy(false)
        }
      })
    </script>
  </body>
</html>`

    authWindow.on('closed', () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(false)
    })

    authWindow.once('ready-to-show', () => {
      authWindow.show()
      authWindow.focus()
    })

    void authWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
  })
}

async function runMaintenanceModeIfNeeded(): Promise<boolean> {
  const uninstallAuthMode = hasArg(uninstallAuthModeArg)
  const uninstallVerifyPassword = getArgValue(uninstallVerifyArgPrefix)

  if (!uninstallAuthMode && uninstallVerifyPassword === undefined) {
    return false
  }

  try {
    await app.whenReady()
    await initModules()

    let ok = false
    if (uninstallVerifyPassword !== undefined) {
      const token = String(uninstallVerifyPassword).trim()
      if (!/^\d{6,8}$/.test(token)) {
        ok = false
      } else {
        ok = verifyPasswordAgainstConfig(token).success
      }
      if (ok) {
        await markAuthorizedExit()
      }
    } else {
      ok = await runUninstallAuthWindow()
    }

    app.exit(ok ? 0 : 1)
  } catch (error) {
    console.error('Maintenance mode failed:', error)
    app.exit(1)
  }

  return true
}

function navigateMainWindowTo(pageHash: 'setup' | 'settings'): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${pageHash}`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: pageHash })
  }
}

// ============================================================================
// 窗口管理
// ============================================================================
function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return mainWindow
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 1000,
    minHeight: 750,
    show: false,
    title: 'Lock It - 设置',
    icon: join(__dirname, '../../resources/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.removeMenu()
  mainWindow.setMenuBarVisibility(false)

  // 根据是否首次启动显示不同页面
  const hasCompletedSetup = store.get('hasCompletedSetup') as boolean
  const pageHash = hasCompletedSetup ? 'settings' : 'setup'

  navigateMainWindowTo(pageHash as 'setup' | 'settings')

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return

    event.preventDefault()
    if (isHandlingMainClose) return

    isHandlingMainClose = true
    void (async () => {
      const decision = await requestSettingsCloseDecision()
      if (decision === 'proceed') {
        mainWindow?.hide()
      }
      isHandlingMainClose = false
    })()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

function requestSettingsCloseDecision(): Promise<'proceed' | 'cancel'> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve('proceed')
  }

  if (!settingsDirty) {
    return Promise.resolve('proceed')
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (pendingSettingsCloseResolver) {
        pendingSettingsCloseResolver = null
        resolve('cancel')
      }
    }, 30000)

    pendingSettingsCloseResolver = (result) => {
      clearTimeout(timeout)
      pendingSettingsCloseResolver = null
      resolve(result)
    }

    mainWindow?.webContents.send('settings-close-attempt')
  })
}

// 要阻止的系统快捷键列表
const blockedShortcuts = [
  'Alt+F4',
  'Command+Q',
  'Command+W',
  'Command+Tab',
  'Alt+Tab',
  'Alt+Shift+Tab',
  'Ctrl+Alt+Tab',
  'Command+`',
  'Super',
  'Command+Space',
  'Ctrl+Space',
  'Alt+Space',
  'Command+Option+Esc',
  'Ctrl+Shift+Esc',
  'Command+Shift+Esc',
  'Ctrl+Alt+Delete',
  'PrintScreen',
  'Command+Shift+3',
  'Command+Shift+4',
  'Command+Shift+5'
]

function registerBlockingShortcuts(): void {
  // 注册所有要阻止的快捷键，让它们什么都不做
  for (const shortcut of blockedShortcuts) {
    try {
      globalShortcut.register(shortcut, () => {
        console.log(`Blocked shortcut: ${shortcut}`)
        // 什么都不做，只是阻止默认行为
      })
    } catch (e) {
      // 某些快捷键可能无法注册，忽略错误
    }
  }

  // 特别处理 Win 键（Windows/Linux）或 Command 键（macOS）
  try {
    // Windows 键
    globalShortcut.register('Super', () => {
      console.log('Blocked Super key')
    })
  } catch (e) {
    // 忽略错误
  }

  // 单独注册 F 键和其他可能被用于系统功能的键
  const functionKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
  for (const key of functionKeys) {
    try {
      // 阻止 Alt+F 组合
      globalShortcut.register(`Alt+${key}`, () => {
        console.log(`Blocked Alt+${key}`)
      })
    } catch (e) {
      // 忽略错误
    }
  }
}

function unregisterBlockingShortcuts(): void {
  globalShortcut.unregisterAll()
}

function createLockWindow(): BrowserWindow {
  if (lockWindow && !lockWindow.isDestroyed()) {
    lockWindow.focus()
    return lockWindow
  }

  // 注册阻止快捷键
  registerBlockingShortcuts()

  lockWindow = new BrowserWindow({
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    kiosk: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 阻止所有系统快捷键和窗口操作
  lockWindow.setFullScreenable(false)
  lockWindow.setSkipTaskbar(true)
  lockWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  lockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  lockWindow.setContentProtection(true)

  // 防止窗口失去焦点（通过定期重新获取焦点）
  const focusInterval = setInterval(() => {
    if (lockWindow && !lockWindow.isDestroyed()) {
      if (!lockWindow.isFocused()) {
        lockWindow.focus()
      }
      // 确保始终在最顶层
      lockWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    } else {
      clearInterval(focusInterval)
    }
  }, 100)

  // 阻止所有导航事件
  lockWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // 阻止新窗口打开
  lockWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // 防止卸载（阻止 Alt+F4）
  lockWindow.webContents.on('before-input-event', (event, input) => {
    // 阻止 Alt+F4
    if (input.key === 'F4' && input.alt) {
      event.preventDefault()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    lockWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#lockscreen`)
  } else {
    lockWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'lockscreen' })
  }

  lockWindow.once('ready-to-show', () => {
    lockWindow?.show()
    lockWindow?.focus()
    lockWindow?.setAlwaysOnTop(true, 'screen-saver', 1)
    lockWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  })

  // 当窗口关闭时清理
  lockWindow.on('closed', () => {
    clearInterval(focusInterval)
    unregisterBlockingShortcuts()
    lockWindow = null
    isLocked = false
  })

  return lockWindow
}

function createPreviewWindow(): BrowserWindow {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.show()
    previewWindow.focus()
    return previewWindow
  }

  previewWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    previewWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#preview`)
  } else {
    previewWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'preview' })
  }

  previewWindow.on('closed', () => {
    previewWindow = null
  })

  return previewWindow
}

function closeLockWindow(): void {
  // 注销阻止的快捷键
  unregisterBlockingShortcuts()

  if (lockWindow && !lockWindow.isDestroyed()) {
    lockWindow.closable = true
    lockWindow.close()
    lockWindow = null
  }
  isLocked = false
  autoLockEnabled = false // 解锁后停止自动锁屏
  updateTrayMenu()
}

function registerProductionShortcutGuards(window: BrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase()
    const isFunctionDevKey = key === 'f12'
    const isDevToolsCombo =
      (input.control || input.meta) && input.shift && (key === 'i' || key === 'j' || key === 'c')
    const isReloadCombo = (input.control || input.meta) && (key === 'r' || key === 'f5')

    if (isFunctionDevKey || isDevToolsCombo || isReloadCombo) {
      event.preventDefault()
    }
  })
}

// ============================================================================
// 系统托盘
// ============================================================================
function createTray(): void {
  if (tray) return

  const iconPath = join(__dirname, '../../resources/icon.png')
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }))
  tray.setToolTip(getTrayI18n().tooltip)

  updateTrayMenu()
}

function updateTrayMenu(): void {
  if (!tray) return
  const trayI18n = getTrayI18n()
  tray.setToolTip(trayI18n.tooltip)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: trayI18n.showSettings,
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createMainWindow()
        } else {
          navigateMainWindowTo('settings')
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: isLocked ? trayI18n.locked : trayI18n.unlocked,
      enabled: false
    },
    {
      label: autoLockEnabled ? trayI18n.autoEnabled : trayI18n.autoPaused,
      enabled: false
    },
    { type: 'separator' },
    ...(isLocked
      ? []
      : [
          {
            label: trayI18n.lockNow,
            click: () => {
              isLocked = true
              createLockWindow()
              updateTrayMenu()
            }
          }
        ]),
    ...(!isLocked && !autoLockEnabled
      ? [
          {
            label: trayI18n.resumeAutoLock,
            click: () => {
              autoLockEnabled = true
              updateTrayMenu()
              checkSchedule() // 立即检查一次
            }
          }
        ]
      : []),
    ...(isLocked
      ? [
          {
            label: trayI18n.unlockNeedPassword,
            click: () => {
              //  bring lock window to front
              if (lockWindow && !lockWindow.isDestroyed()) {
                lockWindow.focus()
                lockWindow.setAlwaysOnTop(true, 'screen-saver')
              }
            }
          }
        ]
      : []),
    { type: 'separator' },
    {
      label: trayI18n.quit,
      click: () => {
        void initiateQuitFlow()
      }
    }
  ] as any)

  tray?.setContextMenu(contextMenu)
}

// ============================================================================
// 锁屏逻辑
// ============================================================================
function isInLockTime(): boolean {
  const now = new Date()
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ] as const
  const todayKey = dayNames[now.getDay()]
  const schedule = store.get('schedule') as WeeklySchedule
  const todaySchedule = schedule[todayKey]

  if (!todaySchedule?.enabled || todaySchedule.slots.length === 0) {
    return false
  }

  const currentTime = format(now, 'HH:mm')

  return todaySchedule.slots.some((slot) => {
    return currentTime >= slot.start && currentTime <= slot.end
  })
}

function checkSchedule(): void {
  if (isLocked || !autoLockEnabled) return

  if (isInLockTime()) {
    console.log('Lock time! Creating lock window...')
    isLocked = true
    createLockWindow()
    updateTrayMenu()
  }
}

function startScheduleChecker(): void {
  if (checkInterval) clearInterval(checkInterval)
  checkInterval = setInterval(checkSchedule, 30000) // 每30秒检查一次
  checkSchedule() // 立即检查一次
}

function setupAutoUpdater(): void {
  if (is.dev) {
    console.log('[updater] development mode, skip auto update check')
    updaterState.status = 'disabled'
    updaterState.message = '开发模式下不检查更新'
    return
  }

  const updateConfig = applyUpdaterConfigFromStore()

  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }

  autoUpdater.removeAllListeners('checking-for-update')
  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('update-not-available')
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for updates...')
    updaterState.status = 'checking'
    updaterState.message = '正在检查更新'
  })

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] update available: ${info.version}`)
    updaterState.status = 'available'
    updaterState.message = `发现新版本 ${info.version}`
    updaterState.version = info.version
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] no updates available')
    updaterState.status = 'not-available'
    updaterState.message = '当前已是最新版本'
    updaterState.version = undefined
  })

  autoUpdater.on('download-progress', (progress) => {
    updaterState.status = 'downloading'
    updaterState.message = `正在下载更新 ${progress.percent.toFixed(1)}%`
    console.log(
      `[updater] downloading: ${progress.percent.toFixed(1)}% (${progress.transferred}/${progress.total})`
    )
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] update downloaded: ${info.version}, will install on quit`)
    updaterState.status = 'downloaded'
    updaterState.message = `更新已下载：${info.version}`
    updaterState.version = info.version
  })

  autoUpdater.on('error', (error) => {
    console.error('[updater] error:', error)
    updaterState.status = 'error'
    updaterState.message = `更新失败：${error.message}`
  })

  if (updateConfig.checkOnStartup) {
    void runUpdateCheck()
    updateCheckTimer = setInterval(
      () => {
        void runUpdateCheck()
      },
      6 * 60 * 60 * 1000
    )
  } else {
    updaterState.status = 'idle'
    updaterState.message = '已关闭自动检查更新'
  }
}

function verifyPasswordAgainstConfig(inputPassword: string): PasswordVerifyResult {
  const pwdConfig = normalizePasswordConfig(store.get('password') as PasswordConfig)

  if (
    (pwdConfig.type === 'fixed' || pwdConfig.type === 'both') &&
    inputPassword === pwdConfig.fixedPassword
  ) {
    return { success: true, method: 'fixed' }
  }

  if ((pwdConfig.type === 'totp' || pwdConfig.type === 'both') && pwdConfig.totpSecret) {
    try {
      if (!totpModule) {
        console.error('TOTP module not initialized')
        return { success: false }
      }

      const verifyResult = totpModule.verifySync({
        token: inputPassword,
        secret: pwdConfig.totpSecret
      })
      const isValid =
        typeof verifyResult === 'boolean'
          ? verifyResult
          : Boolean((verifyResult as { valid?: boolean } | undefined)?.valid)

      if (isValid) {
        return { success: true, method: 'totp' }
      }
    } catch (e) {
      console.error('TOTP verification error:', e)
    }
  }

  return { success: false }
}

// ============================================================================
// IPC 处理
// ============================================================================
function setupIpcHandlers(): void {
  ipcMain.handle('set-settings-dirty', (_, dirty: boolean) => {
    settingsDirty = !!dirty
    return true
  })

  ipcMain.handle('settings-close-response', (_, result: 'proceed' | 'cancel') => {
    if (pendingSettingsCloseResolver) {
      pendingSettingsCloseResolver(result)
    }
    return true
  })

  ipcMain.handle(
    'verify-quit-password',
    async (_, payload: { requestId: string; password: string }): Promise<boolean> => {
      if (!payload || payload.requestId !== pendingQuitAuthRequestId) {
        return false
      }

      const result = verifyPasswordAgainstConfig(payload.password)
      if (result.success) {
        finishQuitAuth(true)
      }

      return result.success
    }
  )

  ipcMain.handle('cancel-quit-password-auth', (_, requestId: string): boolean => {
    if (requestId && requestId === pendingQuitAuthRequestId) {
      finishQuitAuth(false)
    }
    return true
  })

  // 获取配置
  ipcMain.handle('get-config', () => {
    const style = normalizeStyle(store.get('style') as Partial<StyleConfig>)
    const password = normalizePasswordConfig(store.get('password') as PasswordConfig)
    const language = normalizeLanguage(store.get('language') as string | undefined)
    const startup = normalizeStartupConfig(store.get('startup') as Partial<StartupConfig>)
    const update = normalizeUpdateConfig(store.get('update') as Partial<UpdateConfig>)
    store.set('password', password)
    store.set('language', language)
    store.set('startup', startup)
    store.set('update', update)
    return {
      password,
      schedule: store.get('schedule'),
      style: style,
      language,
      selectedCamera: store.get('selectedCamera'),
      startup,
      update
    }
  })

  // 保存配置
  ipcMain.handle('set-config', (_, config: Partial<AppConfig>) => {
    if (config.password) store.set('password', normalizePasswordConfig(config.password))
    if (config.schedule) store.set('schedule', config.schedule)
    if (config.style) {
      const currentStyle = normalizeStyle(store.get('style') as Partial<StyleConfig>)
      const mergedStyle = normalizeStyle({
        ...currentStyle,
        ...config.style,
        bottomLeftMode: config.style.bottomLeftMode || currentStyle.bottomLeftMode,
        bottomRightMode: config.style.bottomRightMode || currentStyle.bottomRightMode,
        fontSizes: {
          ...currentStyle.fontSizes,
          ...(config.style.fontSizes || {})
        },
        textAligns: {
          ...currentStyle.textAligns,
          ...(config.style.textAligns || {})
        },
        fontWeights: {
          ...currentStyle.fontWeights,
          ...(config.style.fontWeights || {})
        },
        textOpacities: {
          ...currentStyle.textOpacities,
          ...(config.style.textOpacities || {})
        },
        imageScales: {
          ...currentStyle.imageScales,
          ...(config.style.imageScales || {})
        },
        layout: {
          ...currentStyle.layout,
          ...(config.style.layout || {})
        }
      })
      mergedStyle.textOpacity = normalizeTextOpacity(
        config.style.textOpacity,
        mergedStyle.textOpacities.centerText
      )
      store.set('style', mergedStyle)
    }
    if (config.language !== undefined) {
      store.set('language', normalizeLanguage(config.language))
      updateTrayMenu()
    }
    if (config.selectedCamera !== undefined) store.set('selectedCamera', config.selectedCamera)
    if (config.startup) {
      const startup = normalizeStartupConfig(config.startup)
      store.set('startup', startup)
      applyAutoLaunchSetting(startup.autoLaunch)
    }
    if (config.update) {
      const update = normalizeUpdateConfig(config.update)
      store.set('update', update)
      if (!is.dev) {
        setupAutoUpdater()
      }
    }
    return true
  })

  ipcMain.handle('get-runtime-info', () => {
    return {
      platform: process.platform,
      appVersion: app.getVersion(),
      autoLaunchSupported: isAutoLaunchSupported(),
      isPackaged: app.isPackaged
    }
  })

  ipcMain.handle('get-debug-info', () => {
    return collectDebugInfo()
  })

  ipcMain.handle('check-for-updates', async () => {
    return runUpdateCheck(true)
  })

  ipcMain.handle('install-downloaded-update', () => {
    if (is.dev) return false
    if (updaterState.status !== 'downloaded') return false
    isQuitAuthorized = true
    isQuitting = true
    void markAuthorizedExit()
    autoUpdater.quitAndInstall()
    return true
  })

  ipcMain.handle('get-update-status', () => {
    return { ...updaterState }
  })

  // 获取样式（给锁屏界面用）
  ipcMain.handle('get-style', () => {
    const style = normalizeStyle(store.get('style') as Partial<StyleConfig>)
    const colors = getThemeColors(style)
    return {
      ...style,
      ...colors
    }
  })

  ipcMain.handle(
    'open-preview-window',
    (_, payload?: { style?: Partial<StyleConfig>; mode?: 'dark' | 'light' }) => {
      const baseStyle = normalizeStyle(store.get('style') as Partial<StyleConfig>)
      const mergedStyle = normalizeStyle({
        ...baseStyle,
        ...(payload?.style || {})
      })
      mergedStyle.textOpacity = normalizeTextOpacity(
        payload?.style?.textOpacity,
        mergedStyle.textOpacities.centerText
      )

      previewStyleState = {
        style: mergedStyle,
        mode: payload?.mode === 'light' ? 'light' : 'dark'
      }

      const window = createPreviewWindow()
      window.webContents.once('did-finish-load', () => {
        window.webContents.send('preview-style-updated', previewStyleState)
      })
      return true
    }
  )

  ipcMain.handle('get-preview-style', () => {
    if (previewStyleState) {
      return previewStyleState
    }
    return {
      style: normalizeStyle(store.get('style') as Partial<StyleConfig>),
      mode: 'dark' as const
    }
  })

  ipcMain.handle('close-preview-window', () => {
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.close()
    }
    return true
  })

  // 验证密码
  ipcMain.handle('verify-password', async (_, password: string): Promise<boolean> => {
    const result = verifyPasswordAgainstConfig(password)
    if (result.success) {
      closeLockWindow()
    }
    return result.success
  })

  // 验证密码并返回使用方式（给锁屏记录用）
  ipcMain.handle(
    'verify-password-with-method',
    async (_, password: string): Promise<PasswordVerifyResult> => {
      const result = verifyPasswordAgainstConfig(password)
      return result
    }
  )

  // 设置页二次确认密码（不触发解锁逻辑）
  ipcMain.handle('verify-settings-password', async (_, password: string): Promise<boolean> => {
    const result = verifyPasswordAgainstConfig(password)
    return result.success
  })

  // 生成 TOTP 密钥
  ipcMain.handle('generate-totp-secret', (_, deviceName?: string) => {
    if (!totpModule) {
      throw new Error('TOTP module not initialized')
    }

    const normalizedDeviceName = normalizeTotpDeviceName(deviceName)
    const accountLabel = `LockIt - ${normalizedDeviceName}`

    const secret = totpModule.generateSecret()
    return {
      secret,
      otpauthUrl: `otpauth://totp/${encodeURIComponent(accountLabel)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('LockIt')}`,
      deviceName: normalizedDeviceName
    }
  })

  // 完成设置向导
  ipcMain.handle('complete-setup', () => {
    store.set('hasCompletedSetup', true)
    settingsDirty = false

    if (mainWindow && !mainWindow.isDestroyed()) {
      navigateMainWindowTo('settings')
      mainWindow.show()
      mainWindow.focus()
    }

    // 启动定时检查
    startScheduleChecker()

    return true
  })

  // 解锁信号（从锁屏页面发送）
  ipcMain.handle('unlock', () => {
    closeLockWindow()
    updateTrayMenu()
    return true
  })

  // 打开设置窗口
  ipcMain.handle('open-settings', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow()
    } else {
      navigateMainWindowTo('settings')
      mainWindow.show()
      mainWindow.focus()
    }
    return true
  })

  // 保存解锁记录
  ipcMain.handle(
    'save-unlock-record',
    async (_, record: Omit<UnlockRecord, 'id' | 'photoPath'>) => {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const { app } = await import('electron')

        const records = (store.get('unlockRecords') as UnlockRecord[]) || []
        const id = Date.now().toString()

        let photoPath: string | undefined

        // 如果有照片数据，保存为文件
        if (record.photoData) {
          const photosDir = path.join(app.getPath('userData'), 'unlock-photos')
          if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir, { recursive: true })
          }

          const photoFileName = `unlock-${id}-${record.success ? 'success' : 'fail'}.jpg`
          photoPath = path.join(photosDir, photoFileName)

          // 将 base64 数据转换为 buffer 并保存
          const base64Data = record.photoData.replace(/^data:image\/jpeg;base64,/, '')
          fs.writeFileSync(photoPath, Buffer.from(base64Data, 'base64'))

          console.log('Photo saved:', photoPath)
        } else {
          console.warn('No photo data in unlock record')
        }

        const newRecord: UnlockRecord = {
          ...record,
          id,
          photoPath
        }

        // 删除 photoData 字段（因为已经保存到文件了）
        delete (newRecord as any).photoData

        records.unshift(newRecord)

        // 只保留最近100条记录
        if (records.length > 100) {
          records.length = 100
        }
        store.set('unlockRecords', records)

        return true
      } catch (e) {
        console.error('Failed to save unlock record:', e)
        return false
      }
    }
  )

  // 获取解锁记录
  ipcMain.handle('get-unlock-records', async () => {
    try {
      const fs = await import('fs')

      const records = (store.get('unlockRecords') as UnlockRecord[]) || []

      // 为每条记录读取照片文件（如果存在）
      const recordsWithPhotos = await Promise.all(
        records.map(async (record) => {
          if (record.photoPath && fs.existsSync(record.photoPath)) {
            try {
              const photoData = fs.readFileSync(record.photoPath)
              const base64Data = `data:image/jpeg;base64,${photoData.toString('base64')}`
              return { ...record, photoData: base64Data }
            } catch (e) {
              console.error('Failed to read photo:', e)
              return record
            }
          }
          return record
        })
      )

      return recordsWithPhotos
    } catch (e) {
      console.error('Failed to get unlock records:', e)
      return []
    }
  })

  // 删除解锁记录
  ipcMain.handle('delete-unlock-record', async (_, id: string) => {
    try {
      const fs = await import('fs')

      const records = (store.get('unlockRecords') as UnlockRecord[]) || []
      const record = records.find((r) => r.id === id)

      // 如果有关联的照片文件，删除它
      if (record?.photoPath && fs.existsSync(record.photoPath)) {
        try {
          fs.unlinkSync(record.photoPath)
        } catch (e) {
          console.error('Failed to delete photo file:', e)
        }
      }

      const newRecords = records.filter((r) => r.id !== id)
      store.set('unlockRecords', newRecords)
      return true
    } catch (e) {
      console.error('Failed to delete unlock record:', e)
      return false
    }
  })

  // 清空所有解锁记录
  ipcMain.handle('clear-unlock-records', async (_, password: string) => {
    try {
      const verifyResult = verifyPasswordAgainstConfig(password)
      if (!verifyResult.success) {
        return false
      }

      const fs = await import('fs')

      const records = (store.get('unlockRecords') as UnlockRecord[]) || []

      // 删除所有关联的照片文件
      for (const record of records) {
        if (record.photoPath && fs.existsSync(record.photoPath)) {
          try {
            fs.unlinkSync(record.photoPath)
          } catch (e) {
            console.error('Failed to delete photo file:', e)
          }
        }
      }

      // 清空记录
      store.set('unlockRecords', [])
      return true
    } catch (e) {
      console.error('Failed to clear unlock records:', e)
      return false
    }
  })

  // 获取相机列表
  ipcMain.handle('get-cameras', async () => {
    try {
      // 使用系统命令获取相机列表
      // 注意：Electron 本身没有直接获取摄像头列表的 API
      // 我们返回一个特殊标记，让渲染进程自己通过 navigator.mediaDevices 获取
      return { useRenderer: true }
    } catch (e) {
      console.error('Failed to get cameras:', e)
      return { useRenderer: true, error: String(e) }
    }
  })

  // 获取选中的相机
  ipcMain.handle('get-selected-camera', () => {
    return store.get('selectedCamera') as string | undefined
  })

  // 设置选中的相机
  ipcMain.handle('set-selected-camera', (_, deviceId: string) => {
    store.set('selectedCamera', deviceId)
    return true
  })
}

// ============================================================================
// 应用生命周期
// ============================================================================
void (async () => {
  const handledByMaintenanceMode = await runMaintenanceModeIfNeeded()
  if (handledByMaintenanceMode) {
    return
  }

  // 单实例锁
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
    return
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app
    .whenReady()
    .then(async () => {
      await initModules()
      await clearAuthorizedExitFlag()

      app.setName('Lock It')
      electronApp.setAppUserModelId('com.electron.lockit')

      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
        if (!is.dev) {
          registerProductionShortcutGuards(window)
        }
      })

      setupIpcHandlers()
      syncStartupSettingFromConfig()
      setupAutoUpdater()
      createTray()
      await startWindowsWatchdog()

      const hasCompletedSetup = store.get('hasCompletedSetup') as boolean

      if (hasCompletedSetup) {
        // 已完成设置，直接后台运行
        startScheduleChecker()
      } else {
        // 首次启动，显示设置向导
        createMainWindow()
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow()
        }
      })
    })
    .catch((error) => {
      console.error('Application bootstrap failed:', error)
      isQuitAuthorized = true
      isQuitting = true
      app.quit()
    })

  app.on('window-all-closed', () => {
    // 保持后台运行，不退出
  })

  app.on('before-quit', (event) => {
    if (isQuitAuthorized) {
      isQuitting = true
      return
    }

    event.preventDefault()
    void initiateQuitFlow()
  })
})()
