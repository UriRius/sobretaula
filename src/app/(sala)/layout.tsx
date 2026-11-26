// La sala va a pantalla completa, sense navegació: a taula, només el que toca.
export default function RoomLayout({ children }: LayoutProps<'/'>) {
  return <div className="min-h-dvh bg-canvas">{children}</div>
}
