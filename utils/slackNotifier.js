import https from 'https';

/**
 * Sends a Slack failure notification via Bot Token.
 * Only called when there are test failures.
 */
export async function sendSlackFailureAlert({ suiteName, passed, failed, skipped, duration }) {
  const token     = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  const runBy     = process.env.SLACK_RUN_BY || 'Unknown';

  if (!token || !channelId) {
    console.log('⚠️  Slack: SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set — skipping notification');
    return;
  }

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const payload = {
    channel: channelId,
    text: `🚨 *${suiteName}* test run FAILED`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🚨 ${suiteName} — Test Run FAILED`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*✅ Passed:*\n${passed}` },
          { type: 'mrkdwn', text: `*❌ Failed:*\n${failed}` },
          { type: 'mrkdwn', text: `*⏭ Skipped:*\n${skipped}` },
          { type: 'mrkdwn', text: `*⏱ Duration:*\n${duration}` },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🖥 *Run by:* ${runBy}   |   📅 ${now}`,
          },
        ],
      },
    ],
  };

  const data = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'slack.com',
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            console.log('📣 Slack failure alert sent to #app-automation');
          } else {
            console.warn('⚠️  Slack API error:', parsed.error);
          }
          resolve(parsed);
        });
      }
    );
    req.on('error', (err) => {
      console.warn('⚠️  Slack notification failed:', err.message);
      resolve(null);
    });
    req.write(data);
    req.end();
  });
}
