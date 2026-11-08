const url = new URL('/api/reminders/run', process.env.APP_URL || 'http://127.0.0.1:3000');
const secret = process.env.CRON_SECRET;
if (!secret) { console.error('Thiếu CRON_SECRET.'); process.exit(1); }
try {
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  console.log(JSON.stringify(result));
  if (!response.ok) process.exitCode = 1;
} catch (error) { console.error(error instanceof Error ? error.message : 'Không gọi được lịch nhắc.'); process.exitCode = 1; }
