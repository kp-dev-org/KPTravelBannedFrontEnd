export interface CountryDialCode {
  name: string;
  nameEn: string;
  code: string;
  iso: string;
  flag: string;
}

export const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Comprehensive worldwide list of country dialing codes (200+ countries and territories)
// Regional ASKY Airlines hub countries prioritized at top, followed by all nations
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  // ASKY Airlines Core Network / West & Central Africa
  { name: 'Togo', nameEn: 'Togo', code: '+228', iso: 'TG', flag: '🇹🇬' },
  { name: 'Bénin', nameEn: 'Benin', code: '+229', iso: 'BJ', flag: '🇧🇯' },
  { name: "Côte d'Ivoire", nameEn: 'Ivory Coast', code: '+225', iso: 'CI', flag: '🇨🇮' },
  { name: 'Ghana', nameEn: 'Ghana', code: '+233', iso: 'GH', flag: '🇬🇭' },
  { name: 'Nigeria', nameEn: 'Nigeria', code: '+234', iso: 'NG', flag: '🇳🇬' },
  { name: 'Sénégal', nameEn: 'Senegal', code: '+221', iso: 'SN', flag: '🇸🇳' },
  { name: 'Cameroun', nameEn: 'Cameroon', code: '+237', iso: 'CM', flag: '🇨🇲' },
  { name: 'Gabon', nameEn: 'Gabon', code: '+241', iso: 'GA', flag: '🇬🇦' },
  { name: 'Burkina Faso', nameEn: 'Burkina Faso', code: '+226', iso: 'BF', flag: '🇧🇫' },
  { name: 'Mali', nameEn: 'Mali', code: '+223', iso: 'ML', flag: '🇲🇱' },
  { name: 'Niger', nameEn: 'Niger', code: '+227', iso: 'NE', flag: '🇳🇪' },
  { name: 'Guinée', nameEn: 'Guinea', code: '+224', iso: 'GN', flag: '🇬🇳' },
  { name: 'Congo-Brazzaville', nameEn: 'Republic of the Congo', code: '+242', iso: 'CG', flag: '🇨🇬' },
  { name: 'RD Congo', nameEn: 'Democratic Republic of the Congo', code: '+243', iso: 'CD', flag: '🇨🇩' },
  { name: 'Tchad', nameEn: 'Chad', code: '+235', iso: 'TD', flag: '🇹🇩' },
  { name: 'Centrafrique', nameEn: 'Central African Republic', code: '+236', iso: 'CF', flag: '🇨🇫' },
  { name: 'Guinée Équatoriale', nameEn: 'Equatorial Guinea', code: '+240', iso: 'GQ', flag: '🇬🇶' },
  { name: 'Sierra Leone', nameEn: 'Sierra Leone', code: '+232', iso: 'SL', flag: '🇸🇱' },
  { name: 'Libéria', nameEn: 'Liberia', code: '+231', iso: 'LR', flag: '🇱🇷' },
  { name: 'Cap-Vert', nameEn: 'Cape Verde', code: '+238', iso: 'CV', flag: '🇨🇻' },
  { name: 'Gambie', nameEn: 'Gambia', code: '+220', iso: 'GM', flag: '🇬🇲' },
  { name: 'Guinée-Bissau', nameEn: 'Guinea-Bissau', code: '+245', iso: 'GW', flag: '🇬🇼' },
  { name: 'Sao Tomé-et-Principe', nameEn: 'Sao Tome and Principe', code: '+239', iso: 'ST', flag: '🇸🇹' },

  // Rest of Africa
  { name: 'Afrique du Sud', nameEn: 'South Africa', code: '+27', iso: 'ZA', flag: '🇿🇦' },
  { name: 'Algérie', nameEn: 'Algeria', code: '+213', iso: 'DZ', flag: '🇩🇿' },
  { name: 'Angola', nameEn: 'Angola', code: '+244', iso: 'AO', flag: '🇦🇴' },
  { name: 'Botswana', nameEn: 'Botswana', code: '+267', iso: 'BW', flag: '🇧🇼' },
  { name: 'Burundi', nameEn: 'Burundi', code: '+257', iso: 'BI', flag: '🇧🇮' },
  { name: 'Comores', nameEn: 'Comoros', code: '+269', iso: 'KM', flag: '🇰🇲' },
  { name: 'Djibouti', nameEn: 'Djibouti', code: '+253', iso: 'DJ', flag: '🇩🇯' },
  { name: 'Égypte', nameEn: 'Egypt', code: '+20', iso: 'EG', flag: '🇪🇬' },
  { name: 'Érythrée', nameEn: 'Eritrea', code: '+291', iso: 'ER', flag: '🇪🇷' },
  { name: 'Eswatini', nameEn: 'Eswatini', code: '+268', iso: 'SZ', flag: '🇸🇿' },
  { name: 'Éthiopie', nameEn: 'Ethiopia', code: '+251', iso: 'ET', flag: '🇪🇹' },
  { name: 'Kenya', nameEn: 'Kenya', code: '+254', iso: 'KE', flag: '🇰🇪' },
  { name: 'Lesotho', nameEn: 'Lesotho', code: '+266', iso: 'LS', flag: '🇱🇸' },
  { name: 'Libye', nameEn: 'Libya', code: '+218', iso: 'LY', flag: '🇱🇾' },
  { name: 'Madagascar', nameEn: 'Madagascar', code: '+261', iso: 'MG', flag: '🇲🇬' },
  { name: 'Malawi', nameEn: 'Malawi', code: '+265', iso: 'MW', flag: '🇲🇼' },
  { name: 'Maroc', nameEn: 'Morocco', code: '+212', iso: 'MA', flag: '🇲🇦' },
  { name: 'Maurice', nameEn: 'Mauritius', code: '+230', iso: 'MU', flag: '🇲🇺' },
  { name: 'Mauritanie', nameEn: 'Mauritania', code: '+222', iso: 'MR', flag: '🇲🇷' },
  { name: 'Mozambique', nameEn: 'Mozambique', code: '+258', iso: 'MZ', flag: '🇲🇿' },
  { name: 'Namibie', nameEn: 'Namibia', code: '+264', iso: 'NA', flag: '🇳🇦' },
  { name: 'Ouganda', nameEn: 'Uganda', code: '+256', iso: 'UG', flag: '🇺🇬' },
  { name: 'Rwanda', nameEn: 'Rwanda', code: '+250', iso: 'RW', flag: '🇷🇼' },
  { name: 'Seychelles', nameEn: 'Seychelles', code: '+248', iso: 'SC', flag: '🇸🇨' },
  { name: 'Somalie', nameEn: 'Somalia', code: '+252', iso: 'SO', flag: '🇸🇴' },
  { name: 'Soudan', nameEn: 'Sudan', code: '+249', iso: 'SD', flag: '🇸🇩' },
  { name: 'Soudan du Sud', nameEn: 'South Sudan', code: '+211', iso: 'SS', flag: '🇸🇸' },
  { name: 'Tanzanie', nameEn: 'Tanzania', code: '+255', iso: 'TZ', flag: '🇹🇿' },
  { name: 'Tunisie', nameEn: 'Tunisia', code: '+216', iso: 'TN', flag: '🇹🇳' },
  { name: 'Zambie', nameEn: 'Zambia', code: '+260', iso: 'ZM', flag: '🇿🇲' },
  { name: 'Zimbabwe', nameEn: 'Zimbabwe', code: '+263', iso: 'ZW', flag: '🇿🇼' },

  // Europe
  { name: 'France', nameEn: 'France', code: '+33', iso: 'FR', flag: '🇫🇷' },
  { name: 'Belgique', nameEn: 'Belgium', code: '+32', iso: 'BE', flag: '🇧🇪' },
  { name: 'Suisse', nameEn: 'Switzerland', code: '+41', iso: 'CH', flag: '🇨🇭' },
  { name: 'Royaume-Uni', nameEn: 'United Kingdom', code: '+44', iso: 'GB', flag: '🇬🇧' },
  { name: 'Allemagne', nameEn: 'Germany', code: '+49', iso: 'DE', flag: '🇩🇪' },
  { name: 'Espagne', nameEn: 'Spain', code: '+34', iso: 'ES', flag: '🇪🇸' },
  { name: 'Italie', nameEn: 'Italy', code: '+39', iso: 'IT', flag: '🇮🇹' },
  { name: 'Portugal', nameEn: 'Portugal', code: '+351', iso: 'PT', flag: '🇵🇹' },
  { name: 'Pays-Bas', nameEn: 'Netherlands', code: '+31', iso: 'NL', flag: '🇳🇱' },
  { name: 'Irlande', nameEn: 'Ireland', code: '+353', iso: 'IE', flag: '🇮🇪' },
  { name: 'Luxembourg', nameEn: 'Luxembourg', code: '+352', iso: 'LU', flag: '🇱🇺' },
  { name: 'Autriche', nameEn: 'Austria', code: '+43', iso: 'AT', flag: '🇦🇹' },
  { name: 'Danemark', nameEn: 'Denmark', code: '+45', iso: 'DK', flag: '🇩🇰' },
  { name: 'Suède', nameEn: 'Sweden', code: '+46', iso: 'SE', flag: '🇸🇪' },
  { name: 'Norvège', nameEn: 'Norway', code: '+47', iso: 'NO', flag: '🇳🇴' },
  { name: 'Finlande', nameEn: 'Finland', code: '+358', iso: 'FI', flag: '🇫🇮' },
  { name: 'Pologne', nameEn: 'Poland', code: '+48', iso: 'PL', flag: '🇵🇱' },
  { name: 'Grèce', nameEn: 'Greece', code: '+30', iso: 'GR', flag: '🇬🇷' },
  { name: 'Turquie', nameEn: 'Turkey', code: '+90', iso: 'TR', flag: '🇹🇷' },
  { name: 'Roumanie', nameEn: 'Romania', code: '+40', iso: 'RO', flag: '🇷🇴' },
  { name: 'République Tchèque', nameEn: 'Czech Republic', code: '+420', iso: 'CZ', flag: '🇨🇿' },
  { name: 'Hongrie', nameEn: 'Hungary', code: '+36', iso: 'HU', flag: '🇭🇺' },
  { name: 'Ukraine', nameEn: 'Ukraine', code: '+380', iso: 'UA', flag: '🇺🇦' },
  { name: 'Russie', nameEn: 'Russia', code: '+7', iso: 'RU', flag: '🇷🇺' },
  { name: 'Albanie', nameEn: 'Albanie', code: '+355', iso: 'AL', flag: '🇦🇱' },
  { name: 'Andorre', nameEn: 'Andorra', code: '+376', iso: 'AD', flag: '🇦🇩' },
  { name: 'Arménie', nameEn: 'Armenia', code: '+374', iso: 'AM', flag: '🇦🇲' },
  { name: 'Azerbaïdjan', nameEn: 'Azerbaijan', code: '+994', iso: 'AZ', flag: '🇦🇿' },
  { name: 'Biélorussie', nameEn: 'Belarus', code: '+375', iso: 'BY', flag: '🇧🇾' },
  { name: 'Bosnie-Herzégovine', nameEn: 'Bosnia and Herzegovina', code: '+387', iso: 'BA', flag: '🇧🇦' },
  { name: 'Bulgarie', nameEn: 'Bulgaria', code: '+359', iso: 'BG', flag: '🇧🇬' },
  { name: 'Chypre', nameEn: 'Cyprus', code: '+357', iso: 'CY', flag: '🇨🇾' },
  { name: 'Croatie', nameEn: 'Croatia', code: '+385', iso: 'HR', flag: '🇭🇷' },
  { name: 'Estonie', nameEn: 'Estonia', code: '+372', iso: 'EE', flag: '🇪🇪' },
  { name: 'Géorgie', nameEn: 'Georgia', code: '+995', iso: 'GE', flag: '🇬🇪' },
  { name: 'Islande', nameEn: 'Iceland', code: '+354', iso: 'IS', flag: '🇮🇸' },
  { name: 'Kosovo', nameEn: 'Kosovo', code: '+383', iso: 'XK', flag: '🇽🇰' },
  { name: 'Lettonie', nameEn: 'Latvia', code: '+371', iso: 'LV', flag: '🇱🇻' },
  { name: 'Liechtenstein', nameEn: 'Liechtenstein', code: '+423', iso: 'LI', flag: '🇱🇮' },
  { name: 'Lituanie', nameEn: 'Lithuania', code: '+370', iso: 'LT', flag: '🇱🇹' },
  { name: 'Macédoine du Nord', nameEn: 'North Macedonia', code: '+389', iso: 'MK', flag: '🇲🇰' },
  { name: 'Malte', nameEn: 'Malta', code: '+356', iso: 'MT', flag: '🇲🇹' },
  { name: 'Moldavie', nameEn: 'Moldova', code: '+373', iso: 'MD', flag: '🇲🇩' },
  { name: 'Monaco', nameEn: 'Monaco', code: '+377', iso: 'MC', flag: '🇲🇨' },
  { name: 'Monténégro', nameEn: 'Montenegro', code: '+382', iso: 'ME', flag: '🇲🇪' },
  { name: 'Saint-Marin', nameEn: 'San Marino', code: '+378', iso: 'SM', flag: '🇸🇲' },
  { name: 'Serbie', nameEn: 'Serbia', code: '+381', iso: 'RS', flag: '🇷🇸' },
  { name: 'Slovaquie', nameEn: 'Slovakia', code: '+421', iso: 'SK', flag: '🇸🇰' },
  { name: 'Slovénie', nameEn: 'Slovenia', code: '+386', iso: 'SI', flag: '🇸🇮' },
  { name: 'Vatican', nameEn: 'Vatican City', code: '+379', iso: 'VA', flag: '🇻🇦' },

  // Amériques
  { name: 'États-Unis', nameEn: 'United States', code: '+1', iso: 'US', flag: '🇺🇸' },
  { name: 'Canada', nameEn: 'Canada', code: '+1', iso: 'CA', flag: '🇨🇦' },
  { name: 'Brésil', nameEn: 'Brazil', code: '+55', iso: 'BR', flag: '🇧🇷' },
  { name: 'Argentine', nameEn: 'Argentina', code: '+54', iso: 'AR', flag: '🇦🇷' },
  { name: 'Mexique', nameEn: 'Mexico', code: '+52', iso: 'MX', flag: '🇲🇽' },
  { name: 'Colombie', nameEn: 'Colombia', code: '+57', iso: 'CO', flag: '🇨🇴' },
  { name: 'Chili', nameEn: 'Chile', code: '+56', iso: 'CL', flag: '🇨🇱' },
  { name: 'Pérou', nameEn: 'Peru', code: '+51', iso: 'PE', flag: '🇵🇪' },
  { name: 'Venezuela', nameEn: 'Venezuela', code: '+58', iso: 'VE', flag: '🇻🇪' },
  { name: 'Équateur', nameEn: 'Ecuador', code: '+593', iso: 'EC', flag: '🇪🇨' },
  { name: 'Bolivie', nameEn: 'Bolivia', code: '+591', iso: 'BO', flag: '🇧🇴' },
  { name: 'Paraguay', nameEn: 'Paraguay', code: '+595', iso: 'PY', flag: '🇵🇾' },
  { name: 'Uruguay', nameEn: 'Uruguay', code: '+598', iso: 'UY', flag: '🇺🇾' },
  { name: 'Guyana', nameEn: 'Guyana', code: '+592', iso: 'GY', flag: '🇬🇾' },
  { name: 'Suriname', nameEn: 'Suriname', code: '+597', iso: 'SR', flag: '🇸🇷' },
  { name: 'Haïti', nameEn: 'Haiti', code: '+509', iso: 'HT', flag: '🇭🇹' },
  { name: 'République Dominicaine', nameEn: 'Dominican Republic', code: '+1809', iso: 'DO', flag: '🇩🇴' },
  { name: 'Cuba', nameEn: 'Cuba', code: '+53', iso: 'CU', flag: '🇨🇺' },
  { name: 'Jamaïque', nameEn: 'Jamaica', code: '+1876', iso: 'JM', flag: '🇯🇲' },
  { name: 'Panama', nameEn: 'Panama', code: '+507', iso: 'PA', flag: '🇵🇦' },
  { name: 'Costa Rica', nameEn: 'Costa Rica', code: '+506', iso: 'CR', flag: '🇨🇷' },
  { name: 'Guatemala', nameEn: 'Guatemala', code: '+502', iso: 'GT', flag: '🇬🇹' },
  { name: 'Honduras', nameEn: 'Honduras', code: '+504', iso: 'HN', flag: '🇭🇳' },
  { name: 'Nicaragua', nameEn: 'Nicaragua', code: '+505', iso: 'NI', flag: '🇳🇮' },
  { name: 'Salvador', nameEn: 'El Salvador', code: '+503', iso: 'SV', flag: '🇸🇻' },
  { name: 'Belize', nameEn: 'Belize', code: '+501', iso: 'BZ', flag: '🇧🇿' },
  { name: 'Bahamas', nameEn: 'Bahamas', code: '+1242', iso: 'BS', flag: '🇧🇸' },
  { name: 'Barbade', nameEn: 'Barbados', code: '+1246', iso: 'BB', flag: '🇧🇧' },
  { name: 'Trinité-et-Tobago', nameEn: 'Trinidad and Tobago', code: '+1868', iso: 'TT', flag: '🇹🇹' },

  // Asie & Moyen-Orient
  { name: 'Chine', nameEn: 'China', code: '+86', iso: 'CN', flag: '🇨🇳' },
  { name: 'Inde', nameEn: 'India', code: '+91', iso: 'IN', flag: '🇮🇳' },
  { name: 'Émirats Arabes Unis', nameEn: 'United Arab Emirates', code: '+971', iso: 'AE', flag: '🇦🇪' },
  { name: 'Arabie Saoudite', nameEn: 'Saudi Arabia', code: '+966', iso: 'SA', flag: '🇸🇦' },
  { name: 'Qatar', nameEn: 'Qatar', code: '+974', iso: 'QA', flag: '🇶🇦' },
  { name: 'Japon', nameEn: 'Japan', code: '+81', iso: 'JP', flag: '🇯🇵' },
  { name: 'Corée du Sud', nameEn: 'South Korea', code: '+82', iso: 'KR', flag: '🇰🇷' },
  { name: 'Singapour', nameEn: 'Singapore', code: '+65', iso: 'SG', flag: '🇸🇬' },
  { name: 'Malaisie', nameEn: 'Malaysia', code: '+60', iso: 'MY', flag: '🇲🇾' },
  { name: 'Indonésie', nameEn: 'Indonesia', code: '+62', iso: 'ID', flag: '🇮🇩' },
  { name: 'Thaïlande', nameEn: 'Thailand', code: '+66', iso: 'TH', flag: '🇹🇭' },
  { name: 'Vietnam', nameEn: 'Vietnam', code: '+84', iso: 'VN', flag: '🇻🇳' },
  { name: 'Philippines', nameEn: 'Philippines', code: '+63', iso: 'PH', flag: '🇵🇭' },
  { name: 'Pakistan', nameEn: 'Pakistan', code: '+92', iso: 'PK', flag: '🇵🇰' },
  { name: 'Bangladesh', nameEn: 'Bangladesh', code: '+880', iso: 'BD', flag: '🇧🇩' },
  { name: 'Turquie', nameEn: 'Turkey', code: '+90', iso: 'TR', flag: '🇹🇷' },
  { name: 'Israël', nameEn: 'Israel', code: '+972', iso: 'IL', flag: '🇮🇱' },
  { name: 'Liban', nameEn: 'Lebanon', code: '+961', iso: 'LB', flag: '🇱🇧' },
  { name: 'Jordanie', nameEn: 'Jordan', code: '+962', iso: 'JO', flag: '🇯🇴' },
  { name: 'Koweït', nameEn: 'Kuwait', code: '+965', iso: 'KW', flag: '🇰🇼' },
  { name: 'Bahreïn', nameEn: 'Bahrain', code: '+973', iso: 'BH', flag: '🇧🇭' },
  { name: 'Oman', nameEn: 'Oman', code: '+968', iso: 'OM', flag: '🇴🇲' },
  { name: 'Irak', nameEn: 'Iraq', code: '+964', iso: 'IQ', flag: '🇮🇶' },
  { name: 'Iran', nameEn: 'Iran', code: '+98', iso: 'IR', flag: '🇮🇷' },
  { name: 'Afghanistan', nameEn: 'Afghanistan', code: '+93', iso: 'AF', flag: '🇦🇫' },
  { name: 'Kazakhstan', nameEn: 'Kazakhstan', code: '+7', iso: 'KZ', flag: '🇰🇿' },
  { name: 'Ouzbékistan', nameEn: 'Uzbekistan', code: '+998', iso: 'UZ', flag: '🇺🇿' },
  { name: 'Sri Lanka', nameEn: 'Sri Lanka', code: '+94', iso: 'LK', flag: '🇱🇰' },
  { name: 'Népal', nameEn: 'Nepal', code: '+977', iso: 'NP', flag: '🇳🇵' },
  { name: 'Birmanie', nameEn: 'Myanmar', code: '+95', iso: 'MM', flag: '🇲🇲' },
  { name: 'Cambodge', nameEn: 'Cambodia', code: '+855', iso: 'KH', flag: '🇰🇭' },
  { name: 'Laos', nameEn: 'Laos', code: '+856', iso: 'LA', flag: '🇱🇦' },
  { name: 'Taïwan', nameEn: 'Taiwan', code: '+886', iso: 'TW', flag: '🇹🇼' },
  { name: 'Hong Kong', nameEn: 'Hong Kong', code: '+852', iso: 'HK', flag: '🇭🇰' },

  // Océanie
  { name: 'Australie', nameEn: 'Australia', code: '+61', iso: 'AU', flag: '🇦🇺' },
  { name: 'Nouvelle-Zélande', nameEn: 'New Zealand', code: '+64', iso: 'NZ', flag: '🇳🇿' },
  { name: 'Fidji', nameEn: 'Fiji', code: '+679', iso: 'FJ', flag: '🇫🇯' },
  { name: 'Papouasie-Nouvelle-Guinée', nameEn: 'Papua New Guinea', code: '+675', iso: 'PG', flag: '🇵🇬' },
  { name: 'Samoa', nameEn: 'Samoa', code: '+685', iso: 'WS', flag: '🇼🇸' },
  { name: 'Vanuatu', nameEn: 'Vanuatu', code: '+678', iso: 'VU', flag: '🇻🇺' },
];

// Helper to find a matching country by dial code or phone number prefix
export const findCountryByPhone = (rawPhone?: string): CountryDialCode | undefined => {
  if (!rawPhone || !rawPhone.trim()) return undefined;
  const clean = rawPhone.trim();
  // Sort by code length descending so +228 matches before +2
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.code.length - a.code.length);
  return sorted.find((c) => clean.startsWith(c.code));
};

// Helper to filter country proposals based on user input
export const searchCountryDialCodes = (query: string): CountryDialCode[] => {
  if (!query || !query.trim()) return COUNTRY_DIAL_CODES;
  const q = query.trim().toLowerCase();
  const qCleanCode = q.startsWith('+') ? q : `+${q}`;

  return COUNTRY_DIAL_CODES.filter((c) => {
    return (
      c.code.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(qCleanCode) ||
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.iso.toLowerCase() === q.replace('+', '')
    );
  });
};
