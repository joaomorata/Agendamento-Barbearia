import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Instagram,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Quote,
  Scissors,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type Service = {
  id: string;
  name: string;
  detail: string;
  price: string;
  duration: string;
  featured?: boolean;
};

type Barber = {
  id: string;
  name: string;
  role: string;
  image: string;
  initials: string;
};

const services: Service[] = [
  { id: 'corte', name: 'Corte masculino', detail: 'Corte na tesoura ou máquina com acabamento preciso.', price: 'R$ 35', duration: '40 min', featured: true },
  { id: 'barba', name: 'Barba', detail: 'Desenho, toalha quente e finalização confortável.', price: 'R$ 25', duration: '30 min' },
  { id: 'combo', name: 'Corte + barba', detail: 'O combo completo para sair alinhado.', price: 'R$ 55', duration: '1h10', featured: true },
  { id: 'sobrancelha', name: 'Sobrancelha', detail: 'Limpeza e desenho para valorizar o rosto.', price: 'R$ 15', duration: '15 min' },
];

const barbers: Barber[] = [
  { id: 'gerson', name: 'Gersonbarbershop', role: 'Barbeiro principal', image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=720&q=86', initials: 'G' },
  { id: 'bigodinho', name: 'Bigodinho Barber shop', role: 'Barbeiro auxiliar', image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=720&q=86', initials: 'B' },
];

const gallery = [
  { src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=86', alt: 'Interior da Gerson Barber', size: 'large' },
  { src: 'https://images.unsplash.com/photo-1593702295094-aea8c7d7e8b8?auto=format&fit=crop&w=680&q=86', alt: 'Detalhe de acabamento', size: 'small' },
  { src: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=680&q=86', alt: 'Barbeiro trabalhando', size: 'small' },
  { src: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=900&q=86', alt: 'Corte e estilo', size: 'wide' },
];

const testimonials = [
  { quote: 'Saio da cadeira com a sensação de que meu estilo voltou para o lugar.', name: 'Lucas M.', detail: 'Cliente desde 2019' },
  { quote: 'O cuidado nos detalhes é raro. O corte dura bem e o atendimento é impecável.', name: 'André P.', detail: 'Cliente verificado' },
  { quote: 'Ambiente bonito, conversa boa e profissionais que realmente escutam.', name: 'Matheus R.', detail: 'Cliente desde 2021' },
];

const navItems = [
  { label: 'A casa', href: '#a-casa' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Time', href: '#time' },
  { label: 'Visite', href: '#visite' },
];

type BookingState = {
  step: number;
  service: Service | null;
  barber: Barber | null;
  date: string;
  time: string;
  name: string;
  note: string;
  confirmed: boolean;
};

const initialBooking: BookingState = {
  step: 1,
  service: null,
  barber: null,
  date: '',
  time: '',
  name: '',
  note: '',
  confirmed: false,
};

// Shared between the public booking flow and the admin panel, so both agree on
// which times exist and read/write the same agenda data — a slot the admin
// blocks or cancels must disappear from what clients can book, and vice-versa.
type AgendaSlot = {
  id: string;
  date: string;
  time: string;
  barber: string;
  client?: string;
  clientPhone?: string;
  service?: string;
  status: 'livre' | 'reservado' | 'bloqueado' | 'cancelado';
};

const routineSlots = ['09:00', '09:40', '10:20', '11:00', '13:30', '14:10', '14:50', '15:30', '16:10', '17:00', '17:40', '18:20'];
const AGENDA_STORAGE_KEY = 'gerson-agenda';

function loadAgendaSlots(): AgendaSlot[] {
  try {
    const saved = window.localStorage.getItem(AGENDA_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AgendaSlot[];
  } catch {
    // Corrupted or missing data — treat as an empty agenda (everything open).
  }
  return [];
}

function formatDate(date: string) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}

function getBookingDates() {
  const dates: { value: string; weekday: string; day: string; month: string }[] = [];
  for (let index = 1; index < 7; index += 1) {
    const date = new Date();
    date.setDate(date.getDate() + index);
    dates.push({
      value: date.toISOString().split('T')[0],
      weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
      month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''),
    });
  }
  return dates;
}

function SectionHeading({ eyebrow, title, body, action }: { eyebrow: string; title: ReactNode; body?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h2 className="font-display text-4xl leading-[.98] tracking-[-.03em] text-[#f0ece4] md:text-6xl">{title}</h2>
        {body && <p className="mt-5 max-w-xl text-sm leading-7 text-[#9b9a96] md:text-base">{body}</p>}
      </div>
      {action}
    </div>
  );
}

function BookingButton({ children = 'Agendar horário', onClick, compact = false }: { children?: ReactNode; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="button-open-booking"
      className={`gold-button inline-flex items-center justify-center gap-2 rounded-full font-mono-ui text-[10px] font-medium uppercase tracking-[.13em] ${compact ? 'px-4 py-3 md:py-2.5' : 'px-6 py-3.5'}`}
    >
      {children}
      <ArrowUpRight size={15} strokeWidth={1.8} />
    </button>
  );
}

function Header({ onBook }: { onBook: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = () => setMenuOpen(false);
  return (
    <header className="site-nav fixed inset-x-0 top-0 z-20">
      <div className="section-wrap flex h-[76px] items-center justify-between">
        <a href="#top" onClick={go} data-testid="link-logo" className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border gold-border text-gold transition-transform group-hover:rotate-12">
            <Scissors size={17} strokeWidth={1.5} />
          </span>
          <span className="leading-none">
            <span className="block text-[13px] font-extrabold uppercase tracking-[.19em] text-[#f2eee5]">Gerson</span>
            <span className="mt-1 block font-mono-ui text-[8px] uppercase tracking-[.3em] text-[#aaa59b]">Barber studio</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {navItems.map((item) => (
            <a href={item.href} key={item.href} data-testid={`link-nav-${item.label.toLowerCase().replace(' ', '-')}`} className="nav-link font-mono-ui text-[10px] uppercase tracking-[.16em]">
              {item.label}
            </a>
          ))}
          <BookingButton onClick={onBook} compact />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <BookingButton onClick={onBook} compact />
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu" aria-expanded={menuOpen} data-testid="button-toggle-menu" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[#e9e3d7]">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="border-t border-white/10 bg-[#151619] px-5 py-5 md:hidden" aria-label="Menu mobile">
          <div className="section-wrap flex flex-col gap-5">
            {navItems.map((item) => (
              <a href={item.href} onClick={go} key={item.href} data-testid={`link-mobile-${item.label.toLowerCase().replace(' ', '-')}`} className="nav-link py-1.5 font-mono-ui text-[11px] uppercase tracking-[.18em]">
                {item.label}
              </a>
            ))}
            <button type="button" onClick={() => { go(); onBook(); }} data-testid="button-mobile-book" className="gold-button mt-2 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 font-mono-ui text-[11px] font-medium uppercase tracking-[.14em]">Agendar horário <ArrowUpRight size={15} /></button>
          </div>
        </nav>
      )}
    </header>
  );
}

function BookingFlow({ booking, setBooking, onClose }: { booking: BookingState; setBooking: (value: BookingState) => void; onClose: () => void }) {
  const dates = useMemo(getBookingDates, []);
  // Read the barber's real agenda (blocks, cancellations, existing bookings) so this flow
  // can't offer a time the admin panel has already closed.
  const agendaSlots = useMemo(loadAgendaSlots, []);
  const update = (changes: Partial<BookingState>) => setBooking({ ...booking, ...changes });
  const canContinue = (booking.step === 1 && !!booking.service) || (booking.step === 2 && !!booking.barber && !!booking.date) || (booking.step === 3 && !!booking.time) || (booking.step === 4 && booking.name.trim().length > 2);

  const takenTimesFor = (barberId: string, date: string) =>
    new Set(agendaSlots.filter((slot) => slot.barber === barberId && slot.date === date && slot.status !== 'livre').map((slot) => slot.time));

  const isDayFull = (barberId: string, date: string) => {
    const taken = takenTimesFor(barberId, date);
    return routineSlots.every((time) => taken.has(time));
  };

  const availableTimes = booking.barber ? routineSlots.filter((time) => !takenTimesFor(booking.barber!.id, booking.date).has(time)) : [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canContinue) update({ confirmed: true, step: 5 });
  };

  return (
    <div className="booking-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-5" role="dialog" aria-modal="true" aria-label="Agendar horário">
      <div className="booking-panel max-h-[94dvh] w-full overflow-y-auto rounded-t-[26px] border border-white/10 bg-[#151619] md:max-w-[660px] md:rounded-[26px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#151619]/95 px-5 py-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-gold" />
            <span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-[#ded8cb]">{booking.confirmed ? 'Horário reservado' : 'Novo agendamento'}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar agendamento" data-testid="button-close-booking" className="rounded-full p-2 text-[#9b9a96] transition-colors hover:bg-white/10 hover:text-white">
            <X size={19} />
          </button>
        </div>
        {!booking.confirmed ? (
          <div className="px-5 pb-7 pt-6 md:px-7 md:pb-8">
            <div className="mb-8 flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className={`h-1 flex-1 rounded-full ${step <= booking.step ? 'bg-gold' : 'bg-white/10'}`} />
              ))}
              <span className="ml-2 font-mono-ui text-[10px] text-[#8e8d89]">{booking.step}/4</span>
            </div>
            {booking.step === 1 && (
              <div className="reveal">
                <p className="eyebrow mb-3">01 / escolha seu serviço</p>
                <h3 className="font-display text-3xl text-[#f2eee5]">Como podemos cuidar de você?</h3>
                <div className="mt-6 grid gap-3">
                  {services.map((service) => (
                    <button type="button" key={service.id} onClick={() => update({ service })} data-testid={`choice-service-${service.id}`} className={`choice-card flex items-center justify-between rounded-2xl p-4 text-left ${booking.service?.id === service.id ? 'selected' : ''}`}>
                      <span>
                        <span className="flex items-center gap-2 text-[14px] font-semibold text-[#f2eee5]">{service.name}{service.featured && <span className="rounded-full bg-[#d9b56c]/15 px-2 py-1 font-mono-ui text-[8px] uppercase tracking-wider text-gold">mais pedido</span>}</span>
                        <span className="mt-1 block text-xs text-[#92918e]">{service.detail}</span>
                        <span className="mt-2 block font-mono-ui text-[10px] uppercase tracking-wider text-[#b3b0a8]">{service.duration}</span>
                      </span>
                      <span className="ml-3 shrink-0 text-right text-sm font-semibold text-gold">{service.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {booking.step === 2 && (
              <div className="reveal">
                <p className="eyebrow mb-3">02 / escolha seu barbeiro</p>
                <h3 className="font-display text-3xl text-[#f2eee5]">Com quem você quer sentar?</h3>
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  {barbers.map((barber) => (
                    <button type="button" key={barber.id} onClick={() => update({ barber, time: '' })} data-testid={`choice-barber-${barber.id}`} className={`choice-card overflow-hidden rounded-2xl text-left ${booking.barber?.id === barber.id ? 'selected' : ''}`}>
                      <div className="relative aspect-[.85] overflow-hidden bg-[#25262a]">
                        <img src={barber.image} alt={barber.name} className="team-image h-full w-full object-cover" />
                        {booking.barber?.id === barber.id && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[#171719]"><Check size={13} /></span>}
                      </div>
                      <span className="block p-3"><span className="block text-xs font-semibold text-[#f2eee5]">{barber.name}</span><span className="mt-1 block text-[9px] leading-4 text-[#95938e]">{barber.role}</span></span>
                    </button>
                  ))}
                </div>
                <p className="eyebrow mb-3 mt-7">escolha o melhor dia</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {dates.map((date) => {
                    const full = booking.barber ? isDayFull(booking.barber.id, date.value) : false;
                    return (
                      <button type="button" key={date.value} onClick={() => !full && update({ date: date.value, time: '' })} disabled={full} data-testid={`choice-date-${date.value}`} className={`choice-card rounded-xl px-2 py-3 text-center ${booking.date === date.value ? 'selected' : ''} ${full ? 'cursor-not-allowed opacity-30' : ''}`}>
                        <span className="block font-mono-ui text-[9px] uppercase text-[#99958d]">{date.weekday}</span>
                        <span className="mt-1 block text-lg font-semibold text-[#f2eee5]">{date.day}</span>
                        <span className="block font-mono-ui text-[8px] uppercase text-[#99958d]">{full ? 'Fechado' : date.month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {booking.step === 3 && (
              <div className="reveal">
                <p className="eyebrow mb-3">03 / escolha seu horário</p>
                <h3 className="font-display text-3xl text-[#f2eee5]">Um bom corte começa sem pressa.</h3>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#aba79f]">
                  <CalendarDays size={14} className="text-gold" /> {formatDate(booking.date)} <span className="text-white/20">•</span> {booking.barber?.name}
                </div>
                <div className="mt-7 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                  {availableTimes.map((time) => (
                    <button type="button" key={time} onClick={() => update({ time })} data-testid={`choice-time-${time.replace(':', '-')}`} className={`time-button rounded-xl px-2 py-3 font-mono-ui text-xs ${booking.time === time ? 'selected' : ''}`}>{time}</button>
                  ))}
                </div>
                {availableTimes.length === 0 && (
                  <div className="mt-7 rounded-2xl border border-[#bd7464]/30 bg-[#bd7464]/[.08] p-4 text-xs leading-6 text-[#e19b8a]">
                    Não há horários livres neste dia com {booking.barber?.name}. Volte e escolha outro dia.
                  </div>
                )}
                <div className="mt-7 rounded-2xl border border-white/8 bg-white/[.03] p-4 text-xs leading-6 text-[#99958d]">
                  <Clock3 size={15} className="mb-2 text-gold" /> Atendimento de terça a sábado, das 09h às 19h.
                </div>
              </div>
            )}
            {booking.step === 4 && (
              <form className="reveal" onSubmit={submit}>
                <p className="eyebrow mb-3">04 / seus dados</p>
                <h3 className="font-display text-3xl text-[#f2eee5]">Só falta um jeito de falar com você.</h3>
                <div className="mt-6 grid gap-4">
                  <label className="grid gap-2 text-[10px] font-mono-ui uppercase tracking-wider text-[#a9a49c]">Seu nome
                    <input value={booking.name} onChange={(event) => update({ name: event.target.value })} data-testid="input-booking-name" required placeholder="Como podemos te chamar?" className="rounded-xl border border-white/10 bg-[#1d1e22] px-4 py-3.5 text-sm text-[#f2eee5] outline-none transition-colors placeholder:text-[#66656a] focus:border-[#d9b56c]" />
                  </label>
                  <label className="grid gap-2 text-[10px] font-mono-ui uppercase tracking-wider text-[#a9a49c]">Algum recado? <span className="normal-case tracking-normal text-[#66656a]">(opcional)</span>
                    <textarea value={booking.note} onChange={(event) => update({ note: event.target.value })} data-testid="input-booking-note" rows={2} placeholder="Ex.: vou chegar alguns minutos antes" className="resize-none rounded-xl border border-white/10 bg-[#1d1e22] px-4 py-3.5 text-sm text-[#f2eee5] outline-none transition-colors placeholder:text-[#66656a] focus:border-[#d9b56c]" />
                  </label>
                </div>
                <p className="mt-5 text-[11px] leading-5 text-[#77767a]">Ao confirmar, abrimos uma conversa no WhatsApp para finalizar seu horário.</p>
              </form>
            )}
            <div className="booking-nav-safe-area mt-8 flex items-center justify-between border-t border-white/10 pt-5">
              <button type="button" onClick={() => booking.step > 1 && update({ step: booking.step - 1 })} disabled={booking.step === 1} data-testid="button-booking-back" className={`inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.14em] ${booking.step === 1 ? 'invisible' : 'text-[#b0ada5] hover:text-white'}`}><ChevronLeft size={15} /> Voltar</button>
              {booking.step < 4 ? (
                <button type="button" onClick={() => canContinue && update({ step: booking.step + 1 })} disabled={!canContinue} data-testid="button-booking-next" className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[.14em] transition-all ${canContinue ? 'gold-button' : 'cursor-not-allowed bg-white/10 text-[#66656a]'}`}>Continuar <ChevronRight size={15} /></button>
              ) : (
                <button type="submit" onClick={submit} disabled={!canContinue} data-testid="button-confirm-booking" className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[.14em] transition-all ${canContinue ? 'gold-button' : 'cursor-not-allowed bg-white/10 text-[#66656a]'}`}>Confirmar horário <ArrowRight size={15} /></button>
              )}
            </div>
          </div>
        ) : (
          <div className="reveal px-5 pb-9 pt-12 text-center md:px-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[#171719]"><Check size={29} strokeWidth={2.2} /></div>
            <p className="eyebrow mb-3 mt-7">Tudo certo, {booking.name.split(' ')[0]}</p>
            <h3 className="font-display text-4xl leading-none text-[#f2eee5]">Seu horário está quase na cadeira.</h3>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#9b9a96]">Enviamos os detalhes para o WhatsApp. Nossa equipe confirma tudo por lá em poucos minutos.</p>
            <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-white/10 bg-white/[.03] p-5 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-sm text-[#d7d2c8]">{booking.service?.name}</span><span className="font-semibold text-gold">{booking.service?.price}</span></div>
              <div className="grid gap-3 pt-4 text-xs text-[#99958d]"><span className="flex items-center gap-2"><UserRound size={14} className="text-gold" /> {booking.barber?.name}</span><span className="flex items-center gap-2"><CalendarDays size={14} className="text-gold" /> {formatDate(booking.date)}</span><span className="flex items-center gap-2"><Clock3 size={14} className="text-gold" /> {booking.time}</span></div>
            </div>
            <a href={`https://wa.me/5579998901228?text=${encodeURIComponent(`Olá, Gerson Barber. Sou ${booking.name} e quero confirmar meu horário de ${booking.service?.name} para ${formatDate(booking.date)} às ${booking.time}.${booking.note.trim() ? ` Recado: ${booking.note.trim()}` : ''}`)}`} target="_blank" rel="noreferrer" data-testid="link-confirm-whatsapp" className="gold-button mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-mono-ui text-[10px] uppercase tracking-[.13em]">Abrir WhatsApp <MessageCircle size={15} /></a>
            <button type="button" onClick={onClose} data-testid="button-finish-booking" className="mx-auto mt-5 block font-mono-ui text-[10px] uppercase tracking-[.13em] text-[#85838a] hover:text-white">Voltar para a página</button>
          </div>
        )}
      </div>
    </div>
  );
}

function getAdminDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toISOString().split('T')[0],
      day: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      number: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
      label: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date),
    };
  });
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';
const ADMIN_SESSION_KEY = 'gerson-admin-session';

function AdminGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => window.sessionStorage.getItem(ADMIN_SESSION_KEY) === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ADMIN_PASSWORD) {
      setError('Senha do painel não configurada. Defina VITE_ADMIN_PASSWORD no arquivo .env.');
      return;
    }
    if (password === ADMIN_PASSWORD) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="admin-shell grain flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#18191d] p-7 md:p-9">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border gold-border text-gold"><LockKeyhole size={17} /></span>
          <span className="leading-none">
            <span className="block text-[13px] font-extrabold uppercase tracking-[.19em] text-[#f2eee5]">Gerson</span>
            <span className="mt-1 block font-mono-ui text-[8px] uppercase tracking-[.28em] text-[#8f8b82]">Painel do barbeiro</span>
          </span>
        </div>
        <p className="mt-6 font-mono-ui text-[10px] uppercase tracking-wider text-[#8f8d88]">Senha de acesso</p>
        <input
          type="password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); setError(''); }}
          autoFocus
          placeholder="Digite a senha"
          data-testid="input-admin-password"
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#1d1e22] px-4 py-3.5 text-sm text-[#f2eee5] outline-none transition-colors placeholder:text-[#66656a] focus:border-[#d9b56c]"
        />
        {error && <p className="mt-3 text-xs text-[#d58c7b]">{error}</p>}
        <button type="submit" data-testid="button-admin-login" className="gold-button mt-6 w-full rounded-full px-5 py-3.5 font-mono-ui text-[10px] uppercase tracking-[.13em]">Entrar</button>
        <a href="/" className="mt-5 block text-center font-mono-ui text-[10px] uppercase tracking-[.13em] text-[#77767a] hover:text-white">Voltar para a página</a>
      </form>
    </div>
  );
}

function Admin() {
  const dates = useMemo(getAdminDates, []);
  const [selectedDate, setSelectedDate] = useState(dates[0].value);
  const [selectedBarber, setSelectedBarber] = useState('todos');
  const [slots, setSlots] = useState<AgendaSlot[]>(() => {
    const raw = window.localStorage.getItem(AGENDA_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AgendaSlot[];
    return [
      { id: 'one', date: dates[0].value, time: '09:40', barber: 'gerson', client: 'Rafael Almeida', clientPhone: '5579988001122', service: 'Corte masculino', status: 'reservado' },
      { id: 'two', date: dates[0].value, time: '14:10', barber: 'bigodinho', client: 'Marcos Vinícius', clientPhone: '5579988003344', service: 'Corte + barba', status: 'reservado' },
      { id: 'three', date: dates[1].value, time: '10:20', barber: 'gerson', client: 'Eduardo Lima', clientPhone: '5579988005566', service: 'Barba', status: 'reservado' },
    ];
  });
  const [toast, setToast] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'cancel-slot'; slot: AgendaSlot } | { type: 'close-day' } | null>(null);

  const daySlots = routineSlots.map((time) => {
    const existing = slots.find((slot) => slot.date === selectedDate && slot.time === time && (selectedBarber === 'todos' || slot.barber === selectedBarber));
    return existing ?? { id: `${selectedDate}-${time}-${selectedBarber === 'todos' ? 'gerson' : selectedBarber}`, date: selectedDate, time, barber: selectedBarber === 'todos' ? 'gerson' : selectedBarber, status: 'livre' as const };
  });
  const visibleSlots = daySlots.filter((slot) => selectedBarber === 'todos' || slot.barber === selectedBarber);
  const reservedCount = visibleSlots.filter((slot) => slot.status === 'reservado').length;
  const unavailableCount = visibleSlots.filter((slot) => slot.status === 'bloqueado' || slot.status === 'cancelado').length;

  const persist = (next: AgendaSlot[]) => {
    setSlots(next);
    window.localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(next));
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  // Clicking a slot: reserved slots need confirmation (real client involved), the rest toggle instantly.
  const handleSlotClick = (slot: AgendaSlot) => {
    if (slot.status === 'reservado') {
      setConfirmAction({ type: 'cancel-slot', slot });
      return;
    }
    const nextStatus = slot.status === 'bloqueado' || slot.status === 'cancelado' ? 'livre' : 'bloqueado';
    const next: AgendaSlot[] = slots.some((item) => item.id === slot.id)
      ? slots.map((item) => item.id === slot.id ? { ...item, status: nextStatus } : item)
      : [...slots, { ...slot, status: nextStatus }];
    persist(next);
    showToast(nextStatus === 'bloqueado' ? 'Horário bloqueado para novos agendamentos.' : 'Horário liberado novamente.');
  };

  const confirmCancelSlot = (slot: AgendaSlot) => {
    const next: AgendaSlot[] = slots.some((item) => item.id === slot.id)
      ? slots.map((item) => item.id === slot.id ? { ...item, status: 'cancelado' as const } : item)
      : [...slots, { ...slot, status: 'cancelado' as const }];
    persist(next);
    setConfirmAction(null);
    showToast(`Agendamento de ${slot.client} cancelado. Avise pelo WhatsApp para remarcar.`);
  };

  const closeWholeDay = () => {
    const targetBarbers = selectedBarber === 'todos' ? barbers.map((barber) => barber.id) : [selectedBarber];
    let next = [...slots];
    targetBarbers.forEach((barberId) => {
      routineSlots.forEach((time) => {
        const existingIndex = next.findIndex((slot) => slot.date === selectedDate && slot.time === time && slot.barber === barberId);
        if (existingIndex === -1) {
          next.push({ id: `${selectedDate}-${time}-${barberId}`, date: selectedDate, time, barber: barberId, status: 'bloqueado' });
        } else if (next[existingIndex].status === 'reservado') {
          next[existingIndex] = { ...next[existingIndex], status: 'cancelado' };
        } else if (next[existingIndex].status === 'livre') {
          next[existingIndex] = { ...next[existingIndex], status: 'bloqueado' };
        }
      });
    });
    persist(next);
    setConfirmAction(null);
    const cancelledClients = slots.filter((slot) => targetBarbers.includes(slot.barber) && slot.date === selectedDate && slot.status === 'reservado');
    showToast(cancelledClients.length > 0 ? `Dia fechado. ${cancelledClients.length} cliente(s) precisam ser avisados.` : 'Dia fechado para novos agendamentos.');
  };

  const unlockAll = () => {
    persist(slots.filter((slot) => !(slot.date === selectedDate && (selectedBarber === 'todos' || slot.barber === selectedBarber) && slot.status === 'bloqueado')));
    showToast('Horários bloqueados deste dia foram liberados.');
  };

  const cancelledSlotsToday = visibleSlots.filter((slot): slot is AgendaSlot & { client: string } => slot.status === 'cancelado' && !!slot.client);
  const whatsappNotifyLink = (slot: AgendaSlot) => `https://wa.me/${slot.clientPhone ?? ''}?text=${encodeURIComponent(`Olá, ${slot.client}. Aqui é da Gerson Barber. Infelizmente precisamos cancelar seu horário de ${slot.service} do dia ${dates.find((date) => date.value === slot.date)?.label} às ${slot.time}. Podemos remarcar para outro dia?`)}`;

  return (
    <div className="admin-shell grain min-h-screen">
      <header className="admin-header border-b border-white/10">
        <div className="section-wrap flex min-h-[82px] items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border gold-border text-gold"><Scissors size={18} /></span>
            <span><span className="block text-[13px] font-extrabold uppercase tracking-[.19em] text-[#f2eee5]">Gerson</span><span className="mt-1 block font-mono-ui text-[8px] uppercase tracking-[.28em] text-[#8f8b82]">Painel do barbeiro</span></span>
          </a>
          <a href="/" className="font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#a09c94] hover:text-gold">Ver página pública <ArrowUpRight size={14} className="ml-1 inline" /></a>
        </div>
      </header>
      <main className="section-wrap py-10 md:py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="eyebrow">Rotina da barbearia</p><h1 className="mt-4 font-display text-5xl leading-[.9] text-[#f0ece4] md:text-7xl">Controle seu<br /><em className="text-gold">dia de trabalho.</em></h1><p className="mt-5 max-w-lg text-sm leading-6 text-[#9b9a96]">Libere ou bloqueie horários e acompanhe os clientes que já marcaram. O que você ajustar aqui aparece na disponibilidade do agendamento.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[.13em] text-gold"><CheckCircle2 size={15} /> Agenda sincronizada</div>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <div className="admin-stat"><span className="font-display text-4xl text-gold">{reservedCount}</span><span className="mt-2 block font-mono-ui text-[9px] uppercase tracking-wider text-[#8f8d88]">agendados no dia</span></div>
          <div className="admin-stat"><span className="font-display text-4xl text-[#e6e0d5]">{visibleSlots.length - reservedCount - unavailableCount}</span><span className="mt-2 block font-mono-ui text-[9px] uppercase tracking-wider text-[#8f8d88]">horários livres</span></div>
          <div className="admin-stat"><span className="font-display text-4xl text-[#d07f68]">{unavailableCount}</span><span className="mt-2 block font-mono-ui text-[9px] uppercase tracking-wider text-[#8f8d88]">indisponíveis</span></div>
        </div>
        {cancelledSlotsToday.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[#bd7464]/30 bg-[#bd7464]/[.08] p-5 md:p-6">
            <p className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-[#e19b8a]"><X size={13} /> Clientes que precisam ser avisados</p>
            <div className="mt-4 grid gap-2">
              {cancelledSlotsToday.map((slot) => (
                <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#18191d] px-4 py-3">
                  <span className="text-sm text-[#e4ddcf]">{slot.client} <span className="text-[#85848a]">· {slot.time} · {slot.service}</span></span>
                  <a href={whatsappNotifyLink(slot)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-gold hover:underline"><MessageCircle size={14} /> Avisar no WhatsApp</a>
                </div>
              ))}
            </div>
          </div>
        )}
        <section className="mt-12 rounded-3xl border border-white/10 bg-[#18191d] p-5 md:p-8">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
            <div><p className="eyebrow">Escolha o dia</p><h2 className="mt-2 font-display text-3xl text-[#eee9df]">{dates.find((date) => date.value === selectedDate)?.label}</h2></div>
            <div className="flex flex-wrap gap-2">
              <select value={selectedBarber} onChange={(event) => setSelectedBarber(event.target.value)} className="admin-select"><option value="todos">Todos os profissionais</option><option value="gerson">Gersonbarbershop</option><option value="bigodinho">Bigodinho Barber shop</option></select>
              <button type="button" onClick={unlockAll} className="outline-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[.12em]"><LockKeyhole size={14} /> Liberar bloqueios</button>
              <button type="button" onClick={() => setConfirmAction({ type: 'close-day' })} className="outline-button inline-flex items-center gap-2 rounded-full border-[#bd7464]/40 px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[.12em] text-[#d58c7b] hover:border-[#bd7464]"><X size={14} /> Fechar o dia</button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {dates.map((date, index) => <button type="button" key={date.value} onClick={() => setSelectedDate(date.value)} className={`admin-date ${selectedDate === date.value ? 'selected' : ''}`}><span>{index === 0 ? 'Hoje' : date.day}</span><strong>{date.number}</strong></button>)}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 pb-5 font-mono-ui text-[9px] uppercase tracking-wider text-[#8f8d88]"><span><i className="status-dot bg-[#c9aa68]" /> Agendado</span><span><i className="status-dot bg-[#7e987f]" /> Livre</span><span><i className="status-dot bg-[#bd7464]" /> Bloqueado</span><span><i className="status-dot bg-[#a05f52]" /> Cancelado</span><span className="ml-auto text-[#6e6d72]">Clique em um horário agendado para cancelar</span></div>
          <div className="mt-6 grid gap-3">
            {visibleSlots.map((slot) => {
              const barber = barbers.find((item) => item.id === slot.barber);
              const label = slot.status === 'reservado' ? slot.client : slot.status === 'bloqueado' ? 'Horário bloqueado' : slot.status === 'cancelado' ? `Cancelado · ${slot.client}` : 'Disponível para agendamento';
              const badge = slot.status === 'reservado' ? 'Agendado' : slot.status === 'bloqueado' ? 'Bloqueado' : slot.status === 'cancelado' ? 'Cancelado' : 'Livre';
              const badgeClass = slot.status === 'reservado' ? 'bg-gold/15 text-gold' : slot.status === 'bloqueado' ? 'bg-[#bd7464]/15 text-[#d58c7b]' : slot.status === 'cancelado' ? 'bg-[#a05f52]/15 text-[#c9897a]' : 'bg-[#7e987f]/15 text-[#a5c6a7]';
              return <button type="button" key={slot.id} onClick={() => handleSlotClick(slot)} className={`agenda-row ${slot.status}`}><span className="flex items-center gap-4"><span className="font-mono-ui text-sm text-[#e4ddcf]">{slot.time}</span><span className="h-8 w-px bg-white/10" /><span className="text-left"><strong className="block text-sm font-medium text-[#eee9df]">{label}</strong><span className="mt-1 block text-[11px] text-[#86858a]">{slot.status === 'reservado' ? `${slot.service} · ${barber?.name}` : barber?.name}</span></span></span><span className={`rounded-full px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-wider ${badgeClass}`}>{badge}</span></button>;
            })}
          </div>
          <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-[#77767a]"><span><Clock3 size={14} className="mr-2 inline text-gold" /> Rotina padrão: 09h às 19h, intervalo 12h às 13h30</span><span className="hidden sm:inline">12 horários disponíveis</span></div>
        </section>
        <section className="mt-6 grid gap-6 md:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[#18191d] p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="eyebrow">Próximos dias</p><h2 className="mt-2 font-display text-3xl text-[#eee9df]">Sua semana em vista</h2></div><CalendarDays className="text-gold" size={22} /></div><div className="mt-7 grid gap-3">{dates.slice(1, 4).map((date) => <button type="button" key={date.value} onClick={() => setSelectedDate(date.value)} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.02] p-4 text-left transition-colors hover:border-gold/50"><span><span className="block font-mono-ui text-[9px] uppercase tracking-wider text-[#8f8d88]">{date.day} · {date.number}</span><strong className="mt-1 block text-sm text-[#e9e3d7]">{slots.filter((slot) => slot.date === date.value && slot.status === 'reservado').length} agendamentos confirmados</strong></span><ChevronRight size={16} className="text-[#77767a]" /></button>)}</div></div>
          <div className="rounded-3xl border border-gold/20 bg-gold/[.06] p-6 md:p-8"><p className="eyebrow">Lembrete</p><h2 className="mt-4 font-display text-3xl leading-tight text-[#eee9df]">A rotina fica mais leve quando a agenda está em dia.</h2><p className="mt-4 text-sm leading-6 text-[#a9a49c]">Use o painel no começo da manhã para conferir os horários, bloquear pausas e se preparar para cada atendimento.</p><div className="mt-7 rounded-2xl border border-gold/15 bg-[#18191d]/60 p-4"><div className="flex items-center gap-3 text-sm text-[#ded8cb]"><Plus size={16} className="text-gold" /> Bloquear um intervalo</div><p className="mt-2 pl-7 text-xs leading-5 text-[#85848a]">Clique em qualquer horário livre da rotina.</p></div></div>
        </section>
      </main>
      {confirmAction && (
        <div className="booking-backdrop fixed inset-0 z-50 flex items-center justify-center p-5" role="dialog" aria-modal="true">
          <div className="booking-panel w-full max-w-md rounded-[26px] border border-white/10 bg-[#151619] p-6 md:p-8">
            {confirmAction.type === 'cancel-slot' ? (
              <>
                <p className="eyebrow mb-3 text-[#e19b8a]">Cancelar agendamento</p>
                <h3 className="font-display text-2xl leading-tight text-[#f2eee5]">Cancelar o horário de {confirmAction.slot.client}?</h3>
                <p className="mt-4 text-sm leading-6 text-[#9b9a96]">{confirmAction.slot.service} · {confirmAction.slot.time}. O cliente não é avisado automaticamente — depois de cancelar, use o botão de WhatsApp para explicar e remarcar.</p>
              </>
            ) : (
              <>
                <p className="eyebrow mb-3 text-[#e19b8a]">Fechar o dia</p>
                <h3 className="font-display text-2xl leading-tight text-[#f2eee5]">Fechar {dates.find((date) => date.value === selectedDate)?.label} para {selectedBarber === 'todos' ? 'todos os profissionais' : barbers.find((barber) => barber.id === selectedBarber)?.name}?</h3>
                <p className="mt-4 text-sm leading-6 text-[#9b9a96]">Todos os horários livres serão bloqueados e os agendamentos já marcados nesse dia entrarão como cancelados, para você avisar os clientes um a um.</p>
              </>
            )}
            <div className="mt-7 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} className="font-mono-ui text-[10px] uppercase tracking-[.13em] text-[#b0ada5] hover:text-white">Voltar</button>
              <button
                type="button"
                onClick={() => confirmAction.type === 'cancel-slot' ? confirmCancelSlot(confirmAction.slot) : closeWholeDay()}
                className="inline-flex items-center gap-2 rounded-full bg-[#bd7464] px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[.13em] text-[#1a1210] transition-opacity hover:opacity-90"
              >
                {confirmAction.type === 'cancel-slot' ? 'Cancelar agendamento' : 'Fechar o dia'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="admin-toast"><Check size={15} /> {toast}</div>}
    </div>
  );
}

function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [booking, setBooking] = useState<BookingState>(initialBooking);
  const [testimonial, setTestimonial] = useState(0);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const openBooking = () => {
    setBooking({ ...initialBooking });
    setBookingOpen(true);
  };

  // Once the hero's own CTA has scrolled out of view, a slim sticky bar keeps
  // booking one tap away — the pattern phone users expect from native apps,
  // since most visitors here won't be on a desktop with the header always handy.
  useEffect(() => {
    const onScroll = () => setShowMobileBar(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div id="top" className="site-shell grain">
      <Header onBook={openBooking} />
      <main>
        <section className="hero-photo relative flex min-h-[560px] items-end pb-14 pt-28 md:min-h-[800px] md:items-center md:pb-0 md:pt-32">
          <div className="section-wrap relative w-full">
            <div className="max-w-[680px]">
              <div className="reveal flex items-center gap-3"><span className="hero-line h-9" /><span className="eyebrow">Barbearia autoral · Aracaju</span></div>
              <h1 className="reveal reveal-delay-1 mt-7 max-w-2xl font-display text-6xl leading-[.9] tracking-[-.045em] text-[#f4efe5] sm:text-7xl md:text-[7.6rem] md:leading-[.87] md:tracking-[-.055em]">Seu estilo,<br /><em className="text-gold">bem cuidado.</em></h1>
              <p className="reveal reveal-delay-2 mt-7 max-w-md text-sm leading-7 text-[#c4c0b8] md:text-base">Uma barbearia contemporânea para quem entende que presença começa nos detalhes.</p>
              <div className="reveal reveal-delay-3 mt-9 flex flex-wrap items-center gap-4">
                <BookingButton onClick={openBooking}>Escolher meu horário</BookingButton>
                <a href="#a-casa" data-testid="link-discover" className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#d9d4ca] transition-colors hover:text-gold">Conheça a casa <ArrowDown size={14} /></a>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 hidden items-center gap-3 md:flex"><span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-[#85838a]">Role para explorar</span><ArrowDown size={15} className="text-gold" /></div>
          </div>
        </section>

        <section id="a-casa" className="relative overflow-hidden py-16 md:py-36">
          <div className="section-wrap">
            <div className="grid gap-12 md:grid-cols-[.9fr_1.1fr] md:gap-24">
              <div><p className="eyebrow">A casa</p><p className="mt-7 font-display text-3xl leading-tight text-[#dbd5ca] md:text-5xl">Não é só sobre o corte.<br /><em className="text-gold">É sobre como você sai.</em></p></div>
              <div className="md:pt-10"><p className="max-w-xl text-base leading-8 text-[#9b9a96]">A Gerson nasceu para transformar o intervalo entre uma coisa e outra em um momento seu. Um espaço de linhas limpas, conversa boa e técnica sem atalhos.</p><p className="mt-6 max-w-xl text-base leading-8 text-[#9b9a96]">A gente estuda seu rosto, seu cabelo e sua rotina antes de encostar a máquina. O resultado tem nome: você, só que mais alinhado.</p><div className="mt-9 flex items-center gap-4"><span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-gold">Desde 2016</span><span className="h-px w-12 bg-white/20" /><span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-[#79787d]">Aracaju</span></div></div>
            </div>
            <div className="mt-20 grid gap-3 sm:grid-cols-3 md:mt-28">
              <div className="rounded-3xl border border-white/8 bg-[#1a1b1f] p-6 md:p-8"><span className="font-display text-5xl text-gold">8</span><p className="mt-3 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8f8d88]">anos fazendo história</p></div>
              <div className="rounded-3xl border border-white/8 bg-[#1a1b1f] p-6 md:p-8"><span className="font-display text-5xl text-gold">12k</span><p className="mt-3 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8f8d88]">cortes entregues</p></div>
              <div className="rounded-3xl border border-white/8 bg-[#1a1b1f] p-6 md:p-8"><span className="font-display text-5xl text-gold">4.9</span><p className="mt-3 flex items-center gap-1 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#8f8d88]">avaliação média <Star size={11} className="fill-gold text-gold" /></p></div>
            </div>
          </div>
        </section>

        <section id="servicos" className="bg-[#17181b] py-16 md:py-32">
          <div className="section-wrap">
            <SectionHeading eyebrow="Serviços" title={<>O essencial.<br /><em className="text-gold">Bem executado.</em></>} body="Escolha seu ritual. A gente cuida do resto — com técnica, tempo e atenção ao que faz você ser você." action={<BookingButton onClick={openBooking} compact>Ver disponibilidade</BookingButton>} />
            <div className="grid gap-3 md:grid-cols-2">
              {services.map((service, index) => (
                <div key={service.id} data-testid={`card-service-${service.id}`} className={`service-card group relative rounded-3xl p-6 md:p-8 ${index === 0 ? 'md:translate-y-5' : ''}`}>
                  <div className="flex items-start justify-between gap-4"><span className="font-mono-ui text-[10px] text-[#6f6e73]">0{index + 1}</span><span className="rounded-full border border-white/10 px-3 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-[#99958d]">{service.duration}</span></div>
                  <div className="mt-10 flex items-end justify-between gap-5"><div><h3 className="font-display text-3xl text-[#eee9df]">{service.name}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-[#85848a]">{service.detail}</p></div><span className="shrink-0 text-xl font-semibold text-gold">{service.price}</span></div>
                  <button type="button" onClick={() => { setBooking({ ...initialBooking, service }); setBookingOpen(true); }} data-testid={`button-book-service-${service.id}`} className="mt-7 inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#c7c1b5] transition-colors hover:text-gold">Agendar este serviço <ArrowUpRight size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="time" className="py-16 md:py-36">
          <div className="section-wrap">
            <SectionHeading eyebrow="Nosso time" title={<>Mãos experientes.<br /><em className="text-gold">Olhar atento.</em></>} body="Cada barbeiro tem uma assinatura. Todos compartilham a mesma obsessão por um bom acabamento." />
            <div className="grid gap-4 md:grid-cols-3">
              {barbers.map((barber, index) => (
                <article key={barber.id} data-testid={`card-barber-${barber.id}`} className={`team-card group ${index === 1 ? 'md:translate-y-8' : ''}`}>
                  <div className="relative aspect-[.9] overflow-hidden rounded-3xl bg-[#1c1d21]"><img src={barber.image} alt={barber.name} className="team-image h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121316] via-[#121316]/50 to-transparent p-5 pt-20"><p className="font-mono-ui text-[9px] uppercase tracking-[.17em] text-gold">{barber.initials} / Gerson Barber</p></div></div>
                  <div className="flex items-center justify-between px-1 pt-5"><div><h3 className="text-base font-semibold text-[#eee9df]">{barber.name}</h3><p className="mt-1 text-xs text-[#85848a]">{barber.role}</p></div><button type="button" onClick={() => { setBooking({ ...initialBooking, barber }); setBookingOpen(true); }} data-testid={`button-book-barber-${barber.id}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#bdb6a9] transition-colors hover:border-gold hover:text-gold" aria-label={`Agendar com ${barber.name}`}><ArrowUpRight size={16} /></button></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="galeria" className="bg-[#17181b] py-16 md:py-32">
          <div className="section-wrap">
            <SectionHeading eyebrow="Por aqui" title={<>Um pouco do que<br /><em className="text-gold">acontece na cadeira.</em></>} action={<a href="https://www.instagram.com/" target="_blank" rel="noreferrer" data-testid="link-instagram-gallery" className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[#c7c1b5] hover:text-gold">Ver no Instagram <Instagram size={15} /></a>} />
            <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[240px] md:grid-cols-4">
              {gallery.map((item, index) => <div key={item.src} data-testid={`gallery-tile-${index}`} className={`gallery-tile overflow-hidden rounded-3xl ${item.size === 'large' ? 'col-span-2 row-span-2' : item.size === 'wide' ? 'col-span-2' : ''}`}><img src={item.src} alt={item.alt} className="gallery-image h-full w-full object-cover" /></div>)}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-36">
          <div className="section-wrap">
            <div className="grid items-center gap-12 md:grid-cols-[.8fr_1.2fr] md:gap-24">
              <div><p className="eyebrow">Eles voltam</p><p className="mt-6 font-display text-4xl leading-none text-[#eee9df] md:text-6xl">A melhor<br /><em className="text-gold">propaganda</em><br />é o espelho.</p><div className="mt-9 flex gap-2"><button type="button" onClick={() => setTestimonial((testimonial + testimonials.length - 1) % testimonials.length)} data-testid="button-previous-review" className="rounded-full border border-white/10 p-3 text-[#b3aea4] hover:border-gold hover:text-gold" aria-label="Avaliação anterior"><ChevronLeft size={16} /></button><button type="button" onClick={() => setTestimonial((testimonial + 1) % testimonials.length)} data-testid="button-next-review" className="rounded-full border border-white/10 p-3 text-[#b3aea4] hover:border-gold hover:text-gold" aria-label="Próxima avaliação"><ChevronRight size={16} /></button></div></div>
              <div className="relative rounded-3xl border border-white/8 bg-[#1a1b1f] p-7 md:p-12"><Quote size={36} strokeWidth={1} className="absolute right-8 top-8 text-gold/50" /><div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className="fill-gold text-gold" />)}</div><p data-testid="text-review-quote" className="mt-9 max-w-lg font-display text-3xl leading-tight text-[#e5dfd4] md:text-4xl">“{testimonials[testimonial].quote}”</p><div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5"><div><p data-testid="text-review-name" className="text-sm font-semibold text-[#eee9df]">{testimonials[testimonial].name}</p><p className="mt-1 font-mono-ui text-[9px] uppercase tracking-wider text-[#77767a]">{testimonials[testimonial].detail}</p></div><span className="font-mono-ui text-[10px] text-[#77767a]">0{testimonial + 1} / 03</span></div></div>
            </div>
          </div>
        </section>

        <section id="visite" className="bg-[#17181b] py-16 md:py-32">
          <div className="section-wrap">
            <div className="grid gap-10 md:grid-cols-[1fr_.8fr] md:gap-24">
              <div><p className="eyebrow">Visite a casa</p><h2 className="mt-5 font-display text-5xl leading-[.93] text-[#eee9df] md:text-7xl">Te esperamos<br /><em className="text-gold">em Aracaju.</em></h2><div className="mt-10 grid gap-5 border-t border-white/10 pt-7 text-sm text-[#a19e97]"><p className="flex gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-gold" /><span>R. Srg. Manoel Osvaldo das Neves, 430<br />Aracaju · SE, 49042-370</span></p><p className="flex gap-3"><Clock3 size={17} className="mt-0.5 shrink-0 text-gold" /><span>Terça a sexta · 09h às 19h<br />Sábado · 09h às 17h</span></p><p className="flex gap-3"><Phone size={17} className="mt-0.5 shrink-0 text-gold" /><span>(79) 99890-1228</span></p></div><div className="mt-8 flex flex-wrap gap-3"><a href="https://www.google.com/maps/search/?api=1&query=R.+Srg.+Manoel+Osvaldo+das+Neves+430+Aracaju+SE" target="_blank" rel="noreferrer" data-testid="link-directions" className="outline-button inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[.13em]">Como chegar <Navigation size={14} /></a><BookingButton onClick={openBooking}>Reservar agora</BookingButton></div></div>
              <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#222326]"><iframe title="Localização Gerson Barber" src="https://www.google.com/maps?q=R.+Srg.+Manoel+Osvaldo+das+Neves,+430,+Aracaju+-+SE,+49042-370&output=embed" className="h-full w-full min-h-[320px] grayscale invert-[.92] contrast-[.9]" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 text-center md:py-40">
          <div className="section-wrap relative z-10"><p className="eyebrow">O próximo corte</p><h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-[.9] tracking-[-.04em] text-[#eee9df] md:text-8xl">Seu melhor ângulo<br /><em className="text-gold">começa aqui.</em></h2><p className="mx-auto mt-7 max-w-sm text-sm leading-6 text-[#929096]">Escolha um horário e deixe o resto com a gente.</p><div className="mt-9"><BookingButton onClick={openBooking}>Agendar meu horário</BookingButton></div></div>
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10" />
          <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10" />
        </section>
      </main>
      <footer className="border-t border-white/10 bg-[#101114] py-10">
        <div className="section-wrap flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div><a href="#top" data-testid="link-footer-logo" className="font-display text-3xl text-[#eee9df]">Gerson<span className="text-gold">.</span></a><p className="mt-3 max-w-xs text-xs leading-5 text-[#77767a]">Barbearia autoral para homens que não terceirizam sua presença.</p></div>
          <div className="flex flex-col items-start gap-4 md:items-end"><div className="flex flex-wrap items-center gap-5"><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" data-testid="link-instagram-footer" className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-[#aaa59b] hover:text-gold"><Instagram size={15} /> Instagram</a><a href="https://wa.me/5579998901228" target="_blank" rel="noreferrer" data-testid="link-whatsapp-footer" className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-[#aaa59b] hover:text-gold"><MessageCircle size={15} /> WhatsApp</a></div><p className="font-mono-ui text-[9px] uppercase tracking-wider text-[#5f5e63]">© 2024 Gerson Barber Studio</p></div>
        </div>
      </footer>
      {showMobileBar && !bookingOpen && (
        <div className="mobile-book-bar fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#151619]/95 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={openBooking} data-testid="button-mobile-sticky-book" className="gold-button flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-mono-ui text-[11px] font-medium uppercase tracking-[.14em]">Agendar horário <ArrowUpRight size={15} /></button>
        </div>
      )}
      {bookingOpen && <BookingFlow booking={booking} setBooking={setBooking} onClose={() => setBookingOpen(false)} />}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin">{() => <AdminGate><Admin /></AdminGate>}</Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;