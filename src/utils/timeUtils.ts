/**
 * timeUtils.ts - Centralized, Reliable Real-Time & Timezone Engine for ARAVAN
 *
 * Strictly uses live system clock + Intl.DateTimeFormat.
 * Defaults local user time to Asia/Kolkata (India Standard Time, IST).
 * Supports Indian & global city/country lookup, explicit IANA timezones,
 * date/day/month/year queries, and two-city time comparisons.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_LOCATION_LABEL = 'India (IST)';

interface TimeZoneEntry {
  timeZone: string;
  label: string;
}

const LOCATION_TIMEZONE_MAP: Record<string, TimeZoneEntry> = {
  // India (Default Local)
  india: { timeZone: 'Asia/Kolkata', label: 'India (IST)' },
  ist: { timeZone: 'Asia/Kolkata', label: 'India (IST)' },
  'indian standard time': { timeZone: 'Asia/Kolkata', label: 'India (IST)' },
  'asia/kolkata': { timeZone: 'Asia/Kolkata', label: 'Kolkata, India (IST)' },
  'asia/calcutta': { timeZone: 'Asia/Kolkata', label: 'Kolkata, India (IST)' },
  kolkata: { timeZone: 'Asia/Kolkata', label: 'Kolkata, India' },
  calcutta: { timeZone: 'Asia/Kolkata', label: 'Kolkata, India' },
  delhi: { timeZone: 'Asia/Kolkata', label: 'New Delhi, India' },
  'new delhi': { timeZone: 'Asia/Kolkata', label: 'New Delhi, India' },
  mumbai: { timeZone: 'Asia/Kolkata', label: 'Mumbai, India' },
  bombay: { timeZone: 'Asia/Kolkata', label: 'Mumbai, India' },
  bangalore: { timeZone: 'Asia/Kolkata', label: 'Bengaluru, India' },
  bengaluru: { timeZone: 'Asia/Kolkata', label: 'Bengaluru, India' },
  hyderabad: { timeZone: 'Asia/Kolkata', label: 'Hyderabad, India' },
  chennai: { timeZone: 'Asia/Kolkata', label: 'Chennai, India' },
  pune: { timeZone: 'Asia/Kolkata', label: 'Pune, India' },
  ahmedabad: { timeZone: 'Asia/Kolkata', label: 'Ahmedabad, India' },
  surat: { timeZone: 'Asia/Kolkata', label: 'Surat, India' },
  jaipur: { timeZone: 'Asia/Kolkata', label: 'Jaipur, India' },
  lucknow: { timeZone: 'Asia/Kolkata', label: 'Lucknow, India' },
  chandigarh: { timeZone: 'Asia/Kolkata', label: 'Chandigarh, India' },
  kochi: { timeZone: 'Asia/Kolkata', label: 'Kochi, India' },
  indore: { timeZone: 'Asia/Kolkata', label: 'Indore, India' },
  bhopal: { timeZone: 'Asia/Kolkata', label: 'Bhopal, India' },
  patna: { timeZone: 'Asia/Kolkata', label: 'Patna, India' },
  nagpur: { timeZone: 'Asia/Kolkata', label: 'Nagpur, India' },
  varanasi: { timeZone: 'Asia/Kolkata', label: 'Varanasi, India' },
  gujarat: { timeZone: 'Asia/Kolkata', label: 'Gujarat, India' },
  maharashtra: { timeZone: 'Asia/Kolkata', label: 'Maharashtra, India' },
  local: { timeZone: 'Asia/Kolkata', label: 'India (IST)' },
  here: { timeZone: 'Asia/Kolkata', label: 'India (IST)' },

  // UK / Europe
  london: { timeZone: 'Europe/London', label: 'London, UK' },
  uk: { timeZone: 'Europe/London', label: 'United Kingdom' },
  'united kingdom': { timeZone: 'Europe/London', label: 'United Kingdom' },
  england: { timeZone: 'Europe/London', label: 'England, UK' },
  britain: { timeZone: 'Europe/London', label: 'Great Britain' },
  manchester: { timeZone: 'Europe/London', label: 'Manchester, UK' },
  dublin: { timeZone: 'Europe/Dublin', label: 'Dublin, Ireland' },
  ireland: { timeZone: 'Europe/Dublin', label: 'Ireland' },
  paris: { timeZone: 'Europe/Paris', label: 'Paris, France' },
  france: { timeZone: 'Europe/Paris', label: 'France' },
  berlin: { timeZone: 'Europe/Berlin', label: 'Berlin, Germany' },
  germany: { timeZone: 'Europe/Berlin', label: 'Germany' },
  frankfurt: { timeZone: 'Europe/Berlin', label: 'Frankfurt, Germany' },
  munich: { timeZone: 'Europe/Berlin', label: 'Munich, Germany' },
  amsterdam: { timeZone: 'Europe/Amsterdam', label: 'Amsterdam, Netherlands' },
  netherlands: { timeZone: 'Europe/Amsterdam', label: 'Netherlands' },
  zurich: { timeZone: 'Europe/Zurich', label: 'Zurich, Switzerland' },
  switzerland: { timeZone: 'Europe/Zurich', label: 'Switzerland' },
  rome: { timeZone: 'Europe/Rome', label: 'Rome, Italy' },
  italy: { timeZone: 'Europe/Rome', label: 'Italy' },
  madrid: { timeZone: 'Europe/Madrid', label: 'Madrid, Spain' },
  spain: { timeZone: 'Europe/Madrid', label: 'Spain' },
  vienna: { timeZone: 'Europe/Vienna', label: 'Vienna, Austria' },
  austria: { timeZone: 'Europe/Vienna', label: 'Austria' },
  stockholm: { timeZone: 'Europe/Stockholm', label: 'Stockholm, Sweden' },
  sweden: { timeZone: 'Europe/Stockholm', label: 'Sweden' },
  athens: { timeZone: 'Europe/Athens', label: 'Athens, Greece' },
  istanbul: { timeZone: 'Europe/Istanbul', label: 'Istanbul, Turkey' },
  turkey: { timeZone: 'Europe/Istanbul', label: 'Turkey' },
  moscow: { timeZone: 'Europe/Moscow', label: 'Moscow, Russia' },
  russia: { timeZone: 'Europe/Moscow', label: 'Moscow, Russia' },

  // Americas
  'new york': { timeZone: 'America/New_York', label: 'New York, USA' },
  nyc: { timeZone: 'America/New_York', label: 'New York, USA' },
  washington: { timeZone: 'America/New_York', label: 'Washington D.C., USA' },
  boston: { timeZone: 'America/New_York', label: 'Boston, USA' },
  miami: { timeZone: 'America/New_York', label: 'Miami, USA' },
  atlanta: { timeZone: 'America/New_York', label: 'Atlanta, USA' },
  est: { timeZone: 'America/New_York', label: 'US Eastern Time' },
  edt: { timeZone: 'America/New_York', label: 'US Eastern Time' },
  usa: { timeZone: 'America/New_York', label: 'United States (ET)' },
  us: { timeZone: 'America/New_York', label: 'United States (ET)' },
  'united states': { timeZone: 'America/New_York', label: 'United States (ET)' },
  chicago: { timeZone: 'America/Chicago', label: 'Chicago, USA' },
  dallas: { timeZone: 'America/Chicago', label: 'Dallas, USA' },
  houston: { timeZone: 'America/Chicago', label: 'Houston, USA' },
  austin: { timeZone: 'America/Chicago', label: 'Austin, USA' },
  cst: { timeZone: 'America/Chicago', label: 'US Central Time' },
  denver: { timeZone: 'America/Denver', label: 'Denver, USA' },
  mst: { timeZone: 'America/Denver', label: 'US Mountain Time' },
  'los angeles': { timeZone: 'America/Los_Angeles', label: 'Los Angeles, USA' },
  la: { timeZone: 'America/Los_Angeles', label: 'Los Angeles, USA' },
  'san francisco': { timeZone: 'America/Los_Angeles', label: 'San Francisco, USA' },
  sf: { timeZone: 'America/Los_Angeles', label: 'San Francisco, USA' },
  'silicon valley': { timeZone: 'America/Los_Angeles', label: 'Silicon Valley, USA' },
  seattle: { timeZone: 'America/Los_Angeles', label: 'Seattle, USA' },
  california: { timeZone: 'America/Los_Angeles', label: 'California, USA' },
  pst: { timeZone: 'America/Los_Angeles', label: 'US Pacific Time' },
  pdt: { timeZone: 'America/Los_Angeles', label: 'US Pacific Time' },
  toronto: { timeZone: 'America/Toronto', label: 'Toronto, Canada' },
  canada: { timeZone: 'America/Toronto', label: 'Canada (ET)' },
  vancouver: { timeZone: 'America/Vancouver', label: 'Vancouver, Canada' },
  'mexico city': { timeZone: 'America/Mexico_City', label: 'Mexico City, Mexico' },
  mexico: { timeZone: 'America/Mexico_City', label: 'Mexico City, Mexico' },
  'sao paulo': { timeZone: 'America/Sao_Paulo', label: 'São Paulo, Brazil' },
  brazil: { timeZone: 'America/Sao_Paulo', label: 'Brazil' },
  'buenos aires': { timeZone: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires, Argentina' },
  argentina: { timeZone: 'America/Argentina/Buenos_Aires', label: 'Argentina' },

  // Middle East & Africa
  dubai: { timeZone: 'Asia/Dubai', label: 'Dubai, UAE' },
  uae: { timeZone: 'Asia/Dubai', label: 'United Arab Emirates' },
  'abu dhabi': { timeZone: 'Asia/Dubai', label: 'Abu Dhabi, UAE' },
  riyadh: { timeZone: 'Asia/Riyadh', label: 'Riyadh, Saudi Arabia' },
  'saudi arabia': { timeZone: 'Asia/Riyadh', label: 'Saudi Arabia' },
  doha: { timeZone: 'Asia/Qatar', label: 'Doha, Qatar' },
  qatar: { timeZone: 'Asia/Qatar', label: 'Qatar' },
  kuwait: { timeZone: 'Asia/Kuwait', label: 'Kuwait' },
  muscat: { timeZone: 'Asia/Muscat', label: 'Muscat, Oman' },
  oman: { timeZone: 'Asia/Muscat', label: 'Oman' },
  'tel aviv': { timeZone: 'Asia/Jerusalem', label: 'Tel Aviv, Israel' },
  israel: { timeZone: 'Asia/Jerusalem', label: 'Israel' },
  cairo: { timeZone: 'Africa/Cairo', label: 'Cairo, Egypt' },
  egypt: { timeZone: 'Africa/Cairo', label: 'Egypt' },
  nairobi: { timeZone: 'Africa/Nairobi', label: 'Nairobi, Kenya' },
  kenya: { timeZone: 'Africa/Nairobi', label: 'Kenya' },
  lagos: { timeZone: 'Africa/Lagos', label: 'Lagos, Nigeria' },
  nigeria: { timeZone: 'Africa/Lagos', label: 'Nigeria' },
  johannesburg: { timeZone: 'Africa/Johannesburg', label: 'Johannesburg, South Africa' },
  'south africa': { timeZone: 'Africa/Johannesburg', label: 'South Africa' },

  // Asia-Pacific
  tokyo: { timeZone: 'Asia/Tokyo', label: 'Tokyo, Japan' },
  japan: { timeZone: 'Asia/Tokyo', label: 'Japan' },
  seoul: { timeZone: 'Asia/Seoul', label: 'Seoul, South Korea' },
  'south korea': { timeZone: 'Asia/Seoul', label: 'South Korea' },
  korea: { timeZone: 'Asia/Seoul', label: 'South Korea' },
  singapore: { timeZone: 'Asia/Singapore', label: 'Singapore' },
  beijing: { timeZone: 'Asia/Shanghai', label: 'Beijing, China' },
  shanghai: { timeZone: 'Asia/Shanghai', label: 'Shanghai, China' },
  china: { timeZone: 'Asia/Shanghai', label: 'China' },
  'hong kong': { timeZone: 'Asia/Hong_Kong', label: 'Hong Kong' },
  taipei: { timeZone: 'Asia/Taipei', label: 'Taipei, Taiwan' },
  taiwan: { timeZone: 'Asia/Taipei', label: 'Taiwan' },
  bangkok: { timeZone: 'Asia/Bangkok', label: 'Bangkok, Thailand' },
  thailand: { timeZone: 'Asia/Bangkok', label: 'Thailand' },
  jakarta: { timeZone: 'Asia/Jakarta', label: 'Jakarta, Indonesia' },
  indonesia: { timeZone: 'Asia/Jakarta', label: 'Indonesia' },
  'kuala lumpur': { timeZone: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur, Malaysia' },
  malaysia: { timeZone: 'Asia/Kuala_Lumpur', label: 'Malaysia' },
  manila: { timeZone: 'Asia/Manila', label: 'Manila, Philippines' },
  philippines: { timeZone: 'Asia/Manila', label: 'Philippines' },
  hanoi: { timeZone: 'Asia/Bangkok', label: 'Hanoi, Vietnam' },
  vietnam: { timeZone: 'Asia/Ho_Chi_Minh', label: 'Vietnam' },
  karachi: { timeZone: 'Asia/Karachi', label: 'Karachi, Pakistan' },
  lahore: { timeZone: 'Asia/Karachi', label: 'Lahore, Pakistan' },
  islamabad: { timeZone: 'Asia/Karachi', label: 'Islamabad, Pakistan' },
  pakistan: { timeZone: 'Asia/Karachi', label: 'Pakistan' },
  dhaka: { timeZone: 'Asia/Dhaka', label: 'Dhaka, Bangladesh' },
  bangladesh: { timeZone: 'Asia/Dhaka', label: 'Bangladesh' },
  kathmandu: { timeZone: 'Asia/Kathmandu', label: 'Kathmandu, Nepal' },
  nepal: { timeZone: 'Asia/Kathmandu', label: 'Nepal' },
  colombo: { timeZone: 'Asia/Colombo', label: 'Colombo, Sri Lanka' },
  'sri lanka': { timeZone: 'Asia/Colombo', label: 'Sri Lanka' },
  sydney: { timeZone: 'Australia/Sydney', label: 'Sydney, Australia' },
  melbourne: { timeZone: 'Australia/Melbourne', label: 'Melbourne, Australia' },
  australia: { timeZone: 'Australia/Sydney', label: 'Australia (Sydney)' },
  perth: { timeZone: 'Australia/Perth', label: 'Perth, Australia' },
  auckland: { timeZone: 'Pacific/Auckland', label: 'Auckland, New Zealand' },
  'new zealand': { timeZone: 'Pacific/Auckland', label: 'New Zealand' },

  // Universal
  utc: { timeZone: 'UTC', label: 'UTC' },
  gmt: { timeZone: 'UTC', label: 'GMT / UTC' },
};

export interface ResolvedTimeInfo {
  status: 'success';
  locationLabel: string;
  timeZone: string;
  timeZoneShort: string;
  utcOffset: string;
  currentTime: string;
  currentTimeShort: string;
  time24h: string;
  currentDate: string;
  dayOfWeek: string;
  dayOfMonth: string;
  month: string;
  year: string;
  isoTime: string;
  unixTimestampMs: number;
  comparison?: {
    targetLocation: string;
    targetTimeZone: string;
    targetTime: string;
    targetDate: string;
    differenceDescription: string;
    offsetMinutesDiff: number;
  };
}

export interface TimeResolutionError {
  status: 'error';
  message: string;
  requestedLocation?: string;
  requestedTimeZone?: string;
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-IN', { timeZone: tz.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZoneForLocation(
  location?: string,
  explicitTimeZone?: string
): { ok: true; timeZone: string; label: string } | { ok: false; error: string } {
  const tzCandidate = explicitTimeZone?.trim();
  if (tzCandidate) {
    if (isValidTimeZone(tzCandidate)) {
      return {
        ok: true,
        timeZone: tzCandidate,
        label: location?.trim() || tzCandidate,
      };
    }
    const mappedTz = LOCATION_TIMEZONE_MAP[tzCandidate.toLowerCase()];
    if (mappedTz) {
      return { ok: true, timeZone: mappedTz.timeZone, label: mappedTz.label };
    }
    return {
      ok: false,
      error: `Invalid or unrecognized timezone "${tzCandidate}".`,
    };
  }

  const rawLoc = location?.trim();
  if (!rawLoc) {
    return { ok: true, timeZone: DEFAULT_TIMEZONE, label: DEFAULT_LOCATION_LABEL };
  }

  const normalized = rawLoc
    .toLowerCase()
    .replace(/^(the|in|at|of|for)\s+/i, '')
    .replace(/[?!.,]+$/g, '')
    .trim();

  if (LOCATION_TIMEZONE_MAP[normalized]) {
    return {
      ok: true,
      timeZone: LOCATION_TIMEZONE_MAP[normalized].timeZone,
      label: LOCATION_TIMEZONE_MAP[normalized].label,
    };
  }

  // Partial word match inside map keys for phrases like "London UK" or "New York City"
  for (const [key, entry] of Object.entries(LOCATION_TIMEZONE_MAP)) {
    if (key.length >= 3 && (normalized.includes(key) || key === normalized)) {
      return { ok: true, timeZone: entry.timeZone, label: entry.label };
    }
  }

  // Try direct IANA format e.g. "Europe/Berlin"
  if (rawLoc.includes('/') && isValidTimeZone(rawLoc)) {
    return { ok: true, timeZone: rawLoc, label: rawLoc };
  }

  return {
    ok: false,
    error: `I don't have a reliable timezone mapping for "${rawLoc}". Please specify an Indian/major world city or IANA timezone (e.g., Europe/London, America/New_York, Asia/Kolkata).`,
  };
}

function getOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  if (offsetPart === 'GMT' || offsetPart === 'UTC') return 0;
  const match = offsetPart.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10) || 0;
  const mins = parseInt(match[3] || '0', 10) || 0;
  return sign * (hours * 60 + mins);
}

function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

export function getRealCurrentTimeInfo(options?: {
  location?: string;
  timezone?: string;
  compareWith?: string;
  now?: Date;
}): ResolvedTimeInfo | TimeResolutionError {
  const now = options?.now ?? new Date();
  const resolved = resolveTimeZoneForLocation(options?.location, options?.timezone);

  if ('error' in resolved) {
    return {
      status: 'error',
      message: resolved.error,
      requestedLocation: options?.location,
      requestedTimeZone: options?.timezone,
    };
  }

  const { timeZone, label } = resolved;

  const currentTime = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);

  const currentTimeShort = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(now)
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());

  const time24h = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const currentDate = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const dayOfWeek = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'long' }).format(now);
  const dayOfMonth = new Intl.DateTimeFormat('en-IN', { timeZone, day: '2-digit' }).format(now);
  const month = new Intl.DateTimeFormat('en-IN', { timeZone, month: 'long' }).format(now);
  const year = new Intl.DateTimeFormat('en-IN', { timeZone, year: 'numeric' }).format(now);

  const tzParts = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(now);
  const timeZoneShort = tzParts.find((p) => p.type === 'timeZoneName')?.value || timeZone;
  const offsetMins = getOffsetMinutes(now, timeZone);
  const utcOffset = formatOffsetLabel(offsetMins);

  const result: ResolvedTimeInfo = {
    status: 'success',
    locationLabel: label,
    timeZone,
    timeZoneShort,
    utcOffset,
    currentTime,
    currentTimeShort,
    time24h,
    currentDate,
    dayOfWeek,
    dayOfMonth,
    month,
    year,
    isoTime: now.toISOString(),
    unixTimestampMs: now.getTime(),
  };

  if (options?.compareWith?.trim()) {
    const compResolved = resolveTimeZoneForLocation(options.compareWith);
    if ('error' in compResolved) {
      return {
        status: 'error',
        message: compResolved.error,
        requestedLocation: options.compareWith,
      };
    }

    const compTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: compResolved.timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(now)
      .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());

    const compDate = new Intl.DateTimeFormat('en-IN', {
      timeZone: compResolved.timeZone,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(now);

    const compOffsetMins = getOffsetMinutes(now, compResolved.timeZone);
    const diffMins = offsetMins - compOffsetMins;
    const absMins = Math.abs(diffMins);
    const diffH = Math.floor(absMins / 60);
    const diffM = absMins % 60;
    const diffStr =
      diffMins === 0
        ? `${label} and ${compResolved.label} are in the same time offset`
        : `${label} is ${diffH}h${diffM > 0 ? ` ${diffM}m` : ''} ${diffMins > 0 ? 'ahead of' : 'behind'} ${compResolved.label}`;

    result.comparison = {
      targetLocation: compResolved.label,
      targetTimeZone: compResolved.timeZone,
      targetTime: compTime,
      targetDate: compDate,
      differenceDescription: diffStr,
      offsetMinutesDiff: diffMins,
    };
  }

  return result;
}
