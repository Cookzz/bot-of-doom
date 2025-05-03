import { ChatInputCommandInteraction, Client, type CacheType } from 'discord.js';
import type { Commands } from './types/command.type';
import { validateInput } from './utils/host.util';
import Profiler from './profiler';

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
            clan: (int: any, text: any) => this.profiler.fetchClanLoot(int)
        }
    }

    async onCommand(interaction: ChatInputCommandInteraction<CacheType>, command: string) {
        const text = validateInput(interaction)
        
        await this.commands[command](interaction, text)
    }
}

export default Host