import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { memorialEvents, shiftIso, solarOccurrence, vietnamToday } from '@/lib/lunar';
import { readFamily, updateFamily } from '@/lib/store';
import { sendZaloReminder, zaloConfigStatus } from '@/lib/zalo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Vui lòng đăng nhập quản trị.' }, { status: 401 });
  const data = await readFamily();
  return NextResponse.json({ ...zaloConfigStatus(), subscriptions: data.reminders.length, sent: data.reminderLogs.filter(log => log.status === 'sent').length });
}
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Không được phép chạy lịch nhắc.' }, { status: 401 });
  const status = zaloConfigStatus();
  if (!status.ready) return NextResponse.json({ error: 'Zalo chưa được cấu hình.', missing: status.missing }, { status: 503 });
  const today = vietnamToday(); const year = Number(today.slice(0, 4));
  const data = await readFamily(); const events = new Map(memorialEvents(data.members, data.shrines).map(event => [event.key, event]));
  const due = data.reminders.filter(reminder => reminder.enabled).flatMap(reminder => {
    const event = events.get(reminder.eventKey); const recipient = data.members.find(member => member.id === reminder.recipientId);
    if (!event || !recipient?.zaloConsent || !recipient.zaloPhone) return [];
    return [year - 1, year, year + 1].map(lunarYear => solarOccurrence(event.lunar, lunarYear)).filter((eventDate): eventDate is string => !!eventDate && shiftIso(eventDate, -reminder.daysBefore) === today).map(eventDate => ({ reminder, event, recipient, eventDate }));
  });
  let sent = 0; let failed = 0; let skipped = 0;
  for (const item of due) {
    const reserved = await updateFamily(data => {
      const previous = data.reminderLogs.find(log => log.subscriptionId === item.reminder.id && log.eventDate === item.eventDate && (log.status === 'sent' || log.status === 'pending' && Date.now() - Date.parse(log.attemptedAt) < 60 * 60 * 1000));
      if (previous) return null;
      const id = crypto.randomUUID(); data.reminderLogs.push({ id, subscriptionId: item.reminder.id, eventDate: item.eventDate, attemptedAt: new Date().toISOString(), status: 'pending', detail: '' });
      data.reminderLogs = data.reminderLogs.slice(-2000); return id;
    });
    if (!reserved.result) { skipped++; continue; }
    try {
      const messageId = await sendZaloReminder(item.recipient, item.event, item.reminder, item.eventDate);
      await updateFamily(data => { const log = data.reminderLogs.find(entry => entry.id === reserved.result); if (log) { log.status = 'sent'; log.detail = messageId; } });
      sent++;
    } catch (error) {
      await updateFamily(data => { const log = data.reminderLogs.find(entry => entry.id === reserved.result); if (log) { log.status = 'failed'; log.detail = error instanceof Error ? error.message : 'Lỗi gửi tin.'; } });
      failed++;
    }
  }
  return NextResponse.json({ date: today, due: due.length, sent, failed, skipped }, { status: failed ? 207 : 200 });
}
