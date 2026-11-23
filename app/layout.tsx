import type { Metadata } from 'next';
import './globals.css';
import {publicSupabaseConfig} from '@/lib/public-supabase-config';
export const dynamic='force-dynamic';
const base = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')?process.env.NEXT_PUBLIC_SITE_URL:'https://realiza-gestao-de-servicos-ltda.vercel.app';
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: 'Águaserv | REALIZA Gestão de Serviços', template: '%s | Águaserv REALIZA' },
  description: 'Soluções de abastecimento e distribuição de água por caminhão-pipa em Pouso Alegre e região. Solicite atendimento e orçamento.',
  openGraph: { title: 'Águaserv • REALIZA', description: 'Distribuição de água com planejamento e rastreabilidade.', locale: 'pt_BR', type: 'website' },
  robots: { index: true, follow: true }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const publicConfig=publicSupabaseConfig();
  // Evita dependência exclusiva do build para valores públicos do cliente.
  // Escapamos caracteres que poderiam interromper um <script>.
  const serialized=JSON.stringify(publicConfig)
    .replace(/</g,'\\u003c').replace(/\\u2028/g,'\\u2028').replace(/\\u2029/g,'\\u2029');
  return <html lang="pt-BR"><head><script dangerouslySetInnerHTML={{
   __html:'window.__REALIZA_PUBLIC_SUPABASE__='+serialized+';'
  }}/></head><body>{children}</body></html>;
}
