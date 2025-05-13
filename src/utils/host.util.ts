export const validateInput = (interaction: any) => {
    let text = interaction.options.getString('text') ?? 
               interaction.options.getNumber('number') ??
               interaction.options.getUser('user') ??
               null;
    let secondaryText = interaction.options.getString('text2') ?? 
                        interaction.options.getNumber('number2') ?? null;

    if (text && typeof text === "number"){
        text = String(text)
    }
    if (secondaryText && typeof secondaryText === "number"){
        secondaryText = String(secondaryText)
    }

    //have "optional" secondary option, we try to not use more than 2 options
    if (text && secondaryText){
        text += `,${secondaryText}`
    }

    return text;
}