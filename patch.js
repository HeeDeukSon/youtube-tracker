const fs = require('fs');

const tagMapping = {
  "todaycode": ["Tutorials", "Workflows"],
  "평범한 사업가": ["Interviews", "Obsidian"],
  "오후5시": ["News", "Claude"],
  "코드깎는 노인": ["Tutorials", "Claude"],
  "@Oppadu": ["Tutorials", "Office"],
  "@chester_roh": ["Interviews", "Tech"],
  "실밸개발자": ["Career", "Tech"],
  "윤자동": ["Automation", "Business"],
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
  
  "@GettingMore": ["Negotiation", "Soft Skills"],
  "@ChrisVoss": ["Negotiation", "Communication"],
  "@NegotiateAnything": ["Negotiation", "Business"],
  "@charismaoncommand": ["Communication", "Psychology"],
  "@ThinkFastTalkSmart": ["Communication", "Soft Skills"]
};

let txtLines = fs.readFileSync('youtube-traker.txt', 'utf8').split('\n');
let newLines = [];
let currentHandle = null;

for (let i = 0; i < txtLines.length; i++) {
  let line = txtLines[i];
  let t = line.trim();
  
  if (t === '' && currentHandle && tagMapping[currentHandle]) {
    if (!newLines[newLines.length-1].trim().startsWith('Tags')) {
      newLines.push(`     Tags    : ${tagMapping[currentHandle].join(', ')}`);
    }
    currentHandle = null;
  }
  
  newLines.push(line);
  
  if (t.startsWith('Handle')) {
    currentHandle = t.split(':')[1].trim();
  }
}

if (currentHandle && tagMapping[currentHandle] && !newLines[newLines.length-1].trim().startsWith('Tags')) {
  newLines.push(`     Tags    : ${tagMapping[currentHandle].join(', ')}`);
}

fs.writeFileSync('youtube-traker.txt', newLines.join('\n'));

// Patch results.json
let data = JSON.parse(fs.readFileSync('results.json', 'utf8'));
data.forEach(d => {
  if (tagMapping[d.channel]) {
    // Preserve language tags if present, otherwise set completely
    // For AI, we might already have "Korean" or "English" from the code
    if (d.category === 'AI') {
      const existing = d.tags || [];
      d.tags = Array.from(new Set([...existing, ...tagMapping[d.channel]]));
    } else {
      d.tags = tagMapping[d.channel];
    }
  }
});
fs.writeFileSync('results.json', JSON.stringify(data, null, 2));
