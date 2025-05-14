import { User, type CacheType, type ChatInputCommandInteraction } from "discord.js";

export const validateInput = (interaction: ChatInputCommandInteraction<CacheType>) => {
    let text = interaction.options.getString('text') ?? 
               interaction.options.getNumber('number') ??
               interaction.options.getUser('user') ??
               null;
    let secondaryText = interaction.options.getString('text2') ?? 
                        interaction.options.getNumber('number2') ?? 
                        interaction.options.getUser('user2') ??
                        null;

    if (text && typeof text === "number"){
        text = String(text)
    }
    if (secondaryText && typeof secondaryText === "number"){
        secondaryText = String(secondaryText)
    }

    //this is unique for /setfor command
    if (text instanceof User && secondaryText){
        return {
            user: text,
            text: secondaryText
        }
    }

    //have "optional" secondary option, we try to not use more than 2 options
    if (text && secondaryText){
        text += `,${secondaryText}`
    }

    return text;
}