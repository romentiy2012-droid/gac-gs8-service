import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ServiceEntry = {
  id: number; date: string; mileage: number;
  reason: "По пробегу" | "По времени" | "Внеплановый ремонт";
  order: string; dealer: string; paintChecked: boolean; recommendations: string; notes: string;
};
type Profile = { purchaseDate: string; purchaseMileage: number; currentMileage: number };

const intervals = [
  { id: 0, label: "ТО-0", km: 5000, months: 3 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `ТО-${i + 1}`, km: (i + 1) * 10000, months: (i + 1) * 12 })),
];

const operations = [
  "Проверка состояния ремней безопасности",
  "Проверка всех ламп, звуковых сигналов и световых сигнализаторов",
  "Проверка стеклоочистителей, омывателей и щёток",
  "Проверка освещения салона, багажника, вещевого ящика и контрольных ламп",
  "Проверка работы стояночного тормоза",
  "Замена воздушного фильтра салона",
  "Проверка работы рулевого управления",
  "Диагностика электронных систем тестером",
  "Проверка лакокрасочного покрытия на сколы и коррозию",
  "Проверка шин, давления, протектора, колёсных болтов и дисков",
  "Проверка тормозных дисков, колодок и суппортов",
  "Проверка / замена тормозной жидкости (каждые два года)",
  "Проверка и смазка ограничителей дверей, замка капота и лючка бака",
  "Пробная поездка: тормоза, электротормоз, рулевое управление, климат",
  "Проверка / замена охлаждающей жидкости",
  "Замена топливного фильтра",
  "Замена свечей зажигания",
  "Замена воздушного фильтра двигателя",
  "Проверка / замена приводного ремня вспомогательных агрегатов",
  "Проверка АКБ, заряда и смазка клемм",
  "Замена моторного масла и масляного фильтра",
  "Проверка / замена масла в автоматической коробке передач",
  "Проверка / замена масла в раздаточной коробке / переднем редукторе",
  "Проверка / замена масла в заднем редукторе",
  "Проверка затяжки соединений подвески и шасси",
  "Проверка сайлент-блоков, шаровых опор, рулевых наконечников и стабилизатора",
  "Проверка кожухов подвески, приводных валов и рулевого управления",
  "Проверка магистралей и шлангов тормозной системы",
  "Проверка магистралей и шлангов топливной системы",
  "Проверка выпускной системы: утечки, повреждения и крепления",
  "Очистка дренажных отверстий ветрового стекла и кузова",
];
const to0Operations = [operations[0], operations[1], "Проверка уровня охлаждающей жидкости двигателя и омывателей", "Проверка узлов и агрегатов на утечки и внешние повреждения", operations[27], operations[9], operations[20]];

function operationAction(index: number, serviceId: number) {
  if (serviceId === 0) return to0Operations.includes(operations[index]) ? (index === 20 ? "Замена" : "Проверка") : null;
  const km = serviceId * 10;
  if ([0, 1, 2, 3, 9, 26, 27].includes(index)) return "Проверка";
  if ([4, 6, 8, 13, 19, 28, 29].includes(index)) return "Проверка";
  if ([5, 15, 17, 20].includes(index)) return "Замена";
  if (index === 7 || index === 30) return km >= 20 ? "Проверка" : null;
  if (index === 10) return "Проверка";
  if (index === 11) return km % 20 === 0 ? "Замена" : "Проверка";
  if (index === 12) return km >= 20 ? "Проверка / смазка" : null;
  if (index === 14) return km === 40 || km === 80 ? "Замена" : "Проверка";
  if (index === 16) return km === 60 ? "Замена" : "Проверка";
  if (index === 18) return km % 20 === 0 ? (km === 60 ? "Замена" : "Проверка") : null;
  if (index === 21) return km === 60 || km === 100 ? "Замена" : "Проверка";
  if (index === 22) return km === 100 ? "Замена" : "Проверка";
  if (index === 23) return km === 50 || km === 100 ? "Замена" : "Проверка";
  if (index === 24 || index === 25) return km % 20 === 0 ? "Проверка" : null;
  return null;
}
function addMonths(value: string, months: number) { const d = new Date(`${value}T12:00:00`); d.setMonth(d.getMonth() + months); return d; }
function formatDate(date: Date) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(date); }
function daysBetween(from: Date, to: Date) { return Math.ceil((to.getTime() - from.getTime()) / 86400000); }

export default function Home() {
  const [profile, setProfile] = useState<Profile>({ purchaseDate: "", purchaseMileage: 0, currentMileage: 0 });
  const [entries, setEntries] = useState<ServiceEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"home" | "schedule" | "history">("home");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [backupMessage, setBackupMessage] = useState("");
  const restoreInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("gac-service-data-v2");
    const hydrate = window.setTimeout(() => {
      if (raw) { try { const saved = JSON.parse(raw); setProfile(saved.profile ?? { purchaseDate: "", purchaseMileage: 0, currentMileage: 0 }); setEntries(saved.entries ?? []); } catch {} }
      else setEditingProfile(true);
      setReady(true);
    }, 0);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    navigator.storage?.persist?.().catch(() => undefined);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => { window.clearTimeout(hydrate); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("gac-service-data-v2", JSON.stringify({ profile, entries })); }, [profile, entries, ready]);

  const completedIds = useMemo(() => new Set(entries.filter(e => e.reason !== "Внеплановый ремонт").map(e => e.id)), [entries]);
  const highestCompleted = completedIds.size ? Math.max(...completedIds) : -1;
  const next = intervals.find(i => i.id === highestCompleted + 1) ?? null;
  const lastPlanned = [...entries].filter(e => e.reason !== "Внеплановый ремонт").sort((a, b) => b.id - a.id)[0];
  const due = useMemo(() => {
    if (!next || !profile.purchaseDate) return null;
    let dueDate: Date; let dueMileage: number;
    if (next.id <= 1) { dueDate = addMonths(profile.purchaseDate, next.months); dueMileage = profile.purchaseMileage + next.km; }
    else if (lastPlanned) { dueDate = addMonths(lastPlanned.date, 12); dueMileage = lastPlanned.mileage + 10000; }
    else { dueDate = addMonths(profile.purchaseDate, next.months); dueMileage = profile.purchaseMileage + next.km; }
    return { date: dueDate, mileage: dueMileage, days: daysBetween(new Date(), dueDate), km: dueMileage - profile.currentMileage };
  }, [next, profile, lastPlanned]);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const purchaseMileage = Number(data.get("purchaseMileage")); const currentMileage = Number(data.get("currentMileage"));
    setProfile({ purchaseDate: String(data.get("purchaseDate")), purchaseMileage, currentMileage: Math.max(currentMileage, purchaseMileage) }); setEditingProfile(false);
  }
  function saveEntry(event: FormEvent<HTMLFormElement>, id: number) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const entry: ServiceEntry = { id, date: String(data.get("date")), mileage: Number(data.get("mileage")), reason: String(data.get("reason")) as ServiceEntry["reason"], order: String(data.get("order")), dealer: String(data.get("dealer")), paintChecked: data.get("paintChecked") === "on", recommendations: String(data.get("recommendations")), notes: String(data.get("notes")) };
    setEntries(prev => [...prev.filter(e => !(e.id === id && e.reason !== "Внеплановый ремонт")), entry]);
    setProfile(prev => ({ ...prev, currentMileage: Math.max(prev.currentMileage, entry.mileage) })); setSelectedId(null); setTab("home");
  }

  function exportBackup() {
    const backup = { app: "GAC GS8 — сервис", version: 2, exportedAt: new Date().toISOString(), profile, entries };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gac-gs8-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupMessage("Резервная копия сохранена в загрузки устройства.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!backup?.profile || !Array.isArray(backup?.entries) || typeof backup.profile.purchaseDate !== "string") throw new Error("invalid");
      if (!window.confirm("Заменить текущие данные данными из выбранной резервной копии?")) return;
      setProfile({ purchaseDate: backup.profile.purchaseDate, purchaseMileage: Number(backup.profile.purchaseMileage) || 0, currentMileage: Number(backup.profile.currentMileage) || 0 });
      setEntries(backup.entries);
      setBackupMessage("Данные успешно восстановлены из резервной копии.");
    } catch {
      setBackupMessage("Этот файл не является резервной копией приложения.");
    }
  }

  const selected = selectedId === null ? null : intervals.find(i => i.id === selectedId)!;
  const selectedEntry = selected ? entries.find(e => e.id === selected.id && e.reason !== "Внеплановый ремонт") : undefined;
  const taskList = selected?.id === 0 ? to0Operations.map(name => ({ name, action: name === operations[20] ? "Замена" : "Проверка" })) : operations.map((name, index) => ({ name, action: operationAction(index, selected?.id ?? 0) })).filter(x => x.action);
  if (!ready) return <main className="loading">Загружаем сервисный журнал…</main>;

  if (selected) return <main className="app-shell detail-page">
    <button className="back" onClick={() => setSelectedId(null)}>← Назад к регламенту</button>
    <section className="detail-hero"><div><span className="eyebrow">GAC GS8 · сервисная книжка</span><h1>{selected.label}</h1><p>{selected.km.toLocaleString("ru-RU")} км · {selected.months} мес. · что наступит раньше</p></div><span className={selectedEntry ? "status done" : "status planned"}>{selectedEntry ? "Пройдено" : "По плану"}</span></section>
    {selected.id === 0 && <aside className="book-note"><b>Бесплатное ТО-0.</b> Допуск по пробегу: 5 000 ±500 км. Возьмите с собой сервисную книжку.</aside>}
    <section className="panel"><div className="section-title"><h2>Работы по сервисной книжке</h2><span>{taskList.length} операций</span></div><div className="tasks">{taskList.map((task, i) => <div className="task" key={task.name}><span className="task-number">{i + 1}</span><p>{task.name}</p><b>{task.action}</b></div>)}</div></section>
    <section className="panel record-panel"><div className="section-title"><h2>{selectedEntry ? "Изменить запись" : "Записать прохождение"}</h2><span>Сохраняется на устройстве</span></div>
      <form onSubmit={e => saveEntry(e, selected.id)} className="record-form">
        <label>Дата прохождения<input required name="date" type="date" defaultValue={selectedEntry?.date ?? new Date().toISOString().slice(0,10)} /></label>
        <label>Пробег, км<input required min="0" name="mileage" type="number" inputMode="numeric" defaultValue={selectedEntry?.mileage ?? profile.currentMileage} /></label>
        <label>Причина<select name="reason" defaultValue={selectedEntry?.reason ?? "По пробегу"}><option>По пробегу</option><option>По времени</option><option>Внеплановый ремонт</option></select></label>
        <label>№ заказ-наряда<input name="order" defaultValue={selectedEntry?.order} placeholder="Например, 12458" /></label>
        <label className="wide">Дилер<input name="dealer" defaultValue={selectedEntry?.dealer} placeholder="Наименование дилера" /></label>
        <label className="wide check"><input name="paintChecked" type="checkbox" defaultChecked={selectedEntry?.paintChecked} /> Осмотр состояния ЛКП кузова выполнен</label>
        <label className="wide">Рекомендации дилера<textarea name="recommendations" defaultValue={selectedEntry?.recommendations} placeholder="Что рекомендовано проверить или заменить" /></label>
        <label className="wide">Личные заметки<textarea name="notes" defaultValue={selectedEntry?.notes} placeholder="Масло, фильтры, особенности работ…" /></label>
        <button className="primary wide" type="submit">Сохранить прохождение {selected.label}</button>
      </form>
    </section>
  </main>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">G</div><div><b>GAC GS8</b><span>Сервисный журнал</span></div>{installPrompt && <button className="install" onClick={() => (installPrompt as Event & { prompt: () => void }).prompt()}>Установить</button>}</header>
    {tab === "home" && <>
      <section className="welcome"><span className="eyebrow">Ваш автомобиль</span><h1>Всё важное о ТО<br/>в одном месте.</h1><p>Расчёт по времени и пробегу — согласно сервисной книжке.</p></section>
      {!profile.purchaseDate ? <button className="setup-card" onClick={() => setEditingProfile(true)}><span>Первый шаг</span><b>Добавить дату покупки и пробег</b><i>→</i></button> : <>
        <section className={`due-card ${due && (due.days < 0 || due.km < 0) ? "overdue" : ""}`}><div className="due-top"><span>{due && (due.days < 0 || due.km < 0) ? "Обслуживание просрочено" : "Следующее обслуживание"}</span><b>{next?.label ?? "План выполнен"}</b></div>{due && <><div className="due-metrics"><div><strong>{due.km > 0 ? due.km.toLocaleString("ru-RU") : "0"}</strong><span>км осталось</span></div><em>или</em><div><strong>{due.days > 0 ? due.days : "0"}</strong><span>дней осталось</span></div></div><div className="due-footer"><span>До {due.mileage.toLocaleString("ru-RU")} км</span><span>До {formatDate(due.date)}</span></div></>}</section>
        <section className="mileage-card"><div><span>Текущий пробег</span><strong>{profile.currentMileage.toLocaleString("ru-RU")} <small>км</small></strong></div><button onClick={() => setEditingProfile(true)}>Изменить</button></section>
        <section className="next-section"><div className="section-title"><h2>Ближайшие ТО</h2><button onClick={() => setTab("schedule")}>Все этапы</button></div><div className="quick-list">{intervals.filter(i => !completedIds.has(i.id)).slice(0,3).map((i, index) => <button key={i.id} onClick={() => setSelectedId(i.id)}><span className={index === 0 ? "active-dot" : "dot"}>{i.id}</span><div><b>{i.label}</b><small>{i.km.toLocaleString("ru-RU")} км · {i.months} мес.</small></div><i>›</i></button>)}</div></section>
      </>}
    </>}
    {tab === "schedule" && <section className="schedule-view"><span className="eyebrow">Сервисная книжка</span><h1>Регламент ТО</h1><p>Нажмите на этап, чтобы увидеть полный перечень работ и внести отметку.</p><div className="schedule-grid">{intervals.map(i => <button key={i.id} onClick={() => setSelectedId(i.id)} className={completedIds.has(i.id) ? "completed" : next?.id === i.id ? "current" : ""}><span>{completedIds.has(i.id) ? "✓" : i.id}</span><div><b>{i.label}</b><small>{i.km.toLocaleString("ru-RU")} км · {i.months} мес.</small></div><i>›</i></button>)}</div><aside className="heavy-note"><b>Тяжёлые условия эксплуатации</b><p>При пыли, экстремальной температуре, горных дорогах, прицепе, поездках короче 10 км или холостом ходе свыше 30% масло и фильтр двигателя, а также фильтр салона меняются каждые 5 000 км.</p></aside></section>}
    {tab === "history" && <section className="schedule-view"><span className="eyebrow">Локальный журнал</span><h1>История обслуживания</h1>{entries.length === 0 ? <div className="empty"><b>Записей пока нет</b><p>Откройте нужное ТО в регламенте и сохраните дату прохождения.</p></div> : <div className="history-list">{[...entries].sort((a,b) => b.date.localeCompare(a.date)).map((e, idx) => <article key={`${e.id}-${idx}`}><span>{e.reason === "Внеплановый ремонт" ? "Р" : `ТО-${e.id}`}</span><div><b>{e.reason}</b><small>{new Date(`${e.date}T12:00:00`).toLocaleDateString("ru-RU")} · {e.mileage.toLocaleString("ru-RU")} км</small>{e.dealer && <p>{e.dealer}{e.order ? ` · № ${e.order}` : ""}</p>}</div>{e.reason !== "Внеплановый ремонт" && <button onClick={() => setSelectedId(e.id)}>›</button>}</article>)}</div>}
      <section className="backup-panel"><div><span className="eyebrow">Защита данных</span><h2>Резервная копия</h2><p>Скачайте один файл со всеми данными. Его можно сохранить в iCloud, Google Drive или отправить себе.</p></div><div className="backup-actions"><button className="primary" onClick={exportBackup}>Скачать копию</button><button className="secondary" onClick={() => restoreInput.current?.click()}>Восстановить</button></div><input ref={restoreInput} onChange={restoreBackup} className="file-input" type="file" accept="application/json,.json" />{backupMessage && <small className="backup-message">{backupMessage}</small>}</section>
    </section>}
    <nav className="bottom-nav"><button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><span>⌂</span>Обзор</button><button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}><span>▦</span>Регламент</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><span>◷</span>История</button></nav>
    {editingProfile && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && profile.purchaseDate && setEditingProfile(false)}><section className="modal"><button className="close" onClick={() => profile.purchaseDate && setEditingProfile(false)}>×</button><span className="eyebrow">Данные автомобиля</span><h2>{profile.purchaseDate ? "Обновить пробег" : "Начнём с главного"}</h2><p>Дата продажи нужна для правильного расчёта первого интервала и начала гарантии.</p><form onSubmit={saveProfile}><label>Дата покупки / начала гарантии<input required name="purchaseDate" type="date" defaultValue={profile.purchaseDate} /></label><label>Пробег при покупке, км<input required min="0" name="purchaseMileage" type="number" inputMode="numeric" defaultValue={profile.purchaseMileage} /></label><label>Текущий пробег, км<input required min="0" name="currentMileage" type="number" inputMode="numeric" defaultValue={profile.currentMileage} /></label><button className="primary" type="submit">Сохранить данные</button></form></section></div>}
  </main>;
}
