import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  initialConfiguration,
  rgbPresets,
  scenarioPresets,
  storageKey,
  type ProductConfiguration,
} from '../src/data/product';
import { useConfiguration } from '../src/hooks/useConfiguration';
import { AuroraConfigurator } from '../src/sections/AuroraConfigurator';
import { AuroraScenarios } from '../src/sections/AuroraScenarios';

const Harness = () => {
  const [configuration, setConfiguration] = useState<ProductConfiguration>(initialConfiguration);
  return (
    <>
      <AuroraScenarios configuration={configuration} setConfiguration={setConfiguration} />
      <AuroraConfigurator configuration={configuration} setConfiguration={setConfiguration} />
    </>
  );
};

const PersistentHarness = () => {
  const { configuration, setConfiguration } = useConfiguration();
  return <AuroraConfigurator configuration={configuration} setConfiguration={setConfiguration} />;
};

const getControl = (testId: string, value: string) => {
  const configurator = screen.getByTestId('inline-configurator');
  const control = within(configurator).getAllByTestId(testId).find((item) => item.getAttribute('data-value') === value);
  if (!control) throw new Error(`Не найден ${testId} со значением ${value}`);
  return control;
};

describe('AuroraConfigurator', () => {
  it('1. сохраняет единственную статичную галерею отдельно от настройки', () => {
    render(<Harness />);
    const gallery = screen.getByTestId('static-color-gallery');
    expect(within(gallery).getAllByRole('img')).toHaveLength(5);
    expect(gallery.querySelector('input, button, [role="slider"]')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('inline-configurator')).toHaveLength(1);
    expect(document.querySelector('dialog.aurora-config')).not.toBeInTheDocument();
  });

  it('2. сценарий из блока «Создавайте настроение» обновляет одно общее превью', () => {
    render(<Harness />);
    const preset = scenarioPresets[2];
    const scenario = screen.getAllByTestId('configurator-scenario').find((item) => item.getAttribute('data-value') === preset.id);
    if (!scenario) throw new Error('Сценарий не найден');
    fireEvent.click(scenario);
    const preview = screen.getByTestId('configurator-preview');
    expect(preview).toHaveAttribute('data-preset', preset.id);
    expect(preview).toHaveAttribute('data-color', preset.color);
    expect(preview).toHaveAttribute('data-height', preset.height);
    expect(preview).toHaveAttribute('data-rods', String(preset.rodCount));
    expect(preview).toHaveAttribute('data-mode', preset.controlMode);
    expect(preview).toHaveAttribute('data-brightness', String(preset.brightness));
    expect(preview).toHaveAttribute('data-saturation', String(preset.saturation));
  });

  it('3. RGB-пресет меняет единый цвет превью', () => {
    render(<Harness />);
    const color = getControl('configurator-color', rgbPresets[7].value);
    fireEvent.click(color);
    expect(color).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-color', rgbPresets[7].value);
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-preset', 'custom');
  });

  it('4. яркость меняет интенсивность, не меняя выбранный цвет', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Яркость' });
    const preview = screen.getByTestId('configurator-preview');
    const colorBefore = preview.getAttribute('data-color');
    fireEvent.change(slider, { target: { value: '31' } });
    expect(slider).toHaveValue('31');
    expect(preview).toHaveAttribute('data-brightness', '31');
    expect(preview).toHaveAttribute('data-color', colorBefore);
  });

  it('5. высота, число стержней и музыкальный режим входят в комбинацию', () => {
    render(<Harness />);
    fireEvent.click(getControl('configurator-height', 'height-140'));
    fireEvent.click(getControl('configurator-rods', '6'));
    fireEvent.click(getControl('configurator-mode', 'music-responsive'));
    const preview = screen.getByTestId('configurator-preview');
    expect(preview).toHaveAttribute('data-height', 'height-140');
    expect(preview).toHaveAttribute('data-rods', '6');
    expect(preview).toHaveAttribute('data-mode', 'music-responsive');
    expect(preview).toHaveAttribute('data-preset', 'custom');
  });

  it('5a. высота меняет только длину DOM-стержней, сохраняя единый якорь основания', () => {
    render(<Harness />);
    const configurator = screen.getByTestId('inline-configurator');
    const base = configurator.querySelector('.aurora-live-preview__base');
    const baseImage = base?.querySelector('img');
    expect(base).toBeInTheDocument();
    expect(baseImage).toHaveAttribute('src', '/assets/images/configurator/lamp-base-clean-5.png');
    const rod = configurator.querySelector<HTMLElement>('[data-testid="configurator-preview-rod"]');
    const initialHeight = Number.parseInt(rod?.style.getPropertyValue('--rod-height') ?? '0', 10);
    fireEvent.click(getControl('configurator-height', 'height-80'));
    const shortHeight = Number.parseInt(rod?.style.getPropertyValue('--rod-height') ?? '0', 10);
    expect(shortHeight).toBeLessThan(initialHeight);
    expect(baseImage).toHaveAttribute('src', '/assets/images/configurator/lamp-base-clean-5.png');
    fireEvent.click(getControl('configurator-height', 'height-160'));
    const tallRod = configurator.querySelector<HTMLElement>('[data-testid="configurator-preview-rod"]');
    const tallHeight = Number.parseInt(tallRod?.style.getPropertyValue('--rod-height') ?? '0', 10);
    expect(tallHeight).toBeGreaterThan(initialHeight);
    expect(baseImage).toHaveAttribute('src', '/assets/images/configurator/lamp-base-clean-5.png');
  });

  it('5b. естественный ореол не масштабирует фотографию и реагирует на яркость и насыщенность', () => {
    render(<Harness />);
    const configurator = screen.getByTestId('inline-configurator');
    const halo = configurator.querySelector('.aurora-live-preview__glow');
    const styleBefore = configurator.getAttribute('style');

    expect(halo).toBeInTheDocument();
    expect(halo).toHaveAttribute('aria-hidden', 'true');
    expect(styleBefore).toContain('--aurora-live-halo-opacity');
    expect(halo?.querySelector('img')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider', { name: 'Яркость' }), { target: { value: '35' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Насыщенность' }), { target: { value: '60' } });

    expect(configurator.getAttribute('style')).not.toBe(styleBefore);
    expect(halo?.querySelector('img')).not.toBeInTheDocument();
  });

  it.each([3, 4, 5, 6, 7] as const)(
    '5c.%s. корпус остаётся единым, а крышка и DOM-стержни синхронны с выбором',
    (rodCount) => {
      render(<Harness />);
      const configurator = screen.getByTestId('inline-configurator');
      fireEvent.click(getControl('configurator-rods', String(rodCount)));

      expect(configurator.querySelector('.aurora-live-preview__base img')).toHaveAttribute(
        'src',
        `/assets/images/configurator/lamp-base-clean-${rodCount}.png`,
      );
      expect(configurator.querySelectorAll('[data-testid="configurator-preview-rod"]')).toHaveLength(rodCount);
      expect(configurator.querySelector('[data-testid="configurator-preview-plate"]')).toHaveAttribute(
        'data-hole-count',
        String(rodCount),
      );
      expect(configurator.querySelectorAll('[data-testid="configurator-preview-rod"]')).toHaveLength(rodCount);
    },
  );

  it('4.1. насыщенность меняет цветовую интенсивность отдельно от яркости', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Насыщенность' });
    const preview = screen.getByTestId('configurator-preview');
    const brightnessBefore = preview.getAttribute('data-brightness');
    fireEvent.change(slider, { target: { value: '35' } });
    expect(slider).toHaveValue('35');
    expect(preview).toHaveAttribute('data-saturation', '35');
    expect(preview).toHaveAttribute('data-brightness', brightnessBefore);
  });

  it.each([3, 4, 5, 6, 7] as const)(
    '5.%s. число стержней реально меняет число элементов без смены корпуса',
    (rodCount) => {
      render(<Harness />);
      fireEvent.click(getControl('configurator-rods', String(rodCount)));

      const preview = screen.getByTestId('configurator-preview');
      const rods = screen.getAllByTestId('configurator-preview-rod');
      expect(preview).toHaveAttribute('data-rods', String(rodCount));
      expect(rods).toHaveLength(rodCount);
      expect(screen.getByTestId('configurator-preview-rods')).toHaveAccessibleName(
        `Демонстрационное превью светильника: ${rodCount} ${rodCount < 5 ? 'стержня' : 'стержней'}`,
      );
    },
  );

  it('6. сценарий внутри конфигуратора устанавливает полную комбинацию', () => {
    render(<Harness />);
    const preset = scenarioPresets[4];
    fireEvent.click(getControl('configurator-height', 'height-140'));
    fireEvent.click(getControl('configurator-rods', '6'));
    fireEvent.click(getControl('configurator-preset', preset.id));
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-preset', preset.id);
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-color', preset.color);
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-brightness', String(preset.brightness));
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-height', preset.height);
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('data-rods', String(preset.rodCount));
  });

  it('7. полная выбранная комбинация сохраняется и восстанавливается', async () => {
    const firstRender = render(<PersistentHarness />);
    const chosenColor = rgbPresets[5].value;
    fireEvent.click(getControl('configurator-color', chosenColor));
    fireEvent.click(getControl('configurator-height', 'height-140'));
    fireEvent.click(getControl('configurator-rods', '6'));
    fireEvent.click(getControl('configurator-mode', 'music-responsive'));
    fireEvent.change(screen.getByRole('slider', { name: 'Яркость' }), { target: { value: '44' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Насыщенность' }), { target: { value: '67' } });

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as Partial<ProductConfiguration>;
      expect(saved).toEqual({
        color: chosenColor,
        height: 'height-140',
        rodCount: 6,
        controlMode: 'music-responsive',
        brightness: 44,
        saturation: 67,
        scenario: 'custom',
      });
    });

    firstRender.unmount();
    render(<PersistentHarness />);
    const preview = screen.getByTestId('configurator-preview');
    expect(preview).toHaveAttribute('data-color', chosenColor);
    expect(preview).toHaveAttribute('data-height', 'height-140');
    expect(preview).toHaveAttribute('data-rods', '6');
    expect(preview).toHaveAttribute('data-mode', 'music-responsive');
    expect(screen.getByRole('slider', { name: 'Яркость' })).toHaveValue('44');
    expect(screen.getByRole('slider', { name: 'Насыщенность' })).toHaveValue('67');
  });
});
