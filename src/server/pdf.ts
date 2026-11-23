/**
 * Gera o PDF de uma página do próprio site com um Chrome sem janela.
 * Na Vercel usa o Chromium empacotado (@sparticuz/chromium); localmente, o
 * Chrome instalado (CHROME_PATH) ou o caminho padrão do Linux.
 */
export async function gerarPdf(url: string): Promise<Uint8Array> {
  const puppeteer = (await import("puppeteer-core")).default;
  let executablePath: string;
  let args: string[];
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    executablePath = await chromium.executablePath();
    args = chromium.args;
  } else {
    executablePath = process.env.CHROME_PATH || "/usr/bin/google-chrome";
    args = ["--no-sandbox", "--disable-gpu"];
  }
  const browser = await puppeteer.launch({ executablePath, args, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.waitForSelector(".bol-pagina", { timeout: 10_000 });
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}
