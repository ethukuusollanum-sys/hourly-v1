import { Star, Briefcase, Coffee, Video, BookOpen, Code, Pen, MessageSquare, Users, Phone, Headphones, Zap, Target, Clock, Calendar, Dumbbell, Home, Globe, Mail, ShoppingCart, Camera, Music, MapPin, Activity, Sun, Moon, Cloud, Heart, Smile, CheckCircle, XCircle, AlertCircle, HelpCircle, Info, Settings, User, Search, Bell, Bookmark, Flag, Gift, Layers, Tag, TrendingUp, TrendingDown, BarChart3, PieChart, Brain } from 'lucide-react'

const ICON_MAP = {
  briefcase: Briefcase,
  coffee: Coffee,
  video: Video,
  book: BookOpen,
  code: Code,
  pen: Pen,
  message: MessageSquare,
  users: Users,
  phone: Phone,
  headphones: Headphones,
  zap: Zap,
  target: Target,
  clock: Clock,
  calendar: Calendar,
  workout: Dumbbell,
  home: Home,
  globe: Globe,
  mail: Mail,
  cart: ShoppingCart,
  camera: Camera,
  music: Music,
  location: MapPin,
  activity: Activity,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  heart: Heart,
  smile: Smile,
  check: CheckCircle,
  x: XCircle,
  alert: AlertCircle,
  help: HelpCircle,
  info: Info,
  settings: Settings,
  user: User,
  search: Search,
  bell: Bell,
  bookmark: Bookmark,
  flag: Flag,
  gift: Gift,
  layers: Layers,
  tag: Tag,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  chart: BarChart3,
  pie: PieChart,
  brain: Brain,
  star: Star,
}

export default function CatIcon({ icon, size = 14, ...props }) {
  if (!icon) {
    return <Star size={size} {...props} />
  }
  const Icon = ICON_MAP[icon]
  if (Icon) {
    return <Icon size={size} {...props} />
  }
  return <span role="img" aria-label={icon} style={{ fontSize: size + 2 }}>{icon}</span>
}