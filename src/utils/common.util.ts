type Success<T> = {
    data: T;
    error: null;
};

type Failure<E> = {
    data: null;
    error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

// Main wrapper function
export const tryCatch = async<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> => {
    try {
        const data = await promise;
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as E };
    }
}

export const isBlank = (str: string) => {
    return (!str || str.length === 0 || str.trim() === "")
}

export const getDateTime = () => {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true, // Use 12-hour format
        timeZone: 'UTC'
    });
    return formatter.format(date);
}

export const getUpcomingWeek = () => {
    const nextWeekStart = new Date();
    const currentDay = nextWeekStart.getUTCDay();
    const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;

    nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + daysUntilNextMonday);
    nextWeekStart.setUTCHours(0, 0, 0, 0);

    const weekAfterNextStart = new Date(nextWeekStart);
    weekAfterNextStart.setUTCDate(nextWeekStart.getUTCDate() + 7);

    const formatter = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const nextWeek = formatter.format(nextWeekStart)
    const weekAfterNext = formatter.format(weekAfterNextStart)

    return {
        nextWeek,
        weekAfterNext
    };
}

export const formatCurrency = (str: string) => {
  const f = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

  return f.format(parseInt(str))
}

/**
 * Runs an async function over items with a bounded number of concurrent
 * requests (worker pool), preserving result order. Failed items resolve to
 * whatever `fn` returns for an error (e.g. null), so they can be skipped
 * by the caller.
 *
 * @param {T[]} items - The source items.
 * @param {number} limit - Max number of concurrent requests.
 * @param {Function} fn - Async function applied to each item.
 * @returns {Promise<R[]>} Results in the same order as `items`.
 */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  // Shared cursor: each worker pulls the next index as soon as it frees up,
  // so a slow request never stalls the ones already finished.
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      if (item === undefined) continue; // cannot happen in practice, satisfies noUncheckedIndexedAccess
      results[index] = await fn(item);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

  return results;
}

/**
 * Splits an array into an array of arrays (pages).
 *
 * @param {Array} data - The source array of objects.
 * @param {number} [pageSize=10] - Optional: Number of items per page. Defaults to 10.
 * @returns {Array[]} An array of arrays.
 */
export const paginateArray = (data: any[], pageSize: number = 10) => {
  // Guard clause: ensure data is actually an array
  if (!Array.isArray(data)) {
    console.error("Input data must be an array");
    return [];
  }

  // Guard clause: ensure pageSize is valid
  if (pageSize <= 0) {
     console.error("Page size must be greater than 0");
     return data;
  }

  const pages = [];

  for (let i = 0; i < data.length; i += pageSize) {
    // slice returns a shallow copy of a portion of an array
    const page = data.slice(i, i + pageSize);
    pages.push(page);
  }

  return pages;
}
