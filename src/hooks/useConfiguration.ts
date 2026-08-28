import { useEffect, useState } from 'react';
import {
  controlModes,
  heights,
  initialConfiguration,
  isRgbHex,
  rodCounts,
  scenarioPresets,
  storageKey,
  type ProductConfiguration,
} from '../data/product';

const isConfiguration = (value: unknown): value is ProductConfiguration => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProductConfiguration>;
  return (
    isRgbHex(candidate.color) &&
    heights.some((item) => item.id === candidate.height) &&
    rodCounts.some((count) => count === candidate.rodCount) &&
    controlModes.some((mode) => mode.id === candidate.controlMode) &&
    typeof candidate.brightness === 'number' &&
    candidate.brightness >= 0 &&
    candidate.brightness <= 100 &&
    typeof candidate.saturation === 'number' &&
    candidate.saturation >= 0 &&
    candidate.saturation <= 100 &&
    (candidate.scenario === 'custom' || scenarioPresets.some((item) => item.id === candidate.scenario))
  );
};

export const useConfiguration = () => {
  const [configuration, setConfiguration] = useState<ProductConfiguration>(() => {
    if (typeof window === 'undefined') return initialConfiguration;

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return initialConfiguration;
      const parsed: unknown = JSON.parse(saved);
      return isConfiguration(parsed) ? parsed : initialConfiguration;
    } catch {
      return initialConfiguration;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(configuration));
    } catch {
      // Configuration remains usable in memory when storage is unavailable.
    }
  }, [configuration]);

  return { configuration, setConfiguration };
};
