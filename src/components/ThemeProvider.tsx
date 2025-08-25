import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  // resolvedTheme reflete o tema efetivo aplicado (dark/light), inclusive quando theme === 'system'
  resolvedTheme: Exclude<Theme, "system">
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<Exclude<Theme, "system">>(() => {
    if (typeof window === "undefined") return "light"
    const stored = (localStorage.getItem(storageKey) as Theme) || defaultTheme
    if (stored === "dark" || stored === "light") return stored
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    return prefersDark ? "dark" : "light"
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    const apply = (mode: "light" | "dark") => {
      root.classList.remove(mode === "dark" ? "light" : "dark")
      root.classList.add(mode)
      setResolvedTheme(mode)
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const systemMode: "light" | "dark" = mq.matches ? "dark" : "light"
      apply(systemMode)

      const listener = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light")
      // Escuta mudanças do sistema enquanto em 'system'
      mq.addEventListener?.("change", listener)
      return () => mq.removeEventListener?.("change", listener)
    } else {
      apply(theme)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    resolvedTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}