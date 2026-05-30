const fs = require('fs');
const content = fs.readFileSync('C:/Users/pedro/.gemini/antigravity/brain/cba3fed0-bb5a-4346-9993-994995c6e776/.system_generated/steps/274/content.md', 'utf8');
const match = content.match(/https?:\/\/[a-zA-Z0-9.-]+/g);
if (match) {
  const urls = [...new Set(match)];
  console.log('URLs found in bundle:', urls.filter(u => u.includes('render') || u.includes('localhost') || u.includes('api')));
} else {
  console.log('No URLs found');
}
