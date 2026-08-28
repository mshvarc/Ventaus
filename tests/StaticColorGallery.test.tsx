import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { initialConfiguration, type ProductConfiguration } from '../src/data/product';
import { AuroraScenarios } from '../src/sections/AuroraScenarios';

const GalleryHarness = () => {
  const [configuration, setConfiguration] = useState<ProductConfiguration>(initialConfiguration);
  return <AuroraScenarios configuration={configuration} setConfiguration={setConfiguration} />;
};

describe('StaticColorGallery', () => {
  it('статичная галерея отделена от интерактивной RGB-настройки', () => {
    render(<GalleryHarness />);
    const gallery = screen.getByTestId('static-color-gallery');
    expect(gallery.querySelectorAll('img')).toHaveLength(5);
    expect(gallery.querySelector('input[type="range"]')).not.toBeInTheDocument();
    expect(gallery.querySelector('input[type="color"]')).not.toBeInTheDocument();
    expect(gallery.querySelector('button')).not.toBeInTheDocument();
  });
});
