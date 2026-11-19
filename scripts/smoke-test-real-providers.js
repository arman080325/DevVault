/**
 * Real Provider Smoke Tests
 * Calls http://localhost:3000/api/metadata/extract with actual live URLs
 */

const targets = [
  { name: 'Public YouTube Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'Public GitHub Repository', url: 'https://github.com/facebook/react' },
  { name: 'Instagram Reel', url: 'https://www.instagram.com/reel/C6Z5y3xL/' },
  { name: 'Normal Website', url: 'https://motion.dev' },
];

async function run() {
  console.log('--- Real Provider Smoke Tests ---\n');

  for (const target of targets) {
    console.log(`Testing: ${target.name} (${target.url})`);
    try {
      const res = await fetch('http://localhost:3000/api/metadata/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer devvault-test-token',
        },
        body: JSON.stringify({ url: target.url, skipCache: true }),
      });

      console.log(`HTTP Status: ${res.status}`);
      const json = await res.json();
      if (res.ok) {
        const d = json.data;
        console.log(`Extraction Status: ${d.extractionStatus}`);
        console.log(`Platform: ${d.platform}`);
        console.log(`Content Type: ${d.contentType}`);
        console.log(`Title: ${d.title}`);
        console.log(`Description: ${d.description ? (d.description.slice(0, 80) + '...') : null}`);
        console.log(`Image: ${d.image}`);
        console.log(`Author: ${d.author}`);
        console.log(`Confidence: ${d.confidence}`);
        if (d.warnings) {
          console.log(`Warnings: ${JSON.stringify(d.warnings)}`);
        }
      } else {
        console.log(`Error Response:`, json);
      }
    } catch (err) {
      console.error(`Request failed:`, err.message);
    }
    console.log('--------------------------------------------------\n');
  }
}

run();
