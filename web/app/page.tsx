import { Nav } from "@/components/Nav";
import { Hero } from "@/components/landing/Hero";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
      </main>
    </>
  );
}
