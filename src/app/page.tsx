import CTASection from '@/components/landing/CTASection'
import DemoSection from '@/components/landing/DemoSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import Footer from '@/components/landing/Footer'
import ForWhoSection from '@/components/landing/ForWhoSection'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import Navbar from '@/components/landing/Navbar'
import ProblemsSection from '@/components/landing/ProblemsSection'
import ResultsSection from '@/components/landing/ResultsSection'
import TechStackSection from '@/components/landing/TechStackSection'

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Navbar />
      <HeroSection />
      <ProblemsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ForWhoSection />
      <DemoSection />
      <TechStackSection />
      <ResultsSection />
      <CTASection />
      <Footer />
    </main>
  )
}