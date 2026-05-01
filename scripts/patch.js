const fs = require('fs');
const { LANGUAGE_TAGS } = require('../constants');

const tagMapping = {
  "jeff su": ["Tutorials", "Productivity"],
  "Greg Isenberg": ["Business", "Agents"],
  "Ali Abdaal": ["Productivity", "Career"],
  "Lenny's Podcast": ["PM", "Career"],
  "Nate B Jones": ["News", "Dev"],
  "Julian Goldie": ["News", "Automation"],
  "Nick Saraev": ["Tutorials", "Automation"],
  "Fireship": ["News", "Dev"],
  "Andrej Karpathy": ["ML", "Tutorials"],
  "t3dotgg": ["Dev", "Reviews"],
  "Matt Wolfe": ["News", "Reviews"],
  "Dan Koe": ["Business", "Solopreneur"],

  "Thomas Frank": ["Productivity", "Study Skills"],
  "@freecodecamp": ["Programming", "Tutorials"],
  "@cs50": ["Programming", "Computer Science"],
  "@crashcourse": ["Education", "History"],
  "@learnskillsdaily": ["Soft Skills", "Education"],
  "Cal Newport": ["Productivity", "Deep Work"],
  "Adam Grant": ["Work Psychology", "Leadership"],
  "Seth Godin": ["Marketing", "Business Strategy"],

  "@GettingMore": ["Negotiation", "Soft Skills"],
  "@ChrisVoss": ["Negotiation", "Communication"],
  "@NegotiateAnything": ["Negotiation", "Business"],
  "@charismaoncommand": ["Communication", "Psychology"],
  "@ThinkFastTalkSmart": ["Communication", "Soft Skills"]
};

// Patch results.json
let data = JSON.parse(fs.readFileSync('results.json', 'utf8'));
data.forEach(d => {
  if (tagMapping[d.channel]) {
    const existing = d.tags || [];
    d.tags = Array.from(new Set([...existing, ...tagMapping[d.channel]]));
  }
});
fs.writeFileSync('results.json', JSON.stringify(data, null, 2));
console.log('patch.js: tags enriched in results.json');
