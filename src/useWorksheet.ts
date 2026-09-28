import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAnswers, saveAnswer, PREFIX } from './storage.mjs';
type Answers = Record<string, string | boolean>;
export function useWorksheet() {
  const [answers, setAnswers] = useState<Answers>({});
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'loading' | 'saved' | 'error'>('loading');
  const [error, setError] = useState('');
  const pending = useRef<Answers>({});
  const persist = useCallback(() => {
    try {
      for (const [key, value] of Object.entries(pending.current)) {
        saveAnswer(window.localStorage, key, value);
        delete pending.current[key];
      }
      setError(''); setStatus('saved');
    } catch {
      setStatus('error');
      setError('Браузер не разрешил сохранить ответы. Разреши хранение данных для этого сайта и повтори попытку. Пока не закрывай страницу.');
    }
  }, []);
  const load = useCallback(() => {
    try {
      setAnswers({ ...loadAnswers(window.localStorage), ...pending.current });
      setError(''); setStatus('saved');
    } catch {
      setStatus('error');
      setError('Не удалось прочитать сохранённые записи. Проверь, разрешено ли хранение данных для этого сайта.');
    } finally { setReady(true); }
  }, []);
  useEffect(() => {
    load();
    const sync = (event: StorageEvent) => { if (event.key?.startsWith(PREFIX) || event.key === null) load(); };
    const leave = (event: BeforeUnloadEvent) => {
      if (!Object.keys(pending.current).length) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('storage', sync);
    window.addEventListener('beforeunload', leave);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('beforeunload', leave); };
  }, [load]);
  const update = (key: string, value: string | boolean) => {
    setAnswers(previous => ({ ...previous, [key]: value }));
    pending.current[key] = value;
    persist();
  };
  return { answers, ready, status, error, update, retry: () => { if (Object.keys(pending.current).length) persist(); else load(); } };
}
