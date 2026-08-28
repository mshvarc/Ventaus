import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ProductConfiguration,
} from '../src/data/product';
import { LeadForm } from '../src/sections/LeadForm';

const configuration: ProductConfiguration = {
  color: '#CC22EE',
  height: 'height-140',
  rodCount: 6,
  controlMode: 'dynamic-rgb',
  brightness: 88,
  saturation: 74,
  scenario: 'impressions',
};

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Тестовый пользователь' } });
  fireEvent.change(screen.getByLabelText('Телефон'), { target: { value: '+7 999 123-45-67' } });
  fireEvent.change(screen.getByLabelText('Комментарий'), { target: { value: 'Тест preview-формы' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /политик/i }));
};

describe('LeadForm', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  it('5. выбранная конфигурация попадает в payload формы', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    render(<LeadForm configuration={configuration} />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /подобрать свой свет/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/preview-lead');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.consent).toBe(true);
    expect(body.config).toEqual({
      color: '#CC22EE',
      height: 'height-140',
      rodCount: 6,
      controlMode: 'dynamic-rgb',
      brightness: 88,
      saturation: 74,
      scenario: 'impressions',
    });
    expect(body.configurationText).toEqual(expect.stringContaining('RGB: #CC22EE'));
    expect(body.configurationText).toEqual(expect.stringContaining('высота: 140 см'));
    expect(body.configurationText).toEqual(expect.stringContaining('стержней: 6'));
    expect(body.configurationText).toEqual(expect.stringContaining('режим: Динамический RGB'));
    expect(new Headers(init.headers).get('Idempotency-Key')).toBeTruthy();
  });

  it('6. неполная форма не отправляется', async () => {
    render(<LeadForm configuration={configuration} />);

    fireEvent.click(screen.getByRole('button', { name: /подобрать свой свет/i }));

    expect(await screen.findByText('Введите имя')).toBeInTheDocument();
    expect(screen.getByText('Введите телефон')).toBeInTheDocument();
    expect(screen.getByText('Нужно согласие на обработку данных')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('6a. однобуквенное имя отклоняется до запроса к серверу', async () => {
    render(<LeadForm configuration={configuration} />);
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'А' } });
    fireEvent.change(screen.getByLabelText('Телефон'), { target: { value: '+7 999 123-45-67' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /политик/i }));

    fireEvent.click(screen.getByRole('button', { name: /подобрать свой свет/i }));

    expect(await screen.findByText('Имя должно содержать не менее двух символов')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('7. повторный submit блокируется на время отправки', async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    }));
    render(<LeadForm configuration={configuration} />);
    fillValidForm();
    const submit = screen.getByRole('button', { name: /подобрать свой свет/i });

    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /отправляем/i })).toBeDisabled();
    resolveRequest?.(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await screen.findByRole('status');
  });

  it('8. ошибка API показывается пользователю', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'test' }), { status: 500 }));
    render(<LeadForm configuration={configuration} />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /подобрать свой свет/i }));

    expect(await screen.findByText(/не удалось отправить заявку/i)).toBeInTheDocument();
  });

  it('9. успешная отправка показывает корректное состояние', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));
    render(<LeadForm configuration={configuration} />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /подобрать свой свет/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/заявка принята/i);
    expect(screen.getByRole('button', { name: /отправить ещё одну заявку/i })).toBeInTheDocument();
  });
});
