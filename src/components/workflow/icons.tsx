import type React from "react";
import {
  Webhook,
  Clock,
  Play,
  Mail,
  FileText,
  Globe,
  Send,
  MessageSquare,
  Database,
  Code,
  GitBranch,
  GitMerge,
  Repeat,
  GitPullRequest,
  Timer,
  Edit3,
  Cpu,
  Filter,
  Scissors,
  Layers,
  LucideIcon,
} from "lucide-react";
import { SiSlack, SiDiscord } from "react-icons/si";
import type { IconType } from "react-icons";

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  webhook: Webhook,
  clock: Clock,
  play: Play,
  mail: Mail,
  "file-text": FileText,
  globe: Globe,
  send: Send,
  "message-square": MessageSquare,
  database: Database,
  code: Code,
  "git-branch": GitBranch,
  "git-merge": GitMerge,
  repeat: Repeat,
  "git-pull-request": GitPullRequest,
  timer: Timer,
  "edit-3": Edit3,
  cpu: Cpu,
  filter: Filter,
  scissors: Scissors,
  layers: Layers,
};

// Map for react-icons (brand icons)
const brandIconMap: Record<string, IconType> = {
  slack: SiSlack,
  discord: SiDiscord,
};

interface NodeIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function NodeIcon({
  name,
  size = 18,
  className = "",
  style,
}: NodeIconProps) {
  // Check brand icons first
  const BrandIcon = brandIconMap[name];
  if (BrandIcon) {
    return <BrandIcon size={size} className={className} style={style} />;
  }

  // Fall back to Lucide icons
  const Icon = iconMap[name] || Code;
  return <Icon size={size} className={className} style={style} />;
}

export default iconMap;
