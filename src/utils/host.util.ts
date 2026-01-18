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
    let thirdText = interaction.options.getString('text3') ?? 
                        interaction.options.getNumber('number3') ?? 
                        interaction.options.getUser('user3') ??
                        null;

    if (text && typeof text === "number"){
        text = String(text)
    }
    if (secondaryText && typeof secondaryText === "number"){
        secondaryText = String(secondaryText)
    }
    if (thirdText && typeof thirdText === "number"){
        thirdText = String(thirdText)
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
    if (text && thirdText){
        text += `,${thirdText}`
    }

    return text;
}