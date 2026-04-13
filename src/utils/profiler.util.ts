import type { RawData, TradeItem } from "../types/profiler.type"
import { formatCurrency, isBlank } from "./common.util"

export const convertToTableArray = (aryObj: any[]) => {
    return aryObj.map(v => {
        return [v.name, removeSpecificRankText(v.clan), v.loot_weekly]
    })
}

export const convertItemListToTableArray = (aryObj: any[]) => {
    return aryObj.map(v => {
        return [v.itemname, stylizeStats(v.stat), formatCurrency(v.price), v.category]
    })
}

export const stylizeStats = (statStr: string) => {
  if (isBlank(statStr)){
    return "-"
  }

  const styledStr = statStr.split('').join('/')
  return styledStr
}

export const getOutpost = (value: string) => {
  const outpost: any = {
    "21": "Outpost Zone",
    "22": "Camp Valcrest"
  }

  return outpost[value]
}

export const removeSpecificRankText = (str: string) => {
    return str.replace(/Troops of Doom|Rank:|\(|\)/g, '').trim();
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

  if (day === 1 && hour < 11) {
    // If it's still before 11AM UTC on Monday, target today
    daysUntilMonday = 0;
  } else if (day === 1 && hour > 11){
    daysUntilMonday = 7
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

export const parseTradeList = (data: RawData, limit?: number): TradeItem[] => {
const itemMap = new Map<number, TradeItem>();
  
  // Regex to parse the keys: "tradelist_", index, "_", property
  const keyPattern = /^tradelist_(\d+)_(.+)$/;
  
  // Regex to split the item string: captured name, "_stats", captured digits
  // Example: "gutsplitter_stats888" -> "gutsplitter", "888"
  const statsPattern = /^(.*)_stats(\d+)$/;

  for (const [key, rawValue] of Object.entries(data)) {
    const match = key.match(keyPattern);

    if (match) {
      const index = parseInt(match[1], 10);

      // OPTIMIZATION: 
      // If a limit is set and this index is equal to or higher, skip it immediately.
      if (limit !== undefined && index >= limit) {
        continue;
      }

      const property = match[2];

      if (!itemMap.has(index)) {
        itemMap.set(index, {});
      }

      const currentItem = itemMap.get(index)!;

      // Special handling for the "item" property
      if (property === 'item') {
        const statsMatch = rawValue.match(statsPattern);
        
        if (statsMatch) {
          // If pattern matches, split into 'item' and 'stat'
          currentItem['item'] = statsMatch[1]; // e.g. "gutsplitter"
          currentItem['stat'] = statsMatch[2]; // e.g. "888"
        } else {
          // Fallback if no "_stats" suffix exists
          currentItem['item'] = rawValue;
        }
      } else if (property === 'category') {
        // Logic 2: Handle Category cleaning (remove "weapon_")
        currentItem['category'] = rawValue.replace(/^weapon_/, '');
      } else {
        // Handle all other properties normally
        currentItem[property] = rawValue;
      }
    }
  }

  // Sort by index and return array
  const sortedIndices = Array.from(itemMap.keys()).sort((a, b) => a - b);
  return sortedIndices.map(index => itemMap.get(index)!);
}