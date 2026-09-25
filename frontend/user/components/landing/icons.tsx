import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  BookOpenTextIcon,
  CalendarCheckIcon,
  CaretDownIcon,
  ChartLineUpIcon,
  ChatCircleDotsIcon,
  ChatTextIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  FileTextIcon,
  HeadsetIcon,
  ListIcon,
  MicrophoneIcon,
  MoonStarsIcon,
  PhoneCallIcon,
  PlayIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SquaresFourIcon,
  StethoscopeIcon,
  TranslateIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";

// Phosphor icon set. Feature/semantic icons default to the duotone weight,
// small UI glyphs (arrows, checks, menus) to bold. Decorative (aria-hidden).
const ICONS = {
  phone: PhoneCallIcon,
  calendar: CalendarCheckIcon,
  message: ChatCircleDotsIcon,
  sms: ChatTextIcon,
  mail: EnvelopeIcon,
  clock: ClockIcon,
  shield: ShieldCheckIcon,
  globe: TranslateIcon,
  transfer: HeadsetIcon,
  file: FileTextIcon,
  check: CheckIcon,
  arrow: ArrowRightIcon,
  menu: ListIcon,
  close: XIcon,
  stethoscope: StethoscopeIcon,
  chevron: CaretDownIcon,
  mic: MicrophoneIcon,
  sparkles: SparkleIcon,
  book: BookOpenTextIcon,
  chart: ChartLineUpIcon,
  grid: SquaresFourIcon,
  users: UsersThreeIcon,
  moon: MoonStarsIcon,
  repeat: ArrowsClockwiseIcon,
  play: PlayIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

const UI: IconName[] = ["check", "arrow", "menu", "close", "chevron"];

export function Icon({ name, className = "h-5 w-5", weight }: { name: IconName; className?: string; weight?: IconWeight }) {
  const Glyph = ICONS[name];
  const w: IconWeight = weight ?? (name === "play" ? "fill" : UI.includes(name) ? "bold" : "duotone");
  return <Glyph className={className} weight={w} aria-hidden="true" />;
}
