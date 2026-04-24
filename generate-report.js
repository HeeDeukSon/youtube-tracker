const fs = require('fs');

const data = JSON.parse(fs.readFileSync('results.json', 'utf-8'));
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

// Filter to current month only
const filtered = data.map(ch => ({
  ...ch,
  videos: ch.videos.filter(v => v.publishedAt.startsWith(currentMonth))
}));

const totalVideos = filtered.reduce((sum, ch) => sum + ch.videos.length, 0);
const sorted = [...filtered].sort((a, b) => b.videos.length - a.videos.length);

function bar(n) {
  return '█'.repeat(n) + (n === 0 ? '—' : '');
}

function pad(str, len) {
  return String(str).padEnd(len);
}

let out = '';

out += `
╔══════════════════════════════════════════════════════════════════════════════╗
║              YOUTUBE CHANNEL TRACKER — MONTHLY REPORT                      ║
║                    ${currentMonth.replace('-', '.')}                                           ║
║                    Generated: ${today}                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

  Total Channels  : ${data.length}
  Total Videos    : ${totalVideos} (${currentMonth} only)
  Period          : ${currentMonth}-01 ~ ${today}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  UPLOAD VOLUME RANKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Rank  ${pad('Channel', 22)} Videos   Bar
  ────  ──────────────────────   ───────  ────────────────────────────────────
`;

sorted.forEach((ch, i) => {
  const rank = String(i + 1).padStart(3, ' ');
  const name = pad(ch.channel, 22);
  const count = String(ch.videos.length).padStart(4, ' ');
  out += `  ${rank}  ${name}   ${count}     ${bar(ch.videos.length * 2)}\n`;
});

out += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CHANNEL-BY-CHANNEL BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

filtered.forEach(ch => {
  const count = ch.videos.length;
  out += `
  ▶ ${ch.channel}  (${count} video${count !== 1 ? 's' : ''})
  ${'─'.repeat(77)}
`;
  if (count === 0) {
    out += `  (no uploads this month)\n`;
  } else {
    ch.videos.forEach(v => {
      const date = v.publishedAt.slice(5, 10);
      const views = Number(v.viewCount).toLocaleString();
      const likes = v.likeCount === 'hidden' ? 'hidden' : Number(v.likeCount).toLocaleString();
      out += `  [${date}] ${v.title}\n`;
      out += `           Views: ${views}  |  Likes: ${likes}\n`;
      out += `           ${v.url}\n\n`;
    });
  }
});

out += `
╔══════════════════════════════════════════════════════════════════════════════╗
║  END OF REPORT                                        ${today}          ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

fs.writeFileSync('report.txt', out.trimStart());
console.log(`report.txt generated — ${totalVideos} videos across ${data.length} channels`);
