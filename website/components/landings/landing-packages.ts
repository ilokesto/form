export const landingPackages = [
  { name: 'form', title: 'Form', en: 'From the first input to the final check.', ko: '첫 입력부터 마지막 검증까지.' },
] as const;

export type LandingPackage = (typeof landingPackages)[number];

export function getLandingPackage(name: string) {
  return landingPackages.find(item => item.name === name);
}
