export function getSuggestions(sentence = '', listeningText = '') {
  const text = `${sentence} ${listeningText}`.toLowerCase();
  if (/water|juice|drink|thirst/.test(text)) return ['WATER','JUICE','PLEASE','NO THANK YOU'];
  if (/food|eat|hungry|meal/.test(text)) return ['FOOD','YES PLEASE','NO THANK YOU','MORE'];
  if (/pain|hurt|comfortable/.test(text)) return ['PAIN','HELP','DOCTOR','PLEASE'];
  if (/i need|i want/.test(text)) return ['WATER','FOOD','SLEEP','HELP'];
  if (/water/.test(sentence.toLowerCase())) return ['PLEASE','NOW','THANK YOU','MORE'];
  return ['YES','NO','HELP','THANK YOU'];
}
