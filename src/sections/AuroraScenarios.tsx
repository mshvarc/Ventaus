import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { BookOpen } from '@phosphor-icons/react/BookOpen';
import { Crosshair } from '@phosphor-icons/react/Crosshair';
import { FilmSlate } from '@phosphor-icons/react/FilmSlate';
import { MusicNote } from '@phosphor-icons/react/MusicNote';
import { Sparkle } from '@phosphor-icons/react/Sparkle';
import { type Dispatch, type SetStateAction } from 'react';
import { OptimizedImage } from '../components/OptimizedImage';
import { auroraScenarioCards, siteContent } from '../content/siteContent';
import { applyScenarioPreset, scenarioPresets, type ProductConfiguration } from '../data/product';

interface AuroraScenariosProps {
  configuration: ProductConfiguration;
  setConfiguration: Dispatch<SetStateAction<ProductConfiguration>>;
}

const modeIcons = [BookOpen, Crosshair, Sparkle, MusicNote, FilmSlate];

export const AuroraScenarios = ({ configuration, setConfiguration }: AuroraScenariosProps) => {
  const applyScenario = (index: number) => {
    setConfiguration((current) => applyScenarioPreset(current, index));
  };

  return (
    <section className="aurora-scenarios" id="scenarios" aria-labelledby="scenarios-title">
      <div className="aurora-scenarios__intro">
        <h2 id="scenarios-title">{siteContent.scenarios.title}</h2>
        <p>{siteContent.scenarios.text}</p>
        <div className="aurora-scenario-modes" aria-label="Готовые сценарии">
          {siteContent.scenarios.modes.map((mode, index) => {
            const ModeIcon = modeIcons[index];
            const preset = scenarioPresets[index];
            return (
              <button
                key={mode}
                type="button"
                aria-label={`Выбрать сценарий «${mode}»`}
                aria-pressed={configuration.scenario === preset.id}
                data-testid="configurator-scenario"
                data-value={preset.id}
                onClick={() => applyScenario(index)}
              >
                <span><ModeIcon size={18} weight="thin" aria-hidden="true" /></span>
                {mode}
              </button>
            );
          })}
        </div>
        <a className="aurora-text-action" href="#configurator">
          {siteContent.scenarios.action}
          <ArrowRight size={16} weight="thin" aria-hidden="true" />
        </a>
      </div>

      <div className="aurora-gallery" data-testid="static-color-gallery">
        {auroraScenarioCards.map((card) => (
          <figure key={card.id}>
            <OptimizedImage src={card.image} alt={`Светильник — сценарий «${card.title}»`} width={card.width} height={card.height} loading="lazy" />
            <figcaption>{card.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
