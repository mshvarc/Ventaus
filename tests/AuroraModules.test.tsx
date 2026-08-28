import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { AuroraTechnical } from '../src/sections/AuroraTechnical';

describe('Aurora modules', () => {
  it('вставляет новые модули строго между сценариями и формой', () => {
    const { container } = render(<App />);
    const sectionIds = Array.from(container.querySelectorAll('main > section')).map((section) => section.id);
    expect(sectionIds).toEqual(['top', 'about', 'scenarios', 'controls', 'technical', 'request']);
    expect(container.querySelector('#controls section#configurator')).toBeInTheDocument();
    expect(container.querySelector('#configurator input#brightness')).toBeInTheDocument();
    expect(container.querySelector('#configurator input#saturation')).toBeInTheDocument();
    expect(container.querySelectorAll('#configurator')).toHaveLength(1);
    expect(container.querySelector('dialog.aurora-config')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /настроить свой свет/i })).toHaveAttribute('href', '#configurator');
  });

  it('технический модуль использует реальные материалы и честные заглушки данных', () => {
    const { container } = render(<AuroraTechnical />);
    const technical = container.querySelector('#technical');
    expect(technical).not.toBeNull();
    expect(within(technical as HTMLElement).getByRole('heading', { level: 2, name: /технический блок/i })).toBeInTheDocument();
    expect(within(technical as HTMLElement).getByRole('list', { name: /содержание технического блока/i })).toBeInTheDocument();
    expect(technical?.querySelectorAll('.aurora-technical__index li')).toHaveLength(4);
    expect(technical?.querySelectorAll('.aurora-technical__spread')).toHaveLength(1);
    expect(technical?.querySelectorAll('.aurora-technical__visuals')).toHaveLength(1);
    expect(technical?.querySelectorAll('.aurora-technical__dossier')).toHaveLength(1);
    expect(technical?.querySelectorAll('img')).toHaveLength(5);

    const sources = Array.from(technical?.querySelectorAll('img') ?? []).map((image) => image.getAttribute('src'));
    expect(sources).toEqual(expect.arrayContaining([
      '/assets/technical/anniti-smart-overall-geometry-v1.png',
      '/assets/technical/anniti-smart-base-geometry-v1.png',
      '/assets/technical/anniti-smart-exploded-construction-v1.png',
    ]));

    expect(technical?.querySelectorAll('dt')).toHaveLength(9);
    const values = Array.from(technical?.querySelectorAll('dd') ?? []).map((item) => item.textContent);
    expect(values).toEqual(Array(9).fill('Данные уточняются'));
  });
});
