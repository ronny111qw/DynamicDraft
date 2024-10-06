const TEXTGEAR_API_KEY = 'oqywxjpr5hjRC57g';
const TEXTGEAR_API_URL = 'https://api.textgears.com/check.php';

export interface TextGearSuggestion {
  id: string;
  offset: number;
  length: number;
  description: string;
  bad: string;
  better: string[];
  type: string;
}

export async function checkGrammarWithTextGear(text: string): Promise<TextGearSuggestion[]> {
  const params = new URLSearchParams({
    text,
    key: TEXTGEAR_API_KEY,
    language: 'en-US',
  });

  try {
    console.log('Calling TextGear API with URL:', `${TEXTGEAR_API_URL}?${params.toString()}`);
    const response = await fetch(`${TEXTGEAR_API_URL}?${params.toString()}`);
    console.log('TextGear API response status:', response.status);
    const data = await response.json();
    console.log('TextGear API response data:', data);

    if (data.status) {
      return data.response.errors;
    } else {
      console.error('TextGear API error:', data.error);
      return [];
    }
  } catch (error) {
    console.error('Error calling TextGear API:', error);
    return [];
  }
}