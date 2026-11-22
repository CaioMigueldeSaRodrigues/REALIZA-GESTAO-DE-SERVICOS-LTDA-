import type { Metadata } from 'next';
import './globals.css';
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: 'Águaserv | REALIZA Gestão de Serviços', template: '%s | Águaserv REALIZA' },
  description: 'Soluções de abastecimento e distribuição de água por caminhão-pipa em Pouso Alegre e região. Solicite atendimento e orçamento.',
  openGraph: { title: 'Águaserv • REALIZA', description: 'Distribuição de água com planejamento e rastreabilidade.', locale: 'pt_BR', type: 'website' },
  robots: { index: true, follow: true }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
