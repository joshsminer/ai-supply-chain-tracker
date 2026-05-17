/**
 * Canonical external URLs for data sources. Centralised so we link consistently
 * across the app and so source attribution stays verifiable.
 */

export function yahooFinanceUrl(ticker: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

export function secCompanyUrl(cik: string): string {
  const padded = String(cik).replace(/^0+/, '');
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padded}&type=10-Q&dateb=&owner=include&count=40`;
}

export const COMTRADE_HOME = 'https://comtradeplus.un.org';

export function comtradeHsUrl(hsCode: string): string {
  // Static page on the Comtrade reference site for a given HS classification.
  return `https://comtradeplus.un.org/TradeFlow?Frequency=M&Flows=X&CommodityCodes=${encodeURIComponent(hsCode)}&Partners=0&Reporters=410&period=2024`;
}

export const YFINANCE_HOME = 'https://finance.yahoo.com';
export const EDGAR_HOME = 'https://www.sec.gov/edgar';

/** Best-guess "official" page for a non-EDGAR ticker (Asian / European listings). */
export function vendorIrUrl(ticker: string | undefined): string | null {
  if (!ticker) return null;
  switch (ticker) {
    case '5802.T':
      return 'https://sumitomoelectric.com/ir';
    case '5016.T':
      return 'https://www.jx-nmm.com/english/ir/';
    case '6501.T':
      return 'https://www.hitachi.com/IR-e/';
    case '6503.T':
      return 'https://www.mitsubishielectric.com/en/ir/';
    case '7011.T':
      return 'https://www.mhi.com/finance';
    case '4062.T':
      return 'https://www.ibiden.com/english/ir/';
    case '4063.T':
      return 'https://www.shinetsu.co.jp/en/ir/';
    case '4186.T':
      return 'https://www.tok.co.jp/eng/ir';
    case '2802.T':
      return 'https://www.ajinomoto.co.jp/company/en/ir/';
    case '8035.T':
      return 'https://www.tel.com/ir';
    case '000660.KS':
      return 'https://www.skhynix.com/eng/ir/';
    case '005930.KS':
      return 'https://www.samsung.com/global/ir/';
    case '042700.KS':
      return 'https://www.hanmi-semi.com/eng/ir/';
    case '267260.KS':
      return 'https://www.hdhyundaielectric.com/en/ir/';
    case '357780.KS':
      return 'https://www.soulbrain.co.kr/ir/';
    case 'ENR.DE':
      return 'https://www.siemens-energy.com/global/en/home/investor-relations.html';
    case 'BESI.AS':
      return 'https://www.besi.com/investor-relations/';
    case 'IQE.L':
      return 'https://www.iqep.com/investors/';
    case 'SU.PA':
      return 'https://www.se.com/ww/en/about-us/investor-relations/';
    case '2308.TW':
      return 'https://www.deltaww.com/en-US/ir';
    case '3037.TW':
      return 'https://www.unimicron.com/en/investor/';
    case '3189.TW':
      return 'https://www.kinsus.com.tw/ir/';
    case '300308.SZ':
    case '300502.SZ':
    case '002281.SZ':
    case '600111.SS':
      return null; // A-share IR pages are mostly Chinese-only
    case 'LYC.AX':
      return 'https://www.lynasrareearths.com/investors/';
    case 'WRT1V.HE':
      return 'https://www.wartsila.com/investors';
    default:
      return null;
  }
}
