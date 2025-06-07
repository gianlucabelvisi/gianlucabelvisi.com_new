export interface ReactionData {
  name: string;
  icon: string;
  tooltip: string;
}

export const reactionData: ReactionData[] = [
  {
    name: "like",
    icon: "👍🏽",
    tooltip: "It was alright"
  },
  {
    name: "lol",
    icon: "😂",
    tooltip: "It made me giggle!"
  },
  {
    name: "love",
    icon: "🥰",
    tooltip: "I legit loved it!"
  },
  {
    name: "cringe",
    icon: "😬",
    tooltip: "It was kinda cringe"
  },
  {
    name: "pony",
    icon: "🦄",
    tooltip: "What a piece of shit"
  }
]; 