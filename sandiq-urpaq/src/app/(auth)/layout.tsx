export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink grid md:grid-cols-2">
      {/* Left decorative panel */}
      <div className="hidden md:flex flex-col justify-center px-16 relative overflow-hidden
                      bg-gradient-to-br from-ink to-[#1A1610]">
        {/* Ornament bg */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{
               backgroundImage: `repeating-linear-gradient(45deg, #C8972A 0, #C8972A 1px, transparent 0, transparent 50%),
                                  repeating-linear-gradient(-45deg, #C8972A 0, #C8972A 1px, transparent 0, transparent 50%)`,
               backgroundSize: '24px 24px',
             }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 30% 70%, rgba(200,151,42,0.12), transparent 58%)',
          }}
        />

        <div className="relative z-10">
          <div className="font-display font-black text-gold-2 text-2xl tracking-widest mb-2">
            Sandy<span className="text-gold">Q</span> Urpa<span className="text-gold">Q</span>
          </div>
          <div className="font-mono text-[10px] tracking-[4px] text-gold/60 uppercase mb-16">
            Память семьи в цифровом формате
          </div>

          <blockquote className="font-body italic text-parchment/60 text-2xl leading-relaxed mb-12 max-w-sm">
            «Жеті атаңды білмесең — жетімсің»
          </blockquote>
          <p className="font-mono text-[10px] text-parchment/30 tracking-widest">
            — Казахская пословица
          </p>

          <div className="mt-20 space-y-6">
            {[
              { icon: '🌳', text: 'Семейное дерево с приглашениями для родственников' },
              { icon: '🎙️', text: 'Фото, аудио и истории в одном аккуратном архиве' },
              { icon: '🤖', text: 'Подсказки для интервью и оформления биографии' },
              { icon: '🏅', text: 'Именной сертификат участника проекта' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-4">
                <span className="text-xl">{item.icon}</span>
                <span className="font-body text-parchment/50 text-base">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-16 safe-area-inset">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
