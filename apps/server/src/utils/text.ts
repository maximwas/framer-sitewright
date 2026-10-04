export const asSentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);
