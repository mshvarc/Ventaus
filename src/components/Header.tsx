import { TelegramLogo } from '@phosphor-icons/react/TelegramLogo';
import { WhatsappLogo } from '@phosphor-icons/react/WhatsappLogo';
import { useEffect, useState } from 'react';
import { siteContent } from '../content/siteContent';
import { Icon } from './Icon';

export const Header = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('hashchange', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('hashchange', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="aurora-header" data-open={open || undefined}>
      <a className="aurora-brand" href="#top" aria-label="ANNITI SMART — на первый экран">
        {siteContent.brand.name}
      </a>

      <button
        className="aurora-menu-toggle"
        data-testid="menu-toggle"
        type="button"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        aria-controls="primary-navigation"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>

      <nav className="aurora-navigation" id="primary-navigation" data-testid="mobile-menu" aria-label="Основная навигация">
        {siteContent.navigation.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="aurora-socials" aria-label="Социальные сети">
        <button type="button" aria-label="WhatsApp — ссылка уточняется" aria-disabled="true" title="Ссылка уточняется">
          <WhatsappLogo size={18} weight="thin" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Telegram — ссылка уточняется" aria-disabled="true" title="Ссылка уточняется">
          <TelegramLogo size={18} weight="thin" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
