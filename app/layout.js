import './globals.css';

export const metadata = {
  title: 'VIZENTIVE 홈페이지',
  description: 'AI 숏폼 자동화 홈페이지',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
