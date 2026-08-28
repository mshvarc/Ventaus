import { HouseLine } from '@phosphor-icons/react/HouseLine';
import { LampPendant } from '@phosphor-icons/react/LampPendant';
import { Palette } from '@phosphor-icons/react/Palette';
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck';
import { SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal';
import { Sparkle } from '@phosphor-icons/react/Sparkle';
import { siteContent } from '../content/siteContent';

const icons = {
  palette: Palette,
  sparkle: Sparkle,
  sliders: SlidersHorizontal,
  lamp: LampPendant,
  shield: ShieldCheck,
  house: HouseLine,
};

export const AuroraFeatures = () => (
  <section className="aurora-about" id="about" aria-labelledby="about-title">
    <div className="aurora-about__copy">
      <span className="aurora-kicker">{siteContent.about.eyebrow}</span>
      <h2 id="about-title">{siteContent.about.title}</h2>
      <p>{siteContent.about.text}</p>
    </div>
    <div className="aurora-capabilities" id="possibilities">
      {siteContent.about.capabilities.map((item) => {
        const CapabilityIcon = icons[item.icon];
        return (
          <article key={item.title}>
            <CapabilityIcon size={29} weight="thin" aria-hidden="true" />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        );
      })}
    </div>
  </section>
);
