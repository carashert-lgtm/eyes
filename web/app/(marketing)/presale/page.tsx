import { PresaleHero } from '@/components/presale/PresaleHero'
import { StatusStrip } from '@/components/presale/StatusStrip'
import { PresalePurchasePanel } from '@/components/presale/PresalePurchasePanel'
import { Transparency } from '@/components/presale/Transparency'
import { PresaleSteps } from '@/components/presale/PresaleSteps'
import { PresaleFaq } from '@/components/presale/PresaleFaq'
import { DisclaimerBar } from '@/components/presale/DisclaimerBar'

export default function PresalePage() {
  return (
    <>
      <PresaleHero />
      <StatusStrip />
      <PresalePurchasePanel />
      <Transparency />
      <PresaleSteps />
      <PresaleFaq />
      <DisclaimerBar />
    </>
  )
}
