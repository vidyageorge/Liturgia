export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const APOSTLE_NAMES = [
  'Peter',
  'Andrew',
  'James (son of Zebedee)',
  'John',
  'Philip',
  'Bartholomew',
  'Thomas',
  'Matthew',
  'James (son of Alphaeus)',
  'Thaddaeus',
  'Simon the Zealot',
  'Judas Iscariot',
];

export const ROLE_LABELS: Record<string, string> = {
  introduction: 'Introduction',
  first_reading: 'First Reading',
  second_reading: 'Second Reading',
  third_reading: 'Third Reading',
  prayer_of_faithful: 'Prayer of the Faithful',
  mc_reader: 'MC Reader',
  gospel_narrator: 'Gospel Narrator',
  morning_adoration: 'Morning Adoration',
  departed_souls_reader: 'Departed Souls Reader',
  way_of_cross: 'Way of the Cross',
  fourth_reading: 'Fourth Reading',
  vote_of_thanks: 'Vote of Thanks',
};
