export type HeightId = 'height-80' | 'height-100' | 'height-120' | 'height-140' | 'height-160';
export type ControlMode = 'static' | 'dynamic-rgb' | 'music-responsive';
export type ScenarioId = 'focus' | 'rest' | 'impressions' | 'atmosphere' | 'energy';

export interface ProductConfiguration {
  color: string;
  height: HeightId;
  rodCount: 3 | 4 | 5 | 6 | 7;
  controlMode: ControlMode;
  brightness: number;
  saturation: number;
  scenario: ScenarioId | 'custom';
}

export const heights = [
  { id: 'height-80' as const, label: '80 см', centimeters: 80 },
  { id: 'height-100' as const, label: '100 см', centimeters: 100 },
  { id: 'height-120' as const, label: '120 см', centimeters: 120 },
  { id: 'height-140' as const, label: '140 см', centimeters: 140 },
  { id: 'height-160' as const, label: '160 см', centimeters: 160 },
] as const;

export const rodCounts = [3, 4, 5, 6, 7] as const;

export const rgbPresets = [
  { value: '#FF1B24', label: 'Красный' },
  { value: '#FF851B', label: 'Оранжевый' },
  { value: '#FFE600', label: 'Жёлтый' },
  { value: '#05E627', label: 'Зелёный' },
  { value: '#19D7E5', label: 'Циан' },
  { value: '#1764FF', label: 'Синий' },
  { value: '#5019FF', label: 'Фиолетовый' },
  { value: '#C61DDA', label: 'Пурпурный' },
  { value: '#F60AB7', label: 'Розовый' },
  { value: '#F3F3F3', label: 'Белый' },
] as const;

export const controlModes = [
  { id: 'static' as const, label: 'Статический' },
  { id: 'dynamic-rgb' as const, label: 'Динамический RGB' },
  { id: 'music-responsive' as const, label: 'Музыкальный' },
] as const;

export const scenarioPresets = [
  { id: 'focus' as const, color: '#45E6E1', height: 'height-100' as const, rodCount: 5 as const, controlMode: 'dynamic-rgb' as const, brightness: 76, saturation: 78 },
  { id: 'rest' as const, color: '#60A590', height: 'height-100' as const, rodCount: 4 as const, controlMode: 'static' as const, brightness: 64, saturation: 52 },
  { id: 'impressions' as const, color: '#6F8EFF', height: 'height-120' as const, rodCount: 5 as const, controlMode: 'dynamic-rgb' as const, brightness: 88, saturation: 86 },
  { id: 'atmosphere' as const, color: '#F2C6A1', height: 'height-80' as const, rodCount: 5 as const, controlMode: 'static' as const, brightness: 62, saturation: 46 },
  { id: 'energy' as const, color: '#C658EE', height: 'height-140' as const, rodCount: 7 as const, controlMode: 'music-responsive' as const, brightness: 90, saturation: 100 },
] as const;

export const applyScenarioPreset = (
  configuration: ProductConfiguration,
  index: number,
): ProductConfiguration => {
  const preset = scenarioPresets[index];
  if (!preset) return configuration;

  return {
    ...configuration,
    color: preset.color,
    height: preset.height,
    rodCount: preset.rodCount,
    controlMode: preset.controlMode,
    brightness: preset.brightness,
    saturation: preset.saturation,
    scenario: preset.id,
  };
};

const scenarioLabels: Record<ScenarioId, string> = {
  focus: 'Фокус',
  rest: 'Отдых',
  impressions: 'Впечатления',
  atmosphere: 'Атмосфера',
  energy: 'Энергия',
};

export const initialConfiguration: ProductConfiguration = {
  color: '#C61DDA',
  height: 'height-100',
  rodCount: 5,
  controlMode: 'dynamic-rgb',
  brightness: 72,
  saturation: 88,
  scenario: 'custom',
};

export const storageKey = 'anniti-smart-functional-configurator-v4';

export const isRgbHex = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value);

