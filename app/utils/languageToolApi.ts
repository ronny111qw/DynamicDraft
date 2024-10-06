const LANGUAGE_TOOL_API_URL = 'https://api.languagetool.org/v2/check';

export interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  sentence: string;
  type: { typeName: string };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
}

export interface LanguageToolResponse {
  software: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    premium: boolean;
    premiumHint: string;
    status: string;
  };
  warnings: { incompleteResults: boolean };
  language: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
      confidence: number;
    };
  };
  matches: LanguageToolMatch[];
}

export async function checkGrammarWithLanguageTool(text: string): Promise<LanguageToolMatch[]> {
  const params = new URLSearchParams({
    text,
    language: 'en-US',
  });

  try {
    console.log('Calling LanguageTool API');
    const response = await fetch(`${LANGUAGE_TOOL_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    console.log('LanguageTool API response status:', response.status);
    const data: LanguageToolResponse = await response.json();
    console.log('LanguageTool API response data:', data);

    if (response.ok) {
      return data.matches;
    } else {
      console.error('LanguageTool API error:', data);
      return [];
    }
  } catch (error) {
    console.error('Error calling LanguageTool API:', error);
    return [];
  }
}