interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  // Settings navigation is now in the main sidebar (expandable)
  // This layout just renders children with full width
  return <div className="w-full">{children}</div>
}
