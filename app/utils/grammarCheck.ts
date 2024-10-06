import { LanguageToolMatch, checkGrammarWithLanguageTool } from './languageToolApi';

export interface GrammarSuggestion {
  index: number;
  length: number;
  suggestion: string;
  original: string;
  severity: 'low' | 'medium' | 'high';
  rule: string;
}

const commonGrammarRules = [
  { 
    regex: /\b(a)\s+(?=[aeiou])/gi, 
    suggestion: (match: RegExpExecArray) => `an ${match[1]}`,
    rule: "a/an usage",
    severity: "medium"
  },
  { 
    regex: /\b(an)\s+(?=[^aeiou])/gi, 
    suggestion: (match: RegExpExecArray) => `a ${match[1]}`,
    rule: "a/an usage",
    severity: "medium"
  },
  { 
    regex: /\b(i|we|you|they)\s+(is|was)\b/gi, 
    suggestion: (match: RegExpExecArray) => `${match[1]} ${match[1].toLowerCase() === 'i' ? 'am' : 'are'}`,
    rule: "subject-verb agreement",
    severity: "high"
  },
  { 
    regex: /\b(he|she|it)\s+(am|are)\b/gi, 
    suggestion: (match: RegExpExecArray) => `${match[1]} is`,
    rule: "subject-verb agreement",
    severity: "high"
  },
  { 
    regex: /\b(your)\s+([\w]+ing)\b/gi, 
    suggestion: (match: RegExpExecArray) => `you're ${match[2]}`,
    rule: "your/you're usage",
    severity: "high"
  },
  { 
    regex: /\b(their)\s+([\w]+ing)\b/gi, 
    suggestion: (match: RegExpExecArray) => `they're ${match[2]}`,
    rule: "their/they're usage",
    severity: "high"
  },
  { 
    regex: /\b(its)\s+([\w]+ing)\b/gi, 
    suggestion: (match: RegExpExecArray) => `it's ${match[2]}`,
    rule: "its/it's usage",
    severity: "high"
  },

];

const resumeSpecificPhrases = [
  "results-driven",
  "team player",
  "detail-oriented",  
  "self-motivated",
  "problem-solver",
  "critical thinker",
  "innovative",
  "leadership",
  "communication",
  "time management",
  "adaptable",
  "proactive",
  "analytical",
  "creative",
];

// In utils/grammarCheck.ts

export function checkLocalGrammar(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = [];

  commonGrammarRules.forEach(rule => {
    if (rule.regex && typeof rule.regex.exec === 'function') {
      let match;
      while ((match = rule.regex.exec(text)) !== null) {
        suggestions.push({
          index: match.index,
          length: match[0].length,
          suggestion: rule.suggestion(match),
          original: match[0],
          severity: rule.severity as 'low' | 'medium' | 'high',
          rule: rule.rule
        });
      }
    } else {
      console.warn('Invalid rule:', rule);
    }
  });

  return suggestions;
}

function checkResumeSpecificContent(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = [];

  resumeSpecificPhrases.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      suggestions.push({
        index: match.index,
        length: match[0].length,
        suggestion: `Consider rephrasing "${phrase}"`,
        original: match[0],
        severity: 'low',
        rule: 'resume-specific language'
      });
    }
  });

  return suggestions;
}

function mapTextGearToGrammarSuggestion(textGearSuggestion: TextGearSuggestion): GrammarSuggestion {
  return {
    index: textGearSuggestion.offset,
    length: textGearSuggestion.length,
    suggestion: textGearSuggestion.better[0] || '',
    original: textGearSuggestion.bad,
    severity: textGearSuggestion.type === 'grammar' ? 'high' : 'medium',
    rule: textGearSuggestion.description,
  };
}

function mapLanguageToolToGrammarSuggestion(match: LanguageToolMatch): GrammarSuggestion {
  return {
    index: match.offset,
    length: match.length,
    suggestion: match.replacements[0]?.value || '',
    original: match.context.text.slice(match.context.offset, match.context.offset + match.context.length),
    severity: match.rule.issueType === 'misspelling' ? 'high' : 'medium',
    rule: match.rule.description,
  };
}

export async function checkGrammar(text: string, useApi: boolean = false): Promise<GrammarSuggestion[]> {
  console.log('Checking grammar. Use API:', useApi);
  const localSuggestions = checkLocalGrammar(text);
  const resumeSpecificSuggestions = checkResumeSpecificContent(text);

  let apiSuggestions: GrammarSuggestion[] = [];
  if (useApi) {
    console.log('Calling LanguageTool API');
    try {
      const languageToolMatches = await checkGrammarWithLanguageTool(text);
      console.log('LanguageTool API suggestions:', languageToolMatches);
      apiSuggestions = languageToolMatches.map(mapLanguageToolToGrammarSuggestion);
    } catch (error) {
      console.error('Error in LanguageTool API call:', error);
    }
  }

  const allSuggestions = [...localSuggestions, ...resumeSpecificSuggestions, ...apiSuggestions];
  console.log('All grammar suggestions:', allSuggestions);

  return allSuggestions;
}
export const isResumeSpecificTerm = (word: string): boolean => {
  return resumeSpecificPhrases.includes(word.toLowerCase());
};