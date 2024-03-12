export function isMostlyEnglish(text: string): boolean {
    const englishCharacterCount = (text.match(/[a-zA-Z0-9\s.,!?'"`~@#$%^&*()-_=+[\]{};:\\|<>/?]/g) || []).length; // Matching English alphabets, digits, whitespaces, and commonly used symbols.
    const totalCharacters = text.length;
    const englishCharacterPercentage = (englishCharacterCount / totalCharacters) * 100;
  
    return englishCharacterPercentage >= 90;
  }

export function truncateStringToWords(inputString,number: number) {
    const words = inputString.split(' ');
    const wordCount = words.length;
  
    if (wordCount <= number) {
      return inputString;
    } else {
      const truncatedWords = words.slice(0, number);
      const truncatedString = truncatedWords.join(' ');
      return truncatedString;
    }
  }