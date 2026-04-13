import { ChatInputCommandInteraction, Client, type CacheType } from 'discord.js';
import { validateInput } from './utils/host.util';
import Profiler from './profiler';
import type { Commands } from './types/command.type';

class Host {
    private readonly client: Client
    private readonly commands: Commands
    private readonly profiler: Profiler

    constructor(client: Client) {
        this.client = client
        this.profiler = new Profiler(client)

        this.commands = {
            profile: (int: any, text: any) => this.profiler.fetchProfile(int, text),
            weeklyloot: (int: any, text: any) => this.profiler.fetchWeekly(int),
            clan: (int: any, text: any) => this.profiler.fetchClanLoot(int),
            compete: (int: any, text: any) => this.profiler.fetchClanWeeklyLoot(int),
            set: (int: any, text: any) => this.profiler.setProfile(int, text),
            setfor: (int: any, text: any) => this.profiler.setProfileFor(int, text),
            me: (int: any, text: any) => this.profiler.getSelfProfile(int),
            who: (int: any, text: any) => this.profiler.getPlayerProfile(int, text),
            market: (int: any, text: any) => this.profiler.getMarketPrice(int, text),
            simplemarket: (int: any, text: any) => this.profiler.getMarketPrice(int, text, true),
            reversewho: (int: any, text: any) => this.profiler.getProfileByName(int, text)
        }
    }

    async onCommand(interaction: ChatInputCommandInteraction<CacheType>, command: string) {
        const text = validateInput(interaction)

        //handle an edge case
        if (!this.commands?.[command]){
            await interaction.reply("Command does not exist")
            return
        }
        
        await this.commands[command](interaction, text)
    }
}

export default Host