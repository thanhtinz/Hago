import React, { useEffect, useState } from 'react';
import { api, fmtDate, GAME_NAMES } from '../api';
import { Card, Empty, Pill } from '../ui';

const DAY = 86_400_000;

export default function LiveOps({ toast }: { toast: (t: string) => void }) {
  const [quests, setQuests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [guildQuests, setGuildQuests] = useState<any[]>([]);
  const [gq, setGq] = useState({ title: '', description: '', metric: 'play_match', target: 50, rewardCoin: 300, rewardXp: 200, rewardGuildPoints: 300 });
  const [quest, setQuest] = useState({ title: '', type: 'daily', metric: 'play_match', target: 3, rewardCoin: 100, rewardXp: 60, rewardDiamond: 0, gameType: '', eventId: '' });
  const [event, setEvent] = useState({ title: '', description: '', kind: 'seasonal', days: 7, banner: '#7C6BFF' });
  const [announce, setAnnounce] = useState({ title: '', body: '' });

  const load = () => {
    api('/api/admin/quests').then((r: any) => setQuests(r.quests));
    api('/api/admin/events').then((r: any) => setEvents(r.events));
    api('/api/admin/guild-quests').then((r: any) => setGuildQuests(r.quests));
  };
  useEffect(load, []);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid two">
        <Card title="Tạo nhiệm vụ">
          <div className="stack">
            <label className="field">
              Tiêu đề
              <input value={quest.title} onChange={(e) => setQuest({ ...quest, title: e.target.value })} placeholder="VD: Thắng 3 trận Caro" />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Chu kỳ
                <select value={quest.type} onChange={(e) => setQuest({ ...quest, type: e.target.value })}>
                  <option value="daily">Hằng ngày</option>
                  <option value="weekly">Hằng tuần</option>
                  <option value="event">Sự kiện</option>
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}>
                Chỉ số
                <select value={quest.metric} onChange={(e) => setQuest({ ...quest, metric: e.target.value })}>
                  <option value="play_match">Chơi trận</option>
                  <option value="win_match">Thắng trận</option>
                  <option value="play_with_friend">Chơi cùng bạn</option>
                  <option value="checkin">Điểm danh</option>
                </select>
              </label>
              <label className="field" style={{ width: 90 }}>
                Mục tiêu
                <input type="number" value={quest.target} onChange={(e) => setQuest({ ...quest, target: Number(e.target.value) })} />
              </label>
            </div>
            <label className="field">
              Thuộc sự kiện
              <select
                value={quest.eventId}
                onChange={(e) => {
                  // Gắn vào sự kiện thì chu kỳ là 'event': nhiệm vụ một lần, hiện
                  // trong thẻ sự kiện chứ không nằm ở màn Nhiệm vụ hằng ngày.
                  const eventId = e.target.value;
                  setQuest({ ...quest, eventId, type: eventId ? 'event' : quest.type === 'event' ? 'daily' : quest.type });
                }}
              >
                <option value="">Không (nhiệm vụ thường)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Giới hạn game
                <select value={quest.gameType} onChange={(e) => setQuest({ ...quest, gameType: e.target.value })}>
                  <option value="">Tất cả</option>
                  {Object.entries(GAME_NAMES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ width: 90 }}>
                Coin
                <input type="number" value={quest.rewardCoin} onChange={(e) => setQuest({ ...quest, rewardCoin: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ width: 90 }}>
                XP
                <input type="number" value={quest.rewardXp} onChange={(e) => setQuest({ ...quest, rewardXp: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ width: 100 }}>
                Diamond
                <input type="number" value={quest.rewardDiamond} onChange={(e) => setQuest({ ...quest, rewardDiamond: Number(e.target.value) })} />
              </label>
            </div>
            <button
              className="btn"
              onClick={async () => {
                if (!quest.title) return toast('Nhập tiêu đề nhiệm vụ');
                await api('/api/admin/quests', {
                  method: 'POST',
                  body: { ...quest, gameType: quest.gameType || null, eventId: quest.eventId || null },
                });
                toast('Đã tạo nhiệm vụ');
                setQuest({ ...quest, title: '' });
                load();
              }}
            >
              Tạo nhiệm vụ
            </button>
          </div>
        </Card>

        <Card title="Tạo sự kiện">
          <div className="stack">
            <label className="field">
              Tiêu đề
              <input value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} placeholder="VD: Lễ hội Trung Thu" />
            </label>
            <label className="field">
              Mô tả
              <input value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Loại
                <select value={event.kind} onChange={(e) => setEvent({ ...event, kind: e.target.value })}>
                  <option value="seasonal">Theo mùa</option>
                  <option value="login">Điểm danh</option>
                  <option value="winstreak">Chuỗi thắng</option>
                  <option value="tournament">Giải đấu</option>
                </select>
              </label>
              <label className="field" style={{ width: 110 }}>
                Số ngày
                <input type="number" value={event.days} onChange={(e) => setEvent({ ...event, days: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ width: 90 }}>
                Màu
                <input type="color" value={event.banner} onChange={(e) => setEvent({ ...event, banner: e.target.value })} style={{ padding: 2, height: 38 }} />
              </label>
            </div>
            <button
              className="btn"
              onClick={async () => {
                if (!event.title) return toast('Nhập tiêu đề sự kiện');
                await api('/api/admin/events', {
                  method: 'POST',
                  body: { ...event, startAt: Date.now(), endAt: Date.now() + event.days * DAY },
                });
                toast('Đã tạo sự kiện');
                setEvent({ ...event, title: '', description: '' });
                load();
              }}
            >
              Tạo sự kiện
            </button>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            <div className="muted" style={{ fontWeight: 700 }}>Gửi thông báo toàn hệ thống</div>
            <input placeholder="Tiêu đề" value={announce.title} onChange={(e) => setAnnounce({ ...announce, title: e.target.value })} />
            <input placeholder="Nội dung" value={announce.body} onChange={(e) => setAnnounce({ ...announce, body: e.target.value })} />
            <button
              className="btn sun"
              onClick={async () => {
                if (!announce.title) return toast('Nhập tiêu đề thông báo');
                const r: any = await api('/api/admin/announce', { method: 'POST', body: announce });
                toast(`Đã gửi tới ${r.recipients} người chơi`);
                setAnnounce({ title: '', body: '' });
              }}
            >
              Gửi thông báo
            </button>
          </div>
        </Card>
      </div>

      <div className="grid two">
        <Card title="Nhiệm vụ bang (mục tiêu chung cả tuần)">
          <div className="stack">
            <label className="field">
              Tiêu đề
              <input value={gq.title} onChange={(e) => setGq({ ...gq, title: e.target.value })} placeholder="VD: Cả bang thắng 25 trận" />
            </label>
            <label className="field">
              Mô tả
              <input value={gq.description} onChange={(e) => setGq({ ...gq, description: e.target.value })} />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Chỉ số
                <select value={gq.metric} onChange={(e) => setGq({ ...gq, metric: e.target.value })}>
                  <option value="play_match">Chơi trận</option>
                  <option value="win_match">Thắng trận</option>
                  <option value="guild_checkin">Điểm danh bang</option>
                </select>
              </label>
              <label className="field" style={{ width: 90 }}>
                Mục tiêu
                <input type="number" value={gq.target} onChange={(e) => setGq({ ...gq, target: Number(e.target.value) })} />
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Coin mỗi người
                <input type="number" value={gq.rewardCoin} onChange={(e) => setGq({ ...gq, rewardCoin: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                XP mỗi người
                <input type="number" value={gq.rewardXp} onChange={(e) => setGq({ ...gq, rewardXp: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                Cống hiến cho bang
                <input type="number" value={gq.rewardGuildPoints} onChange={(e) => setGq({ ...gq, rewardGuildPoints: Number(e.target.value) })} />
              </label>
            </div>
            <button
              className="btn"
              onClick={async () => {
                if (!gq.title) return toast('Nhập tiêu đề nhiệm vụ bang');
                await api('/api/admin/guild-quests', { method: 'POST', body: gq });
                toast('Đã tạo nhiệm vụ bang');
                setGq({ ...gq, title: '', description: '' });
                load();
              }}
            >
              Tạo nhiệm vụ bang
            </button>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            <div className="table-wrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Mục tiêu</th>
                    <th>Thưởng mỗi người</th>
                    <th>Cống hiến</th>
                  </tr>
                </thead>
                <tbody>
                  {guildQuests.map((q) => (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 700 }}>{q.title}</td>
                      <td>
                        {q.metric} × {q.target}
                      </td>
                      <td className="muted">
                        {q.reward_coin} coin · {q.reward_xp} XP
                      </td>
                      <td className="muted">{q.reward_guild_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card title={`Nhiệm vụ (${quests.length})`}>
          <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Chu kỳ</th>
                  <th>Sự kiện</th>
                  <th>Mục tiêu</th>
                  <th>Thưởng</th>
                </tr>
              </thead>
              <tbody>
                {quests.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 700 }}>{q.title}</td>
                    <td>
                      <Pill tone={q.type === 'daily' ? 'ok' : 'info'}>{q.type}</Pill>
                    </td>
                    <td className="muted">{events.find((ev) => ev.id === q.event_id)?.title ?? '—'}</td>
                    <td>
                      {q.metric} × {q.target}
                    </td>
                    <td className="muted">
                      {q.reward_coin} coin · {q.reward_xp} XP{q.reward_diamond ? ` · ${q.reward_diamond} diamond` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={`Sự kiện (${events.length})`}>
          <div className="stack">
            {events.map((e) => (
              <div key={e.id} className="spread" style={{ padding: 10, borderRadius: 12, background: 'var(--surface-alt)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{e.title}</div>
                  <div className="muted">
                    {e.kind} · {fmtDate(e.start_at)} → {fmtDate(e.end_at)} ·{' '}
                    {quests.filter((q) => q.event_id === e.id).length} nhiệm vụ
                  </div>
                </div>
                <Pill tone={e.end_at > Date.now() ? 'ok' : 'muted'}>{e.end_at > Date.now() ? 'đang chạy' : 'đã kết thúc'}</Pill>
              </div>
            ))}
            {!events.length ? <Empty icon="events" text="Chưa có sự kiện" /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
