import { useState, type PointerEvent } from 'react';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { OptimizedImage } from '../components/OptimizedImage';
import { siteContent } from '../content/siteContent';

type LensScene = 'home' | 'garden';

const lensScenes: Record<LensScene, { label: string; image: string; alt: string }> = {
  home: {
    label: 'Дом',
    image: '/assets/images/violet-home.jpg',
    alt: 'Светильник в уютном домашнем интерьере',
  },
  garden: {
    label: 'Ландшафт',
    image: '/assets/images/outdoor.jpg',
    alt: 'Светильник в вечернем саду',
  },
};

export const Hero = () => {
  const [activeScene, setActiveScene] = useState<LensScene>('home');
  const scene = lensScenes[activeScene];

  const moveLens = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const isMobile = bounds.width <= 760;
    const radius = isMobile ? 79 : 112;
    const x = Math.min(bounds.width - radius, Math.max(radius, event.clientX - bounds.left));
    const y = Math.min(bounds.height - radius, Math.max(radius, event.clientY - bounds.top));
    event.currentTarget.style.setProperty('--lens-x', `${x}px`);
    event.currentTarget.style.setProperty('--lens-y', `${y}px`);
  };

  return (
  <section className="aurora-hero" id="top" aria-labelledby="hero-title" onPointerMove={moveLens}>
    <div className="aurora-hero__image" aria-hidden="true">
      <OptimizedImage
        src="/assets/images/cyan-studio.jpg"
        alt=""
        width="848"
        height="1248"
        loading="eager"
        fetchPriority="high"
      />
    </div>
    <div className="aurora-hero__atmosphere" aria-hidden="true" />

    <div className="aurora-hero__reveal" data-scene={activeScene} aria-live="polite">
      <OptimizedImage
        src={scene.image}
        alt={scene.alt}
        width="848"
        height="1248"
        loading="eager"
      />
    </div>
    <span className="aurora-hero__lens-ring" aria-hidden="true">
      <span className="aurora-hero__lens-focus" />
    </span>

    <div className="aurora-hero__scene-switch" role="group" aria-label="Контекст применения светильника">
      {(Object.keys(lensScenes) as LensScene[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={activeScene === key}
          onClick={() => setActiveScene(key)}
        >
          {lensScenes[key].label}
        </button>
      ))}
    </div>

    <div className="aurora-hero__copy">
      <h1 id="hero-title">
        {siteContent.hero.title.map((line, index) => (
          <span key={line} data-accent={index === 2 || undefined}>{line}</span>
        ))}
      </h1>
      <p>{siteContent.hero.text}</p>
      <a className="aurora-button" href="#scenarios">
        {siteContent.hero.primaryCta}
        <ArrowRight size={17} weight="thin" aria-hidden="true" />
      </a>
    </div>

    <dl className="aurora-hero__facts" aria-label="Ключевые особенности">
      {siteContent.hero.facts.map((fact) => (
        <div key={fact.number}>
          <dt>{fact.number}</dt>
          <dd>
            <strong>{fact.title}</strong>
            <span>{fact.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  </section>
  );
};
