import { Nav } from "@/components/Nav";
import { Capabilities } from "@/components/landing/Capabilities";
import { Faq } from "@/components/landing/Faq";
import { Cta, Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Impact } from "@/components/landing/Impact";
import { Pillars } from "@/components/landing/Pillars";
import { Problem } from "@/components/landing/Problem";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Capabilities />
        <Impact />
        <Pillars />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
