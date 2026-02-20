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

export interface LockScreenStyleConfig {
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
  textOpacities?: TextOpacityConfig
  imageScales?: ImageScaleConfig
  lightBackgroundColor?: string
  lightTextColor?: string
  timePosition: 'hidden' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  timeFormat: string
  fontSizes: FontSizeConfig
  textAligns: TextAlignConfig
  fontWeights: FontWeightConfig
  layout: LayoutConfig
}

const fontWeightMap = {
  light: 300,
  normal: 400,
  medium: 500,
  bold: 700
} as const

function clampOpacity(opacity: number | undefined): number {
  if (typeof opacity !== 'number' || Number.isNaN(opacity)) return 1
  return Math.max(0, Math.min(100, opacity)) / 100
}

function clampScale(scale: number | undefined): number {
  if (typeof scale !== 'number' || Number.isNaN(scale)) return 100
  return Math.max(10, Math.min(300, scale))
}

function getBoxSpacing(value: number): { padding: number; margin: number } {
  if (value >= 0) return { padding: value, margin: 0 }
  return { padding: 0, margin: value }
}

function formatTime(date: Date, format: string): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  return (format || 'HH:mm:ss')
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
    .replace('YYYY', date.getFullYear().toString())
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
}

function getTextAlign(style: LockScreenStyleConfig, side: 'left' | 'right') {
  if (side === 'left') {
    return style.textAligns.bottomLeftText || style.textAligns.bottomText || 'left'
  }
  return style.textAligns.bottomRightText || style.textAligns.bottomText || 'right'
}

