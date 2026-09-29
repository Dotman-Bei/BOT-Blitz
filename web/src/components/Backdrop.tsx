/** Fixed wash plus three blooms, already out of phase on first paint (negative delays). */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page-wash">
      <div className="absolute -left-[15%] -top-[10%] h-[55%] w-[60%] animate-blob rounded-full will-change-transform bg-[radial-gradient(circle,rgba(127,158,224,0.28),transparent_65%)]" />
      <div className="absolute -right-[10%] top-[5%] h-[50%] w-[55%] animate-blob rounded-full will-change-transform bg-[radial-gradient(circle,rgba(100,196,204,0.22),transparent_65%)] [animation-delay:-6s]" />
      <div className="absolute bottom-[10%] left-[20%] h-[45%] w-[60%] animate-blob rounded-full will-change-transform bg-[radial-gradient(circle,rgba(158,178,229,0.2),transparent_65%)] [animation-delay:-12s]" />
    </div>
  )
}
