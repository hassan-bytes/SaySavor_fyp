export const convertTo24Hour = (timeValue: string | null | undefined): string => {
  if (!timeValue) {
    return '';
  }

  if (!/am|pm/i.test(timeValue)) {
    return timeValue;
  }

  const [rawTime, rawPeriod] = timeValue.trim().split(/\s+/);
  const [hoursText, minutesText] = rawTime.split(':');
  const period = rawPeriod?.toUpperCase();
  let hours = Number.parseInt(hoursText, 10);

  if (period === 'PM' && hours < 12) {
    hours += 12;
  }

  if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${(minutesText ?? '00').padStart(2, '0')}`;
};

export const convertTo12Hour = (timeValue: string): string => {
  if (!timeValue.includes(':')) {
    return timeValue;
  }

  const [hoursText, minutesText] = timeValue.split(':');
  let hours = Number.parseInt(hoursText, 10);
  const period = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;
  if (hours === 0) {
    hours = 12;
  }

  return `${hours.toString().padStart(2, '0')}:${minutesText} ${period}`;
};