export default function LockScreenView({
  style,
  currentTime,
  backgroundColor,
  textColor,
  className = ''
}: {
  style: LockScreenStyleConfig
  currentTime: Date
  backgroundColor: string
  textColor: string
  className?: string
}) {
  const fallbackOpacity = clampOpacity(style.textOpacity)
  const centerOpacity = style.textOpacities
    ? clampOpacity(style.textOpacities.centerText)
    : fallbackOpacity
  const subOpacity = style.textOpacities ? clampOpacity(style.textOpacities.subText) : fallbackOpacity
  const bottomLeftOpacity = style.textOpacities
    ? clampOpacity(style.textOpacities.bottomLeftText)
    : fallbackOpacity
  const bottomRightOpacity = style.textOpacities
    ? clampOpacity(style.textOpacities.bottomRightText)
    : fallbackOpacity
  const previewTimeText = formatTime(currentTime, style.timeFormat)

  const renderCornerContent = (side: 'left' | 'right') => {
    const isLeft = side === 'left'
    const mode = isLeft ? style.bottomLeftMode : style.bottomRightMode
    const image = isLeft ? style.bottomLeftImage : style.bottomRightImage
    const text = (isLeft ? style.bottomLeftText : style.bottomRightText).trim()
    const width = isLeft ? style.layout.bottomLeftWidth : style.layout.bottomRightWidth
    const padding = isLeft ? style.layout.bottomLeftPadding : style.layout.bottomRightPadding
    const align = getTextAlign(style, side)
    const spacing = getBoxSpacing(padding)
    const imageScale = clampScale(
      isLeft ? style.imageScales?.bottomLeft || 100 : style.imageScales?.bottomRight || 100
    )
    const cornerTextOpacity = isLeft ? bottomLeftOpacity : bottomRightOpacity

    if (mode === 'image') {
      if (!image) return null
      return (
        <div style={{ width: `${width}%`, padding: spacing.padding, margin: spacing.margin }}>
          <img
            src={image}
            alt={isLeft ? 'bottom-left' : 'bottom-right'}
            className={`${isLeft ? '' : 'ml-auto'} max-w-full max-h-28 object-contain`}
            style={{
              transform: `scale(${imageScale / 100})`,
              transformOrigin: isLeft ? 'left bottom' : 'right bottom'
            }}
            draggable={false}
          />
        </div>
      )
    }

    if (!text) return null

    return (
      <div
        className="whitespace-pre-line"
        style={{
          width: `${width}%`,
          padding: spacing.padding,
          margin: spacing.margin,
          textAlign: align,
          textJustify: 'inter-character',
          textAlignLast: align === 'justify' ? 'justify' : align,
          opacity: cornerTextOpacity,
          fontWeight: fontWeightMap[style.fontWeights?.bottomText || 'normal'],
          fontSize: style.fontSizes?.bottomText || 14
        }}
      >
        {text}
      </div>
    )
  }

  const leftCorner = renderCornerContent('left')
  const rightCorner = renderCornerContent('right')

  return (
    <div className={`relative w-full h-full ${className}`} style={{ backgroundColor, color: textColor }}>
      {style.timePosition !== 'hidden' && style.timePosition !== 'center' && (
        <div
          className={`absolute font-mono ${
            style.timePosition === 'top-left'
              ? 'top-8 left-8'
              : style.timePosition === 'top-right'
                ? 'top-8 right-8'
                : style.timePosition === 'bottom-left'
                  ? 'left-8'
                  : 'right-8'
          }`}
          style={{
            opacity: subOpacity,
            fontSize: style.fontSizes?.timeText || 18,
            textAlign: style.textAligns?.subText || 'center',
            transform: `translate(${style.layout.timeOffsetX}px, ${style.layout.timeOffsetY}px)`,
            bottom:
              style.timePosition === 'bottom-left' || style.timePosition === 'bottom-right'
                ? style.layout.bottomOffsetY + 56
                : undefined
          }}
        >
          {previewTimeText}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div
          className="w-full mx-auto"
          style={{
            maxWidth: '96rem',
            width: `${style.layout.centerWidth}%`,
            padding: getBoxSpacing(style.layout.centerPadding).padding,
            margin: getBoxSpacing(style.layout.centerPadding).margin,
            transform: `translate(${style.layout.centerOffsetX}px, ${style.layout.centerOffsetY}px)`
          }}
        >
          {style.timePosition === 'center' && (
            <div
              className="font-mono mb-5"
              style={{
                opacity: subOpacity,
                fontSize: style.fontSizes?.timeText || 18,
                textAlign: style.textAligns?.subText || 'center'
              }}
            >
              {previewTimeText}
            </div>
          )}

          {style.centerText.trim() && (
            <h1
              className="whitespace-pre-line leading-relaxed"
              style={{
                opacity: centerOpacity,
                fontSize: style.fontSizes?.centerText || 48,
                fontWeight: fontWeightMap[style.fontWeights?.centerText || 'medium'],
                textAlign: style.textAligns?.centerText || 'center',
                textJustify: 'inter-character',
                textAlignLast:
                  style.textAligns?.centerText === 'justify'
                    ? 'justify'
                    : style.textAligns?.centerText || 'center'
              }}
            >
              {style.centerText}
            </h1>
          )}

          {style.subText.trim() && (
            <p
              className="whitespace-pre-line mt-4"
              style={{
                opacity: subOpacity,
                fontSize: style.fontSizes?.subText || 24,
                fontWeight: fontWeightMap[style.fontWeights?.subText || 'normal'],
                textAlign: style.textAligns?.subText || 'center',
                textJustify: 'inter-character',
                textAlignLast:
                  style.textAligns?.subText === 'justify'
                    ? 'justify'
                    : style.textAligns?.subText || 'center'
              }}
            >
              {style.subText}
            </p>
          )}
        </div>
      </div>

      {(leftCorner || rightCorner) && (
        <div
          className="absolute flex items-end justify-between gap-4 pointer-events-none"
          style={{
            bottom: style.layout.bottomOffsetY,
            left: style.layout.bottomOffsetX,
            right: style.layout.bottomOffsetX
          }}
        >
          {leftCorner || <div />}
          {rightCorner || <div />}
        </div>
      )}
    </div>
  )
}
