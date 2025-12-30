/**
 * Country codes for phone number input
 * Sorted alphabetically by country name
 */

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+1', country: 'Canada', flag: '🇨🇦' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
].sort((a, b) => a.country.localeCompare(b.country)); // Sort alphabetically by country name

