import { isBlank } from "./common.util";
import type { Challenge } from "../types/challenge.type";

/* Header looks like "[CLAN] Weekly Challenge - <name>Ends: <date> <time>"
The name gets glued right onto "Ends:" in website copies, hence the lazy match */
const CHALLENGE_HEADER = /\[CLAN\] Weekly Challenge - (.+?)Ends:\s*(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})/;

/**
 * Compiles a list of challenges from pasted clan challenge page text.
 * Lenient by design: whatever parses is returned, and anything that looks like
 * a challenge (but didn't parse) comes back as "unmatched" so the caller can
 * show it back to the user instead of silently dropping it.
 *
 * @param {string} text - Raw pasted text from the clan challenge page.
 * @returns {Object} challenges (parsed, in pasted order) and unmatched (raw fragments).
 */
export const parseChallenges = (text: string): { challenges: Challenge[], unmatched: string[] } => {
    const challenges: Challenge[] = []
    const unmatched: string[] = []

    if (isBlank(text)) {
        return { challenges, unmatched }
    }

    /* Global clone of the header regex so .test() doesn't advance lastIndex */
    const globalHeader = new RegExp(CHALLENGE_HEADER.source, CHALLENGE_HEADER.flags + "g")

    /* Each challenge's own block is the text between its header and the next
    header; the COMPLETE marker lives somewhere inside that block */
    const headers = [...text.matchAll(globalHeader)]
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i]
        if (!header){
            continue
        }
        const blockStart = (header.index ?? 0) + header[0].length
        const blockEnd = headers[i + 1]?.index ?? text.length
        const block = text.slice(blockStart, blockEnd)

        challenges.push({
            name: (header[1] ?? "").trim(),
            ends: (header[2] ?? "").trim(),
            complete: /\bCOMPLETE\b/.test(block)
        })
    }

    /* A raw "[CLAN] Weekly Challenge" line that didn't match the header pattern
    means the copy is malformed (e.g. the date got cut off). Report the line back */
    if (text.match(/\[CLAN\] Weekly Challenge/g)?.length !== challenges.length) {
        for (const line of text.split(/\r?\n/)) {
            if (line.includes("[CLAN] Weekly Challenge") && !CHALLENGE_HEADER.test(line)) {
                unmatched.push(line.trim())
            }
        }
    }

    /* No challenge headers at all means this isn't challenge text to begin with */
    if (!challenges.length && !unmatched.length) {
        const trimmed = text.trim()
        unmatched.push(trimmed.length > 250 ? trimmed.slice(0, 250) + "..." : trimmed)
    }

    return { challenges, unmatched }
}

// converts deadline date to UTC
export const parseDeadlineDate = (ends: string): Date | null => {
    const match = ends.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (!match){
        return null
    }

    const date = new Date(Date.UTC(
        parseInt(match[3] ?? ""),
        (parseInt(match[2] ?? "")) - 1,
        parseInt(match[1] ?? ""),
        parseInt(match[4] ?? ""),
        parseInt(match[5] ?? "")
    ))

    return isNaN(date.getTime()) ? null : date
}

/* the list counts as expired once its furthest deadline has passed */
export const getLatestDeadline = (challenges: Challenge[]): { ends: string, date: Date } | null => {
    let latest: { ends: string, date: Date } | null = null

    for (const challenge of challenges){
        const deadline = parseDeadlineDate(challenge.ends)
        if (deadline && (!latest || deadline > latest.date)){
            latest = { ends: challenge.ends, date: deadline }
        }
    }

    return latest
}

// since df challenges already gives the deadline and we know the challenges start day 1 of the week, we just get the start date based on the end date
export const getWeekStartDate = (deadline: Date): Date => {
    const start = new Date(deadline.getTime())

    const day = start.getUTCDay()
    const hour = start.getUTCHours()

    let daysSinceMonday = (day + 6) % 7
    if (day === 1 && hour < 11){
        daysSinceMonday = 7
    }

    start.setUTCDate(start.getUTCDate() - daysSinceMonday)
    start.setUTCHours(11, 0, 0, 0)

    return start
}

// we show in progress if no one completes it. show as completed if someone assigns themself to have completed it
export const getChallengeStatus = (challenge: Challenge): string => {
    return challenge.completed_by ? "✅ Completed" : "⏳ In Progress"
}

// show none if no one completes it, add name & timestamp when completed
export const getCompletedByLabel = (challenge: Challenge): string => {
    if (!challenge.completed_by){
        return "—"
    }

    return challenge.completed_on
        ? `<@${challenge.completed_by}> (Completed: ${challenge.completed_on})`
        : `<@${challenge.completed_by}>`
}
