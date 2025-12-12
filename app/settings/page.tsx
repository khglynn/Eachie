/**
 * Settings Page
 *
 * Protected server component that redirects unauthenticated users.
 * Renders the client-side SettingsPage component.
 *
 * Created: December 2024
 */

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SettingsPage } from '@/components/settings/SettingsPage'

export const metadata = {
  title: 'Settings | Eachie',
  description: 'Manage your Eachie account settings',
}

export default async function Settings() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?redirect_url=/settings')
  }

  return <SettingsPage />
}
