import Script from 'next/script';
import type { SeoPublic } from '../../lib/seo';

const GA4 = /^G-[A-Z0-9]{4,12}$/;
const GTM = /^GTM-[A-Z0-9]{4,10}$/;

/** Structured data and analytics tags for the public landing page, from the admin SEO settings. Renders nothing when unset.
 *  IDs are checked here too, so a bad value in the database can never become script text. */
export default function SeoScripts({ seo }: { seo: SeoPublic | null }) {
  if (!seo) return null;
  const { ga4_id: ga4, gtm_id: gtm } = seo.analytics;
  return (
    <>
      {seo.json_ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.json_ld).replace(/</g, '\\u003c') }} />}
      {GA4.test(ga4) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(ga4)});`}</Script>
        </>
      )}
      {GTM.test(gtm) && (
        <Script id="gtm-init" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`}</Script>
      )}
    </>
  );
}
