import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { deriveEncryptionKey } from '../lib/crypto'

interface WalletCtx {
  address: string | null
  encryptionKey: CryptoKey | null
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletCtx | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    const ethereum = (window as any).ethereum
    if (!ethereum) {
      setError('MetaMask not installed. Please install it to continue.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access
      const accounts: string[] = await ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (!accounts.length) throw new Error('No accounts returned')
      const addr = accounts[0]

      // Derive encryption key from wallet signature
      const key = await deriveEncryptionKey(addr)

      setAddress(addr)
      setEncryptionKey(key)
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the MetaMask request.')
      } else {
        setError(err.message ?? 'Failed to connect wallet')
      }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setEncryptionKey(null)
    setError(null)
  }, [])

  return (
    <WalletContext.Provider
      value={{ address, encryptionKey, isConnecting, error, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
