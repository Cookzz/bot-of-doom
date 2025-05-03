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