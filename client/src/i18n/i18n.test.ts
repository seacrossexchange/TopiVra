import { describe, it, expect } from 'vitest';
import i18n from './index';

describe('i18n locales for auto-delivery markets', () => {
  it('should have Indonesian inventory translations', async () => {
    await i18n.changeLanguage('id');
    const text = i18n.t('inventory.title');
    expect(text).toBe('Kelola Stok');
  });

  it('should have Brazilian Portuguese inventory translations', async () => {
    await i18n.changeLanguage('pt-BR');
    const text = i18n.t('inventory.title');
    expect(text).toBe('Gerenciar Estoque');
  });

  it('should have Mexican Spanish inventory translations', async () => {
    await i18n.changeLanguage('es-MX');
    const text = i18n.t('inventory.title');
    expect(text).toBe('Gestión de Inventario');
  });
}


