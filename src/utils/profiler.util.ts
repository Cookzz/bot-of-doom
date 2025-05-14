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