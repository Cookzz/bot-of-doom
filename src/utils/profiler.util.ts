export const convertToTableArray = (aryObj: any[]) => {
    return aryObj.map(v => {
        return [v.name, removeSpecificRankText(v.clan), v.loot_weekly]
    })
}

export const removeSpecificRankText = (str: string) => {
    return str.replace('Troops of Doom', '')
              .replace('Rank:', '')
              .replace('(', '')
              .replace(')', '')
              .trim()
}

export const isValidProfileInput = (text: string) => {
    return isValidDfProfilerUrl(text) || isDigits(text)
}

export const isDigits = (text: string) => {
  const pattern = /^\d+$/;

  return pattern.test(text);
}

export const isValidDfProfilerUrl = (url: string) => {
    const pattern = /^https:\/\/www\.dfprofiler\.com\/profile\/view\/\d+$/;
    return pattern.test(url);
}

export const getDfProfilerIdByUrl = (url: string) => {
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split('/')
    return segments[segments.length - 1] ?? null;
}

const getNextMonday = () => {
  const now = new Date();
  const result = new Date(now);

  const day = now.getUTCDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6
  const hour = now.getUTCHours();

  // Determine how many days until next Monday
  let daysUntilMonday = (8 - day) % 7;
  if (day === 1 && hour < 3) {
    // If it's still before 11AM UTC on Monday, target today
    daysUntilMonday = 0;
  }

  result.setUTCDate(result.getUTCDate() + daysUntilMonday);
  result.setUTCHours(11, 0, 0, 0); // Set to 11:00 AM UTC

  return result;
}

export const getCountdown = () => {
  const now: any = new Date();
  const target: any = getNextMonday();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}