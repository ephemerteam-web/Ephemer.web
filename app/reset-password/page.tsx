'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  // ✅ Calcul force mot de passe
  const getStrength = () => {
    if (password.length < 6) return 'faible'
    if (password.match(/^(?=.*[A-Z])(?=.*[0-9])/)) return 'fort'
    return 'moyen'
  }

  const handleResetPassword = async () => {
    setLoading(true)
    setMessage('')

    if (password.length < 6) {
      setIsError(true)
      setMessage('Mot de passe trop court')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setIsError(true)
      setMessage('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setIsError(true)
      setMessage('❌ ' + error.message)
    } else {
      setIsError(false)
      setMessage('✅ Mot de passe mis à jour')

      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }

    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f172a]">

        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl">

          <h1 className="text-2xl font-semibold mb-6 text-center text-white">
            🔐 Nouveau mot de passe
          </h1>

          {/* PASSWORD */}
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-12 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
            />

            {/* 👁 toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400"
            >
              👁
            </button>
          </div>

          {/* STRENGTH */}
          {password && (
            <p className="text-sm mb-3 text-gray-300">
              Sécurité :{' '}
              <span
                className={
                  getStrength() === 'faible'
                    ? 'text-red-400'
                    : getStrength() === 'moyen'
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }
              >
                {getStrength()}
              </span>
            </p>
          )}

          {/* CONFIRM */}
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]"
          />

          {/* BUTTON */}
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full bg-[#C8A84E] text-black py-3 rounded-xl font-semibold hover:opacity-90 transition"
          >
            {loading ? 'Chargement...' : 'Valider'}
          </button>

          {/* MESSAGE */}
          {message && (
            <p
              className={`mt-4 text-sm text-center ${
                isError ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {message}
            </p>
          )}

        </div>

      </div>
    </AppLayout>
  )
}
