import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Token } from '@/components/sections/Token'
import { LaunchSupport } from '@/components/sections/LaunchSupport'
import { Features } from '@/components/sections/Features'
import { FinalCta } from '@/components/sections/FinalCta'

export default function Page() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <Token />
        <LaunchSupport />
        <Features />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
