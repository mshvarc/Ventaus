import { ArrowUpRight } from '@phosphor-icons/react/ArrowUpRight';
import { siteContent } from '../content/siteContent';

export const Footer = () => (
  <footer className="aurora-footer">
    <a href={siteContent.footer.phoneHref}>{siteContent.footer.phoneDisplay}</a>
    <span>{siteContent.footer.domain}</span>
    <small>{siteContent.footer.copyright}</small>
    <a
      className="aurora-footer__credit"
      href={siteContent.footer.developerHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${siteContent.footer.developerName} — сайт разработчика, откроется в новой вкладке`}
    >
      <span>{siteContent.footer.developerLabel}</span>
      <strong>SHV<span>.</span>Lab</strong>
      <ArrowUpRight size={12} weight="thin" aria-hidden="true" />
    </a>
  </footer>
);
