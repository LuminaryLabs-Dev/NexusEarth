import "./globals.css";
import "cesium/Build/Cesium/Widgets/widgets.css";

export const metadata = {
  title: "Nexus Earth",
  description: "Search, inspect, and compare open Earth imagery and terrain on an interactive 3D globe."
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
