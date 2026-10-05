const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/srira/.gemini/antigravity-ide/brain/7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4/.system_generated/logs/transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let index = 0;
  for await (const line of rl) {
    index++;
    if (line.includes('"type":"USER_INPUT"')) {
      try {
        const obj = JSON.parse(line);
        const text = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
        if (/AO[ _]ADMIN|AO Admin|Announcement|Notification|User Management|request|requested/i.test(text)) {
          console.log(`\n=== STEP ${index} ===`);
          console.log(text.substring(0, 150).replace(/\r?\n/g, ' '));
        }
      } catch (e) {}
    }
  }
}

processLineByLine();
