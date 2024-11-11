export async function verifyWord(word: string): Promise<any | false> {
  try {
    const result = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await result.json();
    if (data[0] && data[0].word) {
      return data[0];
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error al verificar la palabra:", error);
    return false;
  }
}
