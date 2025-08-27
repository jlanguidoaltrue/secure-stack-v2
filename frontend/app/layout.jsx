import "./globals.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "Secure Frontend",
  description: "Protected demo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
