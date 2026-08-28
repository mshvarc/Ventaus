import { ChatCircleDots } from '@phosphor-icons/react/ChatCircleDots';
import { Check } from '@phosphor-icons/react/Check';
import { Palette } from '@phosphor-icons/react/Palette';
import { type FormEvent, useRef, useState } from 'react';
import { OptimizedImage } from '../components/OptimizedImage';
import { siteContent } from '../content/siteContent';
import { serializeConfiguration, type ProductConfiguration } from '../data/product';

interface LeadFormProps {
  configuration: ProductConfiguration;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

interface FieldErrors {
  name?: string;
  phone?: string;
  consent?: string;
}

const phonePattern = /^[+\d][\d\s()-]{6,20}$/;

const createIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.()
  ?? `anniti-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const LeadForm = ({ configuration }: LeadFormProps) => {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const idempotencyKeyRef = useRef<string | null>(null);
  const idempotencyPayloadRef = useRef<string | null>(null);
  const serializedConfiguration = serializeConfiguration(configuration);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'loading') return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const consent = formData.get('consent') === 'on';
    const nextErrors: FieldErrors = {};

    if (!name) nextErrors.name = 'Введите имя';
    else if (name.length < 2) nextErrors.name = 'Имя должно содержать не менее двух символов';
    if (!phone) nextErrors.phone = 'Введите телефон';
    else if (!phonePattern.test(phone)) nextErrors.phone = 'Проверьте формат телефона';
    if (!consent) nextErrors.consent = 'Нужно согласие на обработку данных';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus('idle');
      return;
    }

    setStatus('loading');

    const payload = {
      name,
      phone,
      comment: String(formData.get('comment') ?? '').trim(),
      consent,
      config: {
        color: configuration.color.toUpperCase(),
        height: configuration.height,
        rodCount: configuration.rodCount,
        controlMode: configuration.controlMode,
        brightness: configuration.brightness,
        saturation: configuration.saturation,
        scenario: configuration.scenario,
      },
      configuration: serializedConfiguration,
      configurationText: serializedConfiguration,
      company: String(formData.get('company') ?? ''),
      source: 'aurora-gallery-preview',
    };

    const payloadSignature = JSON.stringify(payload);
    if (idempotencyPayloadRef.current !== payloadSignature) {
      idempotencyKeyRef.current = createIdempotencyKey();
      idempotencyPayloadRef.current = payloadSignature;
    }
    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;

    try {
      const response = await fetch(import.meta.env.VITE_PREVIEW_API_PATH ?? '/api/preview-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Preview lead endpoint returned an error');
      idempotencyKeyRef.current = null;
      idempotencyPayloadRef.current = null;
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="aurora-request" id="request" aria-labelledby="request-title">
      <div className="aurora-request__copy">
        <h2 id="request-title">{siteContent.form.title}</h2>
        <p>{siteContent.form.text}</p>
        <ul>
          <li><ChatCircleDots size={28} weight="thin" aria-hidden="true" /><span>Бесплатная консультация</span></li>
          <li><Palette size={28} weight="thin" aria-hidden="true" /><span>Персональные рекомендации<br />и готовые решения</span></li>
        </ul>
      </div>

      <div className="aurora-request__form-wrap">
        {status === 'success' ? (
          <div className="aurora-form-success" role="status" data-testid="lead-status">
            <Check size={34} weight="thin" aria-hidden="true" />
            <p>{siteContent.form.success}</p>
            <button type="button" onClick={() => setStatus('idle')}>Отправить ещё одну заявку</button>
          </div>
        ) : (
          <form
            className="aurora-lead-form"
            data-testid="lead-form"
            aria-busy={status === 'loading'}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="aurora-field">
              <label className="sr-only" htmlFor="name">Имя</label>
              <input id="name" name="name" type="text" placeholder="Имя" autoComplete="name" minLength={2} maxLength={100} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
              {errors.name && <span className="aurora-field__error" id="name-error" role="alert">{errors.name}</span>}
            </div>
            <div className="aurora-field">
              <label className="sr-only" htmlFor="phone">Телефон</label>
              <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="Телефон" autoComplete="tel" maxLength={32} required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} />
              {errors.phone && <span className="aurora-field__error" id="phone-error" role="alert">{errors.phone}</span>}
            </div>
            <div className="aurora-field aurora-field--message">
              <label className="sr-only" htmlFor="comment">Комментарий</label>
              <textarea id="comment" name="comment" rows={2} maxLength={2000} placeholder="Сообщение (необязательно)" />
            </div>
            <input type="hidden" name="configuration" value={serializedConfiguration} />
            <div className="field-honeypot" aria-hidden="true">
              <label htmlFor="company">Компания</label>
              <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <button className="aurora-button aurora-lead-form__submit" data-testid="lead-submit" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Отправляем…' : siteContent.form.submit}
            </button>
            <label className="aurora-consent">
              <input type="checkbox" name="consent" required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'consent-error' : undefined} />
              <span>Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности</span>
            </label>
            {errors.consent && <span className="aurora-field__error" id="consent-error" role="alert">{errors.consent}</span>}
            <p className="sr-only">Выбрано: {serializedConfiguration}</p>
            <p className="aurora-form-status" data-testid="lead-status" aria-live="polite">
              {status === 'error' ? siteContent.form.error : ''}
            </p>
          </form>
        )}
      </div>

      <div className="aurora-request__image" aria-hidden="true">
        <OptimizedImage src="/assets/images/cyan-studio.jpg" alt="" width="848" height="1248" loading="lazy" />
      </div>
    </section>
  );
};
