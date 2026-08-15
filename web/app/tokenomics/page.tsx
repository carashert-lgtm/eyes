import type { Metadata } from "next";
import { TokenomicsHero, TokenomicsCta } from "@/components/tokenomics/TokenomicsHero";
import { SupplySection } from "@/components/tokenomics/SupplySection";
import { FeeFlywheelSection } from "@/components/tokenomics/FeeFlywheelSection";
import { ValueSection } from "@/components/tokenomics/ValueSection";
import { EyesWindowSection } from "@/components/tokenomics/EyesWindowSection";

export const metadata: Metadata = {
  title: "Tokenomics | Eyes Open ($EYES)",
  description:
    "Fixed 1B supply, 1% trading fees, 50% creator / 50% buy-and-burn flywheel. How $EYES captures value from every fair launch on Eyes Open.",
  openGraph: {
    title: "Eyes Open Tokenomics | $EYES",
    description: "Every launch. Every trade. Less $EYES.",
  },
};

export default function TokenomicsPage() {
  return (
    <>
      <TokenomicsHero />
      <SupplySection />
      <FeeFlywheelSection />
      <ValueSection />
      <EyesWindowSection />
      <TokenomicsCta />
    </>
  );
}
