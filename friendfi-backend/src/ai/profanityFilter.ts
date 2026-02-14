/**
 * Fallback profanity filter when AI providers fail.
 * Detects common profane/toxic words (case-insensitive, word boundaries).
 */
const BAD_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'cunt',
  'damn', 'hell', 'idiot', 'stupid', 'dumb', 'retard', 'retarded', 'nigger',
  'nigga', 'faggot', 'fag', 'whore', 'slut', 'kill', 'die', 'hate you',
  'kys', 'kill yourself', 'stfu', 'shut up', 'loser', 'ugly', 'fat',
  'hate', 'pathetic', 'trash', 'worthless', 'useless', 'stupid ass',
];

export function runProfanityFilter(text: string): { toxicityScore: number; flagged: boolean } {
  if (!text || typeof text !== 'string') return { toxicityScore: 0, flagged: false };
  const lower = text.toLowerCase().trim();
  if (!lower) return { toxicityScore: 0, flagged: false };

  let matchCount = 0;
  for (const word of BAD_WORDS) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) matchCount += matches.length;
  }

  if (matchCount === 0) return { toxicityScore: 0, flagged: false };
  const score = Math.min(100, 60 + matchCount * 15);
  return { toxicityScore: score, flagged: true };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
