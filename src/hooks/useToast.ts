import { createContext, useContext } from 'react'

export const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {})

/** Returns `toast(text, isError?)`. */
export function useToast() {
  return useContext(ToastContext)
}
