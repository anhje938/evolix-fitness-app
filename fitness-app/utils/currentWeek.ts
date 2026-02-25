// utils/week.ts
export function startOfWeekMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = søn, 1 = man, ... 6 = lør
    const diff = (day === 0 ? -6 : 1 - day); // flytt tilbake til mandag
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  export function getWeekDays(start: Date): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }
  