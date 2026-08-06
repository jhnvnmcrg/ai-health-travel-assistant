import { vars } from 'nativewind';

/**
 * Not wired up yet: GluestackUIProvider takes its tokens from global.css. This
 * palette is kept here for when the provider is switched over to vars().
 */
export const config = {
  light: vars({
    // Pine — primary actions, user bubble, header accent
    '--color-primary-0': '238 243 240',   // #EEF3F0
    '--color-primary-50': '220 234 226',  // #DCEAE2
    '--color-primary-100': '187 213 199', // #BBD5C7
    '--color-primary-200': '143 184 163', // #8FB8A3
    '--color-primary-300': '94 150 124',  // #5E967C
    '--color-primary-400': '60 122 95',   // #3C7A5F
    '--color-primary-500': '44 98 73',    // #2C6249
    '--color-primary-600': '36 80 63',    // #24503F (main)
    '--color-primary-700': '28 63 50',    // #1C3F32
    '--color-primary-800': '20 46 37',    // #142E25
    '--color-primary-900': '13 31 25',    // #0D1F19
    '--color-primary-950': '8 20 16',     // #081410

    // Trailblaze rust — secondary accents
    '--color-secondary-500': '193 89 44', // #C1592C
    '--color-secondary-600': '168 72 31', // #A8481F
    '--color-secondary-700': '138 56 24', // #8A3818

    // Compass gold — waypoint markers, caution
    '--color-tertiary-400': '217 174 92', // #D9AE5C
    '--color-tertiary-500': '201 154 60', // #C99A3C
    '--color-tertiary-600': '173 129 41', // #AD8129

    // Safety verdicts
    '--color-success-500': '60 122 95',   // #3C7A5F
    '--color-success-600': '44 98 73',    // #2C6249
    '--color-warning-500': '201 154 60',  // #C99A3C
    '--color-warning-600': '173 129 41',  // #AD8129
    '--color-error-500': '185 69 47',     // #B9452F
    '--color-error-600': '160 56 35',     // #A03823

    // Parchment — backgrounds
    '--color-background-0': '251 250 245',   // #FBFAF5
    '--color-background-50': '246 243 233',  // #F6F3E9
    '--color-background-100': '240 236 221', // #F0ECDD
    '--color-background-200': '228 223 203', // #E4DFCB

    // Chart ink & stone — text & borders
    '--color-typography-0': '251 250 245',   // #FBFAF5
    '--color-typography-400': '140 133 115', // #8C8573
    '--color-typography-500': '107 114 104', // #6B7268
    '--color-typography-700': '58 71 63',    // #3A473F
    '--color-typography-900': '31 42 36',    // #1F2A24
    '--color-outline-200': '225 220 200',    // #E1DCC8
    '--color-outline-300': '207 200 174',    // #CFC8AE
  }),
};
