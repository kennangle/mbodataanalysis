import { ThemeProvider } from "../ThemeProvider";
import { LandingHero } from "../LandingHero";

export default function LandingHeroExample() {
  return (
    <ThemeProvider>
      <LandingHero />
    </ThemeProvider>
  );
}
