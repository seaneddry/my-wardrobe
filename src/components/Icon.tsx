const PATHS = {
  hanger: 'M12 7.5V7a2 2 0 1 0-2-2M12 7.5 3.5 14.2c-.7.6-.3 1.8.6 1.8h15.8c.9 0 1.3-1.2.6-1.8L12 7.5Z',
  plus: 'M12 5v14M5 12h14',
  settings:
    'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  filter: 'M4 6h16M7 12h10M10 18h4',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  image: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 2-2 5 5M15.5 9.5h.01',
  edit: 'M5 19h4L19 9l-4-4L5 15v4Z',
  archive: 'M4 5h16v4H4V5Zm1 4v10h14V9M10 13h4',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  check: 'M5 12l5 5 9-10',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
