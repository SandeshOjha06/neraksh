import en from './en.json';
import hi from './hi.json';
import as from './as.json';
import bn from './bn.json';
import ne from './ne.json';
import kh from './kh.json';
import lus from './lus.json';
import mni from './mni.json';

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली' },
  { code: 'kh', label: 'Khasi', native: 'Khasi' },
  { code: 'lus', label: 'Mizo', native: 'Mizo' },
  { code: 'mni', label: 'Manipuri', native: 'মৈতৈলোন্' },
];

export const translations = {
  en,
  hi,
  as,
  bn,
  ne,
  kh,
  lus,
  mni,
};

/**
 * Translate a key into target language with English and Key fallback.
 * Supports string interpolation for {param} tokens.
 *
 * @param {string} lang - Language code (e.g. 'en', 'hi')
 * @param {string} key - Translation key (e.g. 'severity.critical')
 * @param {Object} [params] - Optional interpolation params (e.g. { count: 3 })
 * @returns {string} Translated text
 */
export function translate(lang, key, params = {}) {
  const currentDict = translations[lang] || translations.en;
  let text = currentDict[key];

  // Fallback to English if missing in chosen language
  if (text === undefined && translations.en) {
    text = translations.en[key];
  }

  // Fallback to key itself if missing anywhere
  if (text === undefined) {
    return key;
  }

  // Interpolate {key} parameters
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(pKey => {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), params[pKey]);
    });
  }

  return text;
}
