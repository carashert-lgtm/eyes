import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Token } from '@/components/sections/Token'
import { LaunchSupport } from '@/components/sections/LaunchSupport'
import { Features } from '@/components/sections/Features'
import { FinalCta } from '@/components/sections/FinalCta'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <Token />
      <LaunchSupport />
      <Features />
      <FinalCta />
    </>
  )
}
