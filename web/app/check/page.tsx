import { Nav } from "@/components/Nav";
import { CheckNetwork } from "@/components/check/CheckNetwork";

export const metadata = { title: "Check your network · Nightwatch" };

export default function Page() {
  return (
    <>
      <Nav />
      <main className="app-bg flex-1">
        <CheckNetwork />
      </main>
    </>
  );
}
