export const PROGRAM_VARIANTS = Object.freeze(['uomo', 'donna']);

export const PROGRAM_VARIANT_IDS = Object.freeze({
  uomo: 1,
  donna: 2,
});

export function isProgramVariant(value) {
  return PROGRAM_VARIANTS.includes(value);
}

export function programVariantForGender(gender) {
  return gender === 'Donna' ? 'donna' : 'uomo';
}
