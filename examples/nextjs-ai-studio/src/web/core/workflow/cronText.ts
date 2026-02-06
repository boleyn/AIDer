import { cronParser2Fields } from '@fastgpt/global/common/string/time';
import type { TFunction } from 'next-i18next';

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatTime = (hour: number, minute: number) => `${pad2(hour)}:${pad2(minute)}`;

const isAll = (field: readonly number[], size: number) => field.length === size;

const normalizeWeekdays = (weekdays: readonly number[]) =>
  Array.from(
    new Set(
      weekdays.map((day) => {
        if (day === 7) return 0;
        return day % 7;
      })
    )
  ).sort((a, b) => a - b);

export const formatCronToText = (cronString: string, t: TFunction) => {
  const trimmed = cronString.trim();
  if (!trimmed) return '';

  const fields = cronParser2Fields(trimmed);
  if (!fields) return t('workflow:cron_raw', { cron: trimmed });

  const minutes = fields.minute ?? [];
  const hours = fields.hour ?? [];
  const daysOfMonth = fields.dayOfMonth ?? [];
  const isNumberDay = (
    value: (typeof daysOfMonth)[number]
  ): value is Extract<(typeof daysOfMonth)[number], number> => typeof value === 'number';
  const daysOfMonthNumbers = daysOfMonth.filter(isNumberDay);
  const months = fields.month ?? [];
  const weekdays = fields.dayOfWeek ?? [];

  const minuteAll = isAll(minutes, 60);
  const hourAll = isAll(hours, 24);
  const dayAll = isAll(daysOfMonthNumbers, 31);
  const monthAll = isAll(months, 12);
  const weekdayAll = isAll(weekdays, 7);

  const minuteSingle = minutes.length === 1;
  const hourSingle = hours.length === 1;
  const daySingle = daysOfMonthNumbers.length === 1;
  const monthSingle = months.length === 1;

  if (minuteAll && hourAll && dayAll && monthAll && weekdayAll) {
    return t('workflow:cron_every_minute');
  }

  if (minuteSingle && hourAll && dayAll && monthAll && weekdayAll) {
    return t('workflow:cron_every_hour_at', { minute: pad2(minutes[0]) });
  }

  if (minuteSingle && hourSingle && dayAll && monthAll && weekdayAll) {
    return t('workflow:cron_every_day_at', { time: formatTime(hours[0], minutes[0]) });
  }

  if (minuteSingle && hourSingle && dayAll && monthAll && !weekdayAll) {
    const time = formatTime(hours[0], minutes[0]);
    const normalizedWeekdays = normalizeWeekdays(weekdays);
    const weekdayLabels = normalizedWeekdays.map((day) => t(`workflow:cron_weekday_${day}` as any));

    if (weekdayLabels.length === 1) {
      return t('workflow:cron_every_week_at', { weekday: weekdayLabels[0], time });
    }
    if (weekdayLabels.length <= 3) {
      return t('workflow:cron_every_week_at_multi', {
        weekdays: weekdayLabels.join('/'),
        time
      });
    }
    return t('workflow:cron_every_week_at_multi_short', { time });
  }

  if (minuteSingle && hourSingle && !dayAll && monthAll && weekdayAll && daySingle) {
    return t('workflow:cron_every_month_at', {
      day: daysOfMonthNumbers[0],
      time: formatTime(hours[0], minutes[0])
    });
  }

  if (minuteSingle && hourSingle && daySingle && monthSingle && weekdayAll) {
    return t('workflow:cron_every_year_at', {
      month: months[0],
      day: daysOfMonthNumbers[0],
      time: formatTime(hours[0], minutes[0])
    });
  }

  return t('workflow:cron_raw', { cron: trimmed });
};
