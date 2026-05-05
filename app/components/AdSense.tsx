// components/AdSense.tsx
import Script from "next/script";

export default function AdSense() {
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6816753251540275"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}