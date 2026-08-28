import { OptimizedImage } from '../components/OptimizedImage';
import { siteContent } from '../content/siteContent';
import { installationRows, technicalRows } from '../data/product';
import './AuroraModules.css';

const PendingRows = ({ rows }: { rows: ReadonlyArray<{ label: string; value: string }> }) => (
  <dl>
    {rows.map((row) => (
      <div key={row.label}>
        <dt>{row.label}</dt>
        <dd>{row.value}</dd>
      </div>
    ))}
  </dl>
);

const technicalIndex = [
  siteContent.technical.geometry,
  siteContent.technical.construction,
  siteContent.technical.application,
  siteContent.technical.specifications,
] as const;

export const AuroraTechnical = () => (
  <section className="aurora-technical" id="technical" aria-labelledby="technical-title">
    <div className="aurora-technical__frame">
      <ol className="aurora-technical__index" aria-label="Содержание технического блока">
        {technicalIndex.map((item) => (
          <li key={item.number}>
            <span>{item.number}</span>
            <p>{item.title}</p>
          </li>
        ))}
      </ol>

      <div className="aurora-technical__spread">
        <div className="aurora-technical__visuals">
          <figure className="aurora-technical__application-photo">
            <OptimizedImage
              src="/assets/images/cyan-home.jpg"
              alt="Светильник ANNITI SMART в домашнем пространстве"
              width="848"
              height="1248"
              loading="lazy"
            />
            <figcaption>Домашнее применение</figcaption>
          </figure>

          <figure className="aurora-technical__detail-photo">
            <OptimizedImage
              src="/assets/images/detail-home.jpg"
              alt="Световые стержни и основание светильника крупным планом"
              width="736"
              height="982"
              loading="lazy"
            />
            <figcaption>Форма и соединение элементов</figcaption>
          </figure>
        </div>

        <div className="aurora-technical__dossier">
          <header className="aurora-technical__heading">
            <h2 id="technical-title">Технический блок</h2>
          </header>

          <div className="aurora-technical__geometry">
            <figure>
              <img
                src="/assets/technical/anniti-smart-overall-geometry-v1.png"
                alt="Эскиз общей геометрии светильника"
                width="1536"
                height="1024"
                loading="lazy"
                decoding="async"
              />
              <figcaption>Концептуальная форма — данные уточняются</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/technical/anniti-smart-base-geometry-v1.png"
                alt="Эскиз геометрии основания светильника"
                width="1536"
                height="1024"
                loading="lazy"
                decoding="async"
              />
              <figcaption>Концептуальное основание — данные уточняются</figcaption>
            </figure>
          </div>

          <div className="aurora-technical__tables">
            <section aria-labelledby="specification-title">
              <h3 id="specification-title">Спецификация</h3>
              <PendingRows rows={technicalRows} />
            </section>
            <section aria-labelledby="installation-title">
              <h3 id="installation-title">Установка и подключение</h3>
              <PendingRows rows={installationRows} />
            </section>
          </div>

          <figure className="aurora-technical__exploded">
            <img
              src="/assets/technical/anniti-smart-exploded-construction-v1.png"
              alt="Схематичное представление конструкции светильника в разборе"
              width="1774"
              height="887"
              loading="lazy"
              decoding="async"
            />
            <figcaption>Эскиз. Не является техническим чертежом</figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>
);
