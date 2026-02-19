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

// ============================================================================
// 全局状态
// ============================================================================
let mainWindow: BrowserWindow | null = null
let lockWindow: BrowserWindow | null = null
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
  bottomText: 'center'
})

const defaultFontWeights = (): FontWeightConfig => ({
  centerText: 'medium',
  subText: 'normal',
  bottomText: 'normal'
})

const defaultStyle = (): StyleConfig => ({
  themeMode: 'dark',
  centerText: '此计算机因违规外联已被阻断',
  subText: '请等待安全部门与你联系',
  bottomLeftText: '夏莱保密委员会办公室\n联邦学生会意识形态工作领导小组办公室',
  bottomRightText: '',
  backgroundColor: '#0066cc',
  textColor: '#ffffff',
  lightBackgroundColor: '#e0f2fe',
  lightTextColor: '#1e3a5f',
  timePosition: 'hidden',
  timeFormat: 'HH:mm:ss',
  closeScreenPrompt: '请关闭班级大屏后再继续操作',
  fontSizes: defaultFontSizes(),
  textAligns: defaultTextAligns(),
  fontWeights: defaultFontWeights()
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

  return {
    ...defaults,
    ...source,
    fontSizes: {
      ...defaults.fontSizes,
      ...(source.fontSizes || {})
    },
    textAligns: {
      ...defaults.textAligns,
      ...(source.textAligns || {})
    },
    fontWeights: {
      ...defaults.fontWeights,
      ...(source.fontWeights || {})
    }
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
  autoUpdater.allowPrerelease = update.channel === 'preview'
  autoUpdater.autoDownload = update.autoDownload
  autoUpdater.autoInstallOnAppQuit = update.autoInstallOnQuit
  return update
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

    if (targetVersion) {
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
        isQuitting = true
        app.quit()
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
        }
      })
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

  ipcMain.handle('check-for-updates', async () => {
    return runUpdateCheck(true)
  })

  ipcMain.handle('install-downloaded-update', () => {
    if (is.dev) return false
    if (updaterState.status !== 'downloaded') return false
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
app
  .whenReady()
  .then(async () => {
    await initModules()

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
    app.quit()
  })

app.on('window-all-closed', () => {
  // 保持后台运行，不退出
})

app.on('before-quit', () => {
  isQuitting = true
})

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
