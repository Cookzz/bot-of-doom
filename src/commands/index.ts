import { SlashCommandBuilder } from "discord.js";

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
}

const COMMANDS = [
    profile,
    clanWeekly,
    clan
]

export default COMMANDS;