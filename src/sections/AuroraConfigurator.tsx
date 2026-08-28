import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { Clock } from '@phosphor-icons/react/Clock';
import { Crosshair } from '@phosphor-icons/react/Crosshair';
import { DeviceMobile } from '@phosphor-icons/react/DeviceMobile';
import { Leaf } from '@phosphor-icons/react/Leaf';
import { Lightning } from '@phosphor-icons/react/Lightning';
import { Microphone } from '@phosphor-icons/react/Microphone';
import { Minus } from '@phosphor-icons/react/Minus';
import { MusicNotes } from '@phosphor-icons/react/MusicNotes';
import { Plus } from '@phosphor-icons/react/Plus';
import { Sparkle } from '@phosphor-icons/react/Sparkle';
import { SunHorizon } from '@phosphor-icons/react/SunHorizon';
import { Waveform } from '@phosphor-icons/react/Waveform';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { siteContent } from '../content/siteContent';
import {
  applyScenarioPreset,
  controlModes,
  heights,
  rgbPresets,
  rodCounts,
  scenarioPresets,
  serializeConfiguration,
  type ProductConfiguration,
} from '../data/product';
import './AuroraModules.css';

interface AuroraConfiguratorProps {
  configuration: ProductConfiguration;
  setConfiguration: Dispatch<SetStateAction<ProductConfiguration>>;
}

const methodIcons = {
  app: DeviceMobile,
  voice: Microphone,
  music: MusicNotes,
  timer: Clock,
};

const scenarioIcons = [Crosshair, Leaf, Sparkle, SunHorizon, Lightning];

const hexToHue = (hex: string) => {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  if (max === min) return 0;
  const delta = max - min;
  const raw = max === red
    ? ((green - blue) / delta) % 6
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4;
  return Math.round((raw * 60 + 360) % 360);
};

const hueToHex = (hue: number) => {
  const channel = (offset: number) => {
    const value = (offset + hue / 30) % 12;
    const component = 0.5 - 0.5 * Math.max(-1, Math.min(value - 3, Math.min(9 - value, 1)));
    return Math.round(255 * component).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const formatRodCount = (count: ProductConfiguration['rodCount']) =>
  `${count} ${count === 3 || count === 4 ? 'стержня' : 'стержней'}`;

const renderByRodCount: Record<ProductConfiguration['rodCount'], string> = {
  3: '/assets/images/configurator/lamp-render-3.png',
  4: '/assets/images/configurator/lamp-render-4.png',
  5: '/assets/images/configurator/lamp-render-5.png',
  6: '/assets/images/configurator/lamp-render-6.png',
  7: '/assets/images/configurator/lamp-render-7.png',
};

const rodLayouts = {
  3: [
    { x: -31, height: 0.68, depth: 1 },
    { x: 1, height: 1, depth: 0 },
    { x: 30, height: 0.82, depth: 2 },
  ],
  4: [
    { x: -38, height: 0.7, depth: 2 },
    { x: -12, height: 1, depth: 0 },
    { x: 12, height: 0.56, depth: 3 },
    { x: 37, height: 0.84, depth: 1 },
  ],
  5: [
    { x: -43, height: 0.68, depth: 3 },
    { x: -22, height: 0.88, depth: 1 },
    { x: 0, height: 1, depth: 0 },
    { x: 21, height: 0.57, depth: 4 },
    { x: 42, height: 0.8, depth: 2 },
  ],
  6: [
    { x: -45, height: 0.64, depth: 4 },
    { x: -28, height: 0.82, depth: 2 },
    { x: -10, height: 1, depth: 0 },
    { x: 9, height: 0.52, depth: 5 },
    { x: 27, height: 0.88, depth: 1 },
    { x: 44, height: 0.7, depth: 3 },
  ],
  7: [
    { x: -46, height: 0.56, depth: 5 },
    { x: -31, height: 0.78, depth: 3 },
    { x: -16, height: 1, depth: 0 },
    { x: 0, height: 0.64, depth: 4 },
    { x: 16, height: 0.9, depth: 1 },
    { x: 31, height: 0.49, depth: 6 },
    { x: 46, height: 0.72, depth: 2 },
  ],
} as const;

export const AuroraConfigurator = ({ configuration, setConfiguration }: AuroraConfiguratorProps) => {
  const selectedHeight = heights.find((item) => item.id === configuration.height) ?? heights[1];
  const selectedMode = controlModes.find((item) => item.id === configuration.controlMode) ?? controlModes[0];
  const rods = rodLayouts[configuration.rodCount];
  const maximumRodHeight = 220 + ((selectedHeight.centimeters - 80) / 80) * 200;
  const tabletRodHeight = 180 + ((selectedHeight.centimeters - 80) / 80) * 120;
  const mobileRodHeight = 150 + ((selectedHeight.centimeters - 80) / 80) * 75;
  const renderHeightScale = 0.72 + ((selectedHeight.centimeters - 80) / 80) * 0.28;

  const setCustom = (patch: Partial<ProductConfiguration>) => {
    setConfiguration((current) => ({ ...current, ...patch, scenario: 'custom' }));
  };

  const applyScenario = (index: number) => {
    setConfiguration((current) => applyScenarioPreset(current, index));
  };

  const previewStyle = {
    '--aurora-live-color': configuration.color,
    '--aurora-live-brightness': configuration.brightness / 100,
    '--aurora-live-hue': `${hexToHue(configuration.color) - 182}deg`,
    '--aurora-live-halo-opacity':
      (configuration.brightness / 100) * (0.22 + (configuration.saturation / 100) * 0.28),
    '--aurora-live-saturation': configuration.color.toUpperCase() === '#F3F3F3'
      ? 0
      : 0.25 + (configuration.saturation / 100) * 1.35,
    '--aurora-render-height-scale': renderHeightScale,
  } as CSSProperties;

  return (
    <section className="aurora-controls" id="controls" aria-labelledby="controls-title">
      <header className="aurora-controls__header">
        <h2 id="controls-title">{siteContent.controls.title}</h2>
        <p>{siteContent.controls.text}</p>
      </header>

      <div className="aurora-control-methods">
        {siteContent.controls.methods.map((method) => {
          const MethodIcon = methodIcons[method.icon];
          return (
            <article key={method.title}>
              <MethodIcon size={43} weight="thin" aria-hidden="true" />
              <h3>{method.title}</h3>
              <p>{method.text}</p>
            </article>
          );
        })}
      </div>

      <section
        className="aurora-live-configurator"
        id="configurator"
        aria-labelledby="configurator-title"
        data-testid="inline-configurator"
        style={previewStyle}
      >
        <div className="aurora-live-configurator__controls">
          <span className="aurora-kicker">Настройка света</span>
          <h2 id="configurator-title">{siteContent.controls.configurator.title}</h2>
          <p>{siteContent.controls.configurator.text}</p>

          <fieldset>
            <legend>Высота</legend>
            <div className="aurora-option-grid aurora-option-grid--five">
              {heights.map((height) => (
                <button
                  key={height.id}
                  type="button"
                  aria-pressed={configuration.height === height.id}
                  data-testid="configurator-height"
                  data-value={height.id}
                  onClick={() => setCustom({ height: height.id })}
                >
                  {height.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Количество стержней</legend>
            <div className="aurora-option-grid aurora-option-grid--five">
              {rodCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={configuration.rodCount === count}
                  data-testid="configurator-rods"
                  data-value={count}
                  onClick={() => setCustom({ rodCount: count })}
                >
                  {count}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Цвет свечения</legend>
            <div className="aurora-live-swatches">
              {rgbPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={configuration.color.toUpperCase() === preset.value}
                  data-testid="configurator-color"
                  data-value={preset.value}
                  style={{ '--swatch': preset.value } as CSSProperties}
                  onClick={() => setCustom({ color: preset.value })}
                />
              ))}
            </div>
            <label className="aurora-hue-range">
              <span className="sr-only">Оттенок RGB</span>
              <input
                id="hue"
                type="range"
                min="0"
                max="359"
                value={hexToHue(configuration.color)}
                aria-label="Оттенок RGB"
                onChange={(event) => setCustom({ color: hueToHex(Number(event.target.value)) })}
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Режим управления</legend>
            <div className="aurora-option-grid aurora-option-grid--three">
              {controlModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={configuration.controlMode === mode.id}
                  data-testid="configurator-mode"
                  data-value={mode.id}
                  onClick={() => setCustom({ controlMode: mode.id })}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="aurora-brightness-control">
            <span>Яркость</span>
            <div>
              <button
                type="button"
                aria-label="Уменьшить яркость"
                onClick={() => setCustom({ brightness: clampPercentage(configuration.brightness - 5) })}
              >
                <Minus size={17} weight="thin" aria-hidden="true" />
              </button>
              <input
                id="brightness"
                type="range"
                min="0"
                max="100"
                step="1"
                value={configuration.brightness}
                aria-label="Яркость"
                onChange={(event) => setCustom({ brightness: Number(event.target.value) })}
              />
              <output>{configuration.brightness}%</output>
              <button
                type="button"
                aria-label="Увеличить яркость"
                onClick={() => setCustom({ brightness: clampPercentage(configuration.brightness + 5) })}
              >
                <Plus size={17} weight="thin" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="aurora-brightness-control aurora-saturation-control">
            <span>Насыщенность</span>
            <div>
              <button
                type="button"
                aria-label="Уменьшить насыщенность"
                onClick={() => setCustom({ saturation: clampPercentage(configuration.saturation - 5) })}
              >
                <Minus size={17} weight="thin" aria-hidden="true" />
              </button>
              <input
                id="saturation"
                type="range"
                min="0"
                max="100"
                step="1"
                value={configuration.saturation}
                aria-label="Насыщенность"
                onChange={(event) => setCustom({ saturation: Number(event.target.value) })}
              />
              <output>{configuration.saturation}%</output>
              <button
                type="button"
                aria-label="Увеличить насыщенность"
                onClick={() => setCustom({ saturation: clampPercentage(configuration.saturation + 5) })}
              >
                <Plus size={17} weight="thin" aria-hidden="true" />
              </button>
            </div>
          </div>

          <fieldset>
            <legend>Сценарии</legend>
            <div className="aurora-config-presets">
              {siteContent.scenarios.modes.map((mode, index) => {
                const ScenarioIcon = scenarioIcons[index];
                const preset = scenarioPresets[index];
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={configuration.scenario === preset.id}
                    data-testid="configurator-preset"
                    data-value={preset.id}
                    onClick={() => applyScenario(index)}
                  >
                    <ScenarioIcon size={18} weight="thin" aria-hidden="true" />
                    {mode}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <a className="aurora-configurator-action" href="#request">
            Добавить выбранное к заявке
            <ArrowRight size={16} weight="thin" aria-hidden="true" />
          </a>
        </div>

        <div
          className={`aurora-live-preview aurora-live-preview--${configuration.controlMode}`}
          data-testid="configurator-preview"
          data-color={configuration.color.toUpperCase()}
          data-height={configuration.height}
          data-rods={configuration.rodCount}
          data-mode={configuration.controlMode}
          data-brightness={configuration.brightness}
          data-saturation={configuration.saturation}
          data-preset={configuration.scenario}
        >
          <span className="aurora-live-preview__label">{siteContent.controls.configurator.previewLabel}</span>
          <div className="aurora-live-preview__mode">
            <Waveform size={34} weight="thin" aria-hidden="true" />
            <span>{selectedMode.label}</span>
          </div>
          <div className="aurora-live-preview__image">
            <div className="aurora-live-preview__glow" aria-hidden="true">
            </div>
            <div
              className={`aurora-live-preview__render-frame aurora-live-preview__render-frame--${configuration.rodCount}`}
              role="img"
              aria-label={`Демонстрационное превью светильника: ${formatRodCount(configuration.rodCount)}`}
            >
              <img
                className="aurora-live-preview__render aurora-live-preview__render--rods"
                src={renderByRodCount[configuration.rodCount]}
                alt=""
                width="1024"
                height="1536"
                loading="eager"
              />
              <div className="aurora-live-preview__base" data-testid="configurator-preview-base" aria-hidden="true">
                <img
                  className="aurora-live-preview__render aurora-live-preview__render--base"
                  data-testid="configurator-preview-plate"
                  data-hole-count={configuration.rodCount}
                  src={renderByRodCount[configuration.rodCount]}
                  alt=""
                  width="1024"
                  height="1536"
                  loading="eager"
                />
              </div>
            </div>
            <div
              className="aurora-live-preview__rods aurora-live-preview__rods--semantic"
              data-testid="configurator-preview-rods"
              aria-hidden="true"
            >
              {rods.map((rod, index) => (
                <span
                  className="aurora-live-preview__rod"
                  data-testid="configurator-preview-rod"
                  key={`${configuration.rodCount}-${index}`}
                  style={{
                    '--rod-x': `${rod.x}px`,
                    '--rod-height': `${Math.round(maximumRodHeight * rod.height)}px`,
                    '--rod-height-tablet': `${Math.round(tabletRodHeight * rod.height)}px`,
                    '--rod-height-mobile': `${Math.round(mobileRodHeight * rod.height)}px`,
                    '--rod-depth': rod.depth,
                    '--rod-delay': `${index * -0.19}s`,
                  } as CSSProperties}
                />
              ))}
            </div>
          </div>
          <div className="aurora-live-preview__meta" aria-hidden="true">
            <span>{selectedHeight.label}</span>
            <span>{formatRodCount(configuration.rodCount)}</span>
          </div>
          <p>{siteContent.controls.configurator.previewNote}</p>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{serializeConfiguration(configuration)}</p>
        </div>
      </section>
    </section>
  );
};
