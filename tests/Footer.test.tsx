import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../src/components/Footer';

describe('Footer', () => {
  it('показывает компактную ссылку на сайт разработчика', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: /SHV\.Lab — сайт разработчика/i });
    expect(link).toHaveAttribute('href', 'https://shvlab.ru/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: '+7 499 110-17-78' })).toHaveAttribute('href', 'tel:+74991101778');
    expect(screen.getByText('polinilight.ru')).toBeInTheDocument();
  });
});
