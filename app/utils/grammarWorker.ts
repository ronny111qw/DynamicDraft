import { checkGrammar } from './grammarCheck';

self.onmessage = async function(e) {
  const text = e.data;
  const suggestions = await checkGrammar(text);
  self.postMessage(suggestions);
}