import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import LockScreenView, { LockScreenStyleConfig } from './components/LockScreenView'

export default function PreviewScreen() {
  const [payload, setPayload] = useState<{
    style: LockScreenStyleConfig
    mode: 'dark' | 'light'
  } | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    void window.api.getPreviewStyle().then((value) => {
      setPayload(value as { style: LockScreenStyleConfig; mode: 'dark' | 'light' })
    })

    window.api.onPreviewStyleUpdated((value) => {
      setPayload(value as { style: LockScreenStyleConfig; mode: 'dark' | 'light' })
    })

    const timer = setInterval(() => setNow(new Date()), 1000)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void window.api.closePreviewWindow()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearInterval(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  if (!payload) {
    return <div className="h-screen w-screen bg-black" />
  }

  const { style, mode } = payload
  const backgroundColor = mode === 'light' ? style.lightBackgroundColor || '#fafafa' : style.backgroundColor
  const textColor = mode === 'light' ? style.lightTextColor || '#171717' : style.textColor

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <LockScreenView
        style={style}
        currentTime={now}
        backgroundColor={backgroundColor}
        textColor={textColor}
        className="absolute inset-0"
      />

      <button
        onClick={() => void window.api.closePreviewWindow()}
        className="absolute top-5 right-5 z-20 px-3 py-2 text-sm border border-white/30 text-white/90 hover:bg-white/10"
      >
        <X className="w-4 h-4 inline-block mr-1" />
        关闭预览
      </button>
    </div>
  )
}