export const productImages = {
  hero: [
    { src: '/assets/images/cyan-studio.jpg', alt: 'Светильник ANNITI SMART в циановом цвете', width: 848, height: 1248 },
    { src: '/assets/images/outdoor.jpg', alt: 'Светильник ANNITI SMART в ландшафте', width: 1047, height: 1747 },
    { src: '/assets/images/cyan-home.jpg', alt: 'Светильник ANNITI SMART с холодным светом дома', width: 848, height: 1248 },
    { src: '/assets/images/warm-home.jpg', alt: 'Светильник ANNITI SMART с тёплым светом дома', width: 848, height: 1248 },
    { src: '/assets/images/violet-studio.jpg', alt: 'Светильник ANNITI SMART в пурпурном цвете', width: 848, height: 1248 },
  ],
  details: [
    {
      src: '/assets/images/detail-home.jpg',
      alt: 'Световые стержни и основание светильника крупным планом',
      width: 736,
      height: 982,
      label: 'Световая поверхность',
    },
    {
      src: '/assets/images/cyan-studio.jpg',
      alt: 'Основание и световые стержни на отражающей поверхности',
      width: 848,
      height: 1248,
      label: 'Основание',
    },
    {
      src: '/assets/images/warm-home.jpg',
      alt: 'Светильник в тёплом домашнем освещении',
      width: 848,
      height: 1248,
      label: 'Фактура света',
    },
  ],
  gallery: [
    { src: '/assets/images/cyan-studio.jpg', alt: 'Циановое цветовое состояние', width: 848, height: 1248, label: 'Циан' },
    { src: '/assets/images/violet-studio.jpg', alt: 'Пурпурное цветовое состояние', width: 848, height: 1248, label: 'Пурпурный' },
    { src: '/assets/images/warm-home.jpg', alt: 'Тёплое цветовое состояние', width: 848, height: 1248, label: 'Тёплый' },
    { src: '/assets/images/cyan-home.jpg', alt: 'Холодное цветовое состояние в домашнем пространстве', width: 848, height: 1248, label: 'Холодный' },
  ],
  contexts: [
    {
      id: 'home',
      src: '/assets/images/violet-home.jpg',
      alt: 'Светильник ANNITI SMART в домашнем пространстве среди растений',
      width: 848,
      height: 1248,
      eyebrow: 'Контекст 01',
      title: 'Дом',
      text: 'Реальная фотография светильника в домашнем пространстве.',
    },
    {
      id: 'outdoor',
      src: '/assets/images/outdoor.jpg',
      alt: 'Светильник ANNITI SMART в ландшафтной композиции',
      width: 1047,
      height: 1747,
      eyebrow: 'Контекст 02',
      title: 'Ландшафт',
      text: 'Реальная фотография светильника в уличной композиции.',
    },
  ],
} as const;

export const technicalRows = [
  { label: 'Габаритные размеры', value: 'Данные уточняются' },
  { label: 'Материалы', value: 'Данные уточняются' },
  { label: 'Питание', value: 'Данные уточняются' },
  { label: 'Способ управления', value: 'Данные уточняются' },
  { label: 'Исполнение для улицы', value: 'Данные уточняются' },
] as const;

export const installationRows = [
  { label: 'Размещение', value: 'Данные уточняются' },
  { label: 'Подключение', value: 'Данные уточняются' },
  { label: 'Настройка', value: 'Данные уточняются' },
  { label: 'Комплектация', value: 'Данные уточняются' },
] as const;

export const serializeConfiguration = (configuration: ProductConfiguration) => {
  const height = heights.find((item) => item.id === configuration.height)?.label ?? configuration.height;
  const mode = controlModes.find((item) => item.id === configuration.controlMode)?.label ?? configuration.controlMode;
  const scenario = configuration.scenario === 'custom'
    ? 'Пользовательская настройка'
    : scenarioLabels[configuration.scenario];

  return `RGB: ${configuration.color.toUpperCase()}; высота: ${height}; стержней: ${configuration.rodCount}; режим: ${mode}; яркость: ${configuration.brightness}%; насыщенность: ${configuration.saturation}%; сценарий: ${scenario}`;
};
