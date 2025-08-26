import './globals.css';
import Providers from '../components/Providers.jsx';
import NavBar from '../components/NavBar.jsx';
import ErrorReporter from '../components/ErrorReporter.jsx';

export const metadata = { title: 'Secure Frontend', description: 'Next.js + Tailwind + MUI tester' };

export default function RootLayout({ children }){
  return (
    <html lang="en">
      <body>
        <Providers>
          <ErrorReporter/>
          <NavBar/>
          <main className="max-w-6xl mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
