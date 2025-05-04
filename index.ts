import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';

import COMMANDS from './src/commands'
import { existsSync } from 'node:fs'
import Host from './src/host';

const cmd = COMMANDS

/* Handle configuration and initialization */
try {
  /* 1. Check config first */
  console.log("Checking config file")
  const configPath = './config.json'
  if (!existsSync(configPath)){
      throw new Error("No config file found. Please check README and setup one yourself.")
  }
  console.log("Config file exists")

  /* 2. Import if it exists */
  const { TOKEN, CLIENT_ID } = await import(configPath)

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  /* 3. Start registering slash commands */
  console.log('Started refreshing application (/) commands.');

  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: cmd });

  console.log('Successfully reloaded application (/) commands.');

  /* 4. Setup client and login to discord bot */
  const client = new Client({ 
    intents: [
      GatewayIntentBits.Guilds, 
      GatewayIntentBits.GuildMessages, 
      GatewayIntentBits.GuildPresences, 
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates
    ] 
  });
  
  const host = new Host(client)
  
  client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
  });
  
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
  
    host.onCommand(interaction, interaction.commandName)
  });
  
  
  client.login(TOKEN);
} catch (error) {
  console.error("Config error: ", error);
}