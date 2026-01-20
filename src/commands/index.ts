import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

const profile = {
    ...new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Get DFprofiler by name")
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("Search by name")
                .setRequired(true)
        )
}

const clanWeekly = {
    ...new SlashCommandBuilder()
        .setName("weeklyloot")
        .setDescription("Get clan top weekly loot")
}

const clan = {
    ...new SlashCommandBuilder()
        .setName("clan")
        .setDescription("Get loot numbers of ToD members")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
}

const compete = {
    ...new SlashCommandBuilder()
        .setName("compete")
        .setDescription("Get loot numbers of competing ToD Members (get by clan weekly)")
}

const setProfile = {
    ...new SlashCommandBuilder()
        .setName("set")
        .setDescription("Set a dfprofiler id account to yourself")
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("DFProfiler ID")
                .setRequired(true)
        )
}

const setForProfile = {
    ...new SlashCommandBuilder()
        .setName("setfor")
        .setDescription("Set a dfprofiler id account to someone")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('mention the user')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("text2")
                .setDescription("DFProfiler ID")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
}

const getProfile = {
    ...new SlashCommandBuilder()
        .setName("me")
        .setDescription("Show your dfprofile")
}

const checkProfile = {
    ...new SlashCommandBuilder()
        .setName("who")
        .setDescription("Show someone's dfprofiler (if any)")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('mention the user')
                .setRequired(true)
        )
}

const checkMarket = {
    ...new SlashCommandBuilder()
        .setName("market")
        .setDescription("Check market price of items (only shows 10 items)")
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('area to check market from')
                .setRequired(true)
                .addChoices(
                    { name: "Outpost Zone", value: "21" },
                    { name: "Camp Valcrest", value: "22" }
                )
        )
        .addStringOption(option =>
            option
                .setName('text2')
                .setDescription('name of the item')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName('number3')
                .setDescription('page (defaults to 1 if none)')
                .setRequired(false)
        )
}

const checkSimpleMarket = {
    ...new SlashCommandBuilder()
        .setName("simplemarket")
        .setDescription("Check market price of items (only shows 10 items) with simple, mobile-friendly output")
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('area to check market from')
                .setRequired(true)
                .addChoices(
                    { name: "Outpost Zone", value: "21" },
                    { name: "Camp Valcrest", value: "22" }
                )
        )
        .addStringOption(option =>
            option
                .setName('text2')
                .setDescription('name of the item')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName('number3')
                .setDescription('page (defaults to 1 if none)')
                .setRequired(false)
        )
}

const getProfileByName = {
    ...new SlashCommandBuilder()
        .setName("reversewho")
        .setDescription("Check if the person exists in discord by their df username")
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("DF Profile Name")
                .setRequired(true)
        )
}

const COMMANDS = [
    profile,
    clanWeekly,
    clan,
    compete,
    setProfile,
    setForProfile,
    getProfile,
    checkProfile,
    checkMarket,
    checkSimpleMarket,
    getProfileByName
]

export default COMMANDS;