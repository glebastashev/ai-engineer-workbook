import { createContext, useContext, useState } from 'react';
import { Check, CheckCheck, ChevronDown, CloudCheck, HardDrive, LoaderCircle, RotateCw } from 'lucide-react';
import { defaultCourse } from './content.mjs';
import s from './worksheet.module.css';
import {useWorksheet} from './useWorksheet';

type Answers = Record<string, string | boolean>;
const checks = [
  ['lesson1Watched', 'programRead', 'orderUnderstood', 'startReady'],
  ['lesson2Watched', 'goalChecked', 'moduleGoalChecked', 'reviewPlanned'],
  ['lesson3Watched', 'scheduleChecked', 'taskChecked', 'calendarChecked'],
];

const WorksheetContext = createContext<{ answers: Answers; update: (key: string, value: string | boolean) => void }>({ answers: {}, update: () => {} });

  function Field({ id, label, placeholder, hint, type = 'text', wide = false }: { id: string; label: string; placeholder?: string; hint?: string; type?: string; wide?: boolean }) {
    const { answers, update } = useContext(WorksheetContext);
    const text = (key: string) => typeof answers[key] === 'string' ? answers[key] as string : '';
    return <label className={`${s.field} ${wide ? s.wide : ''}`} htmlFor={id}>
      <span>{label}</span>
      {type === 'area' ? <textarea id={id} rows={3} maxLength={4000} value={text(id)} placeholder={placeholder} onChange={e => update(id, e.target.value)} /> :
        <input id={id} type={type} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 168 : undefined} step={type === 'number' ? 0.5 : undefined} maxLength={4000} value={text(id)} placeholder={placeholder} onChange={e => update(id, e.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>;
  }
  function Tick({ id, children }: { id: string; children: React.ReactNode }) {
    const { answers, update } = useContext(WorksheetContext);
    return <label className={s.tick} data-checked={answers[id] === true}>
      <input type="checkbox" checked={answers[id] === true} onChange={e => update(id, e.target.checked)} />
      <span>{children}</span>
    </label>;
  }
  function Heading({ index, title, subtitle }: { index: number; title: string; subtitle: string }) {
    const { answers } = useContext(WorksheetContext);
    const done = (i: number) => checks[i].filter(key => answers[key] === true).length;
    return <div className={s.sectionHeading}><span className={s.number}>{done(index) === 4 ? <Check size={22} /> : `0${index + 1}`}</span><div><h2>{title}</h2><p>{subtitle}</p></div><span className={s.sectionCount}>{done(index)}/4</span></div>;
  }


type WorkbookState = {
 answers: Answers; ready: boolean; status: string; error: string;
 update: (key:string,value:string|boolean)=>void; retry:()=>unknown;
 legacyCount?:number; importLegacy?:()=>Promise<void>; importBusy?:boolean;
};
export default function Worksheet() { return <WorksheetView workbook={useWorksheet()}/>; }
export function WorksheetView({workbook,account,signOut}:{workbook:WorkbookState;account?:string;signOut?:()=>Promise<void>}) {
  const { answers, ready, status, error, update, retry } = workbook;
  const [logoutError,setLogoutError]=useState('');
  const complete = checks.flat().filter(key => answers[key] === true).length;

  return <WorksheetContext.Provider value={{ answers, update }}><div className={s.page}>
    <header className={s.header}><div className={s.headerInner}>
      <img src="./brand/ai-factory-logo.jpg" alt="AI Factory" width={174} height={40} />
      <span className={s.courseName}>AI-инженер / рабочая тетрадь</span>
      {account&&<div className={s.account}><span>{account}</span><button type="button" disabled={status==='saving'} onClick={()=>{setLogoutError('');void signOut?.().catch(()=>setLogoutError('Не удалось выйти. Проверь соединение и попробуй ещё раз.'))}}>Выйти</button></div>}
      <div className={s.save} data-state={status} role="status" aria-live="polite">
        {status === 'loading' || status === 'saving' ? <LoaderCircle className={s.spin} size={17} /> : status === 'saved' ? account ? <CloudCheck size={18}/> : <HardDrive size={18} /> : <RotateCw size={17} />}
        <span>{status === 'saved' ? account ? 'Сохранено в аккаунте' : 'Сохранено в этом браузере' : status === 'saving' ? 'Сохраняем…' : status === 'loading' ? 'Загружаем…' : 'Не сохранено'}</span>
      </div>
    </div></header>
    <main className={s.main}>
      <div className={s.intro}><div><span className={s.eyebrow}>Три урока перед стартом</span><h1>Вступительный модуль</h1><p>Запиши ответы и отмечай выполненное. Можно прерваться и вернуться позже.</p></div><div className={s.progressCount}><b>{complete}<span>/12</span></b><small>пунктов выполнено</small></div></div>
      <div className={s.progress} role="progressbar" aria-label="Готовность к старту" aria-valuemin={0} aria-valuemax={12} aria-valuenow={complete}><span style={{ width: `${complete / 12 * 100}%` }} /></div>
      <nav className={s.jumpLinks} aria-label="Разделы тетради"><a href="#program">01 Программа</a><a href="#goals">02 Мои цели</a><a href="#plan">03 Первая неделя</a></nav>
      {logoutError&&<div className={s.error} role="alert">{logoutError}</div>}
      {ready&&!!workbook.legacyCount&&<div className={s.importBox}><div><b>В этом браузере есть ответы из прежней версии</b><p>Перенести их в аккаунт {account}? Заполненные поля аккаунта сохранятся.</p></div><button type="button" onClick={()=>void workbook.importLegacy?.()} disabled={workbook.importBusy}>{workbook.importBusy?'Переносим…':'Перенести мои ответы'}</button></div>}
      {error && <div className={s.error} role="alert"><p>{error}</p><button type="button" onClick={() => void retry()}><RotateCw size={16} /> Попробовать ещё раз</button></div>}
      {!ready ? <div className={s.loading}>{!error && <><LoaderCircle className={s.spin} size={24} /><p>Открываем твои записи…</p></>}</div> : <>
        <section id="program" className={s.section}>
          <Heading index={0} title="Программа и порядок обучения" subtitle="Разберись, что предстоит, и выбери, с чего начнёшь." />
          <details className={s.program}>
            <summary><span>Программа курса <small>12 недель · 8 модулей</small></span><ChevronDown size={20} /></summary>
            <div className={s.roadmap}>{defaultCourse.roadmap.map(module => <div className={s.roadmapRow} key={module.id}><span>{module.id}</span><div><b>{module.title}</b><p>{module.result}</p></div><small>{module.week}</small></div>)}</div>
          </details>
          <div className={s.note}><b>Как проходить урок</b><p>Прочитай задание → посмотри урок → выполни практику → проверь и сохрани результат. Если нужны правки, выдели на них отдельное время.</p></div>
          <div className={s.fields}>
            <Field id="reason" label="Зачем мне этот курс" placeholder="Что хочу изменить или попробовать в своей работе и жизни" type="area" />
            <Field id="interests" label="Что хочу научиться создавать" placeholder="Например: сайты, боты, контент или автоматизации" type="area" />
            <Field id="firstStep" label="Мой первый шаг после вступления" placeholder="Например: открыть первое задание модуля «Фундамент профессии»" wide />
            <Field id="questions" label="Что хочу уточнить у организаторов" placeholder="Вопросы о доступе, практике, сроках или обратной связи" hint="Можно оставить пустым. Чтобы получить ответ, отправь вопрос в канал связи своей группы." type="area" wide />
          </div>
          <div className={s.checks}>
            <Tick id="lesson1Watched">Первый вступительный урок просмотрен</Tick>
            <Tick id="programRead">Программа прочитана, порядок модулей понятен</Tick>
            <Tick id="orderUnderstood">Понятно, как выполнять практику и куда задавать вопросы</Tick>
            <Tick id="startReady">Моя причина учиться и первый шаг записаны</Tick>
          </div>
        </section>
        <section id="goals" className={s.section}>
          <Heading index={1} title="Личные цели обучения" subtitle="Выбери результат, срок и способ проверить, что получилось." />
          <div className={s.example}><b>Пример цели</b><p>К концу модуля о сайтах опубликую учебный сайт и проверю его по требованиям итогового задания.</p></div>
          <div className={s.fields}>
            <Field id="courseGoal" label="Моя цель на курс" placeholder="Что будет готово и к какому этапу курса" type="area" wide />
            <Field id="goalEvidence" label="Как проверю результат" placeholder="Что смогу открыть, показать или проверить по требованиям задания" type="area" />
            <Field id="moduleGoal" label="Моя цель на первый основной модуль" placeholder="Что должно быть готово к концу первой недели" type="area" hint="Первый модуль посвящён личной рабочей системе: инструментам, запросам и AI-помощникам." />
            <Field id="reviewDate" label="Когда пересмотрю цели" type="date" hint="Выбери день после первой учебной недели." />
          </div>
          <div className={s.checks}>
            <Tick id="lesson2Watched">Второй вступительный урок просмотрен</Tick>
            <Tick id="goalChecked">У цели есть конкретный результат, срок и способ проверки</Tick>
            <Tick id="moduleGoalChecked">Ближайшая цель на первый основной модуль записана</Tick>
            <Tick id="reviewPlanned">Дата проверки целей выбрана</Tick>
          </div>
        </section>
        <section id="plan" className={s.section}>
          <Heading index={2} title="Учебные задачи и расписание" subtitle="Найди время для учёбы и назначь ближайшее занятие." />
          <div className={s.note}><b>На первую неделю: 12–15 часов</b><p>Сюда входят уроки, практика и проверка работ. Резерв на пропуски и 15 минут на разбор недели запланируй отдельно.</p></div>
          <div className={s.fields}>
            <Field id="weekPlan" label="Мои учебные занятия на первую неделю" placeholder={'Пн, ср, пт 19:00–21:00\nСб 10:00–14:00\nВс 11:00–14:00'} type="area" wide hint="Запиши свои дни и время. В примере получается 13 часов." />
            <Field id="weekHours" label="Всего учебных часов за неделю" type="number" placeholder="13" />
            <Field id="firstSession" label="Первое занятие" type="datetime-local" hint="Укажи местное время." />
            <Field id="firstTask" label="Что сделаю на первом занятии" placeholder="Действие → готовый результат → как его проверю" type="area" wide hint="Например: прочитать первое задание, записать профессиональную цель и проверить её по условиям задания." />
            <Field id="reservePlan" label="Резерв и правило на случай пропуска" placeholder="Когда смогу наверстать и с какого шага продолжу" type="area" />
            <Field id="weeklyReview" label="Когда и как подведу итог недели" placeholder="Например: вс, 18:00–18:15. Что сделал, сколько часов заняло, что меняю на следующей неделе" type="area" />
          </div>
          <div className={s.checks}>
            <Tick id="lesson3Watched">Третий вступительный урок просмотрен</Tick>
            <Tick id="scheduleChecked">Учебные часы, резерв и разбор недели запланированы</Tick>
            <Tick id="taskChecked">У первого занятия есть дата, задача и понятный результат</Tick>
            <Tick id="calendarChecked">Занятия перенесены в мой календарь, напоминания проверены</Tick>
          </div>
        </section>
        <div className={s.finish} data-complete={complete === 12}><CheckCheck size={27} /><div><h2>{complete === 12 ? 'Всё готово к началу курса' : 'Твой план останется здесь'}</h2><p>{complete === 12 ? 'Следующий шаг: открой первый урок модуля «Фундамент профессии».' : 'Возвращайся к тетради, чтобы дополнять ответы и отмечать прогресс.'}</p></div></div>
      </>}
      <footer className={s.footer}>{account?<>Сохранённые ответы привязаны к твоему аккаунту.<br/>После очистки браузера войди снова, чтобы продолжить.</>:<>Ответы сохраняются в этом браузере на устройстве.<br />При очистке данных сайта записи удалятся.</>}<br /><br />AI Factory · AI-инженер</footer>
    </main>
  </div></WorksheetContext.Provider>;
}
