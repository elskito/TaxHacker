export default function UnsortedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-60px)] w-full max-w-6xl flex-col justify-center gap-4 p-4 md:min-h-svh">
      {children}
    </div>
  )
}
