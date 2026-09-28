export const PREFIX = 'ai-factory:intro-workbook:v1:';
const fields = {
  reason:'string', interests:'string', firstStep:'string', questions:'string',
  courseGoal:'string', moduleGoal:'string', goalEvidence:'string', reviewDate:'string',
  weekPlan:'string', weekHours:'string', firstTask:'string', firstSession:'string', reservePlan:'string', weeklyReview:'string',
  lesson1Watched:'boolean', programRead:'boolean', orderUnderstood:'boolean', startReady:'boolean',
  lesson2Watched:'boolean', goalChecked:'boolean', moduleGoalChecked:'boolean', reviewPlanned:'boolean',
  lesson3Watched:'boolean', scheduleChecked:'boolean', taskChecked:'boolean', calendarChecked:'boolean',
};
export function validate(key, value) {
  if (!Object.hasOwn(fields, key) || typeof value !== fields[key] || (typeof value === 'string' && value.length > 4000)) throw new Error('Неверный формат записи.');
}
export function loadAnswers(storage) {
  const answers = {};
  for (const key of Object.keys(fields)) {
    const raw = storage.getItem(PREFIX + key);
    if (raw === null) continue;
    const value = JSON.parse(raw);
    validate(key, value);
    answers[key] = value;
  }
  return answers;
}
export function saveAnswer(storage, key, value) {
  validate(key, value);
  storage.setItem(PREFIX + key, JSON.stringify(value));
}
