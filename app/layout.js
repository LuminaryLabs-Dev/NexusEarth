import "./globals.css";

export const metadata = {
  title: "Nexus Earth",
  description: "Explore recent NASA Earth observations on an interactive 3D globe."
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
