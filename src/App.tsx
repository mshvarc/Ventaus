import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { useConfiguration } from './hooks/useConfiguration';
import { AuroraConfigurator } from './sections/AuroraConfigurator';
import { AuroraFeatures } from './sections/AuroraFeatures';
import { AuroraScenarios } from './sections/AuroraScenarios';
import { AuroraTechnical } from './sections/AuroraTechnical';
import { Hero } from './sections/Hero';
import { LeadForm } from './sections/LeadForm';

export const App = () => {
  const { configuration, setConfiguration } = useConfiguration();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <AuroraFeatures />
        <AuroraScenarios configuration={configuration} setConfiguration={setConfiguration} />
        <AuroraConfigurator configuration={configuration} setConfiguration={setConfiguration} />
        <AuroraTechnical />
        <LeadForm configuration={configuration} />
      </main>
      <Footer />
    </>
  );
};
