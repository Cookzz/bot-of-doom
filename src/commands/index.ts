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

const COMMANDS = [
    profile,
    clanWeekly,
    clan,
    compete,
    setProfile,
    setForProfile,
    getProfile,
    checkProfile
]

export default COMMANDS;