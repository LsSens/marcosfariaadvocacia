const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const INSS_URL = "https://www.gov.br/inss/pt-br/assuntos/noticias";
const STJ_FEED =
  "https://processo.stj.jus.br/jurisprudencia/externo/InformativoFeed";

function decodeEntities(str) {
  return String(str || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    )
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(str) {
  return decodeEntities(String(str || "").replace(/<[^>]+>/g, " "));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error("Falha ao buscar " + url + " (" + res.status + ")");
  }
  return res.text();
}

function parseInss(html) {
  const articles = html.match(/<article class="tileItem[\s\S]*?<\/article>/gi) || [];
  const items = [];

  for (const article of articles) {
    const titleMatch = article.match(
      /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (!titleMatch) continue;

    const dateMatch = article.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    let date = null;
    let dateLabel = "";
    if (dateMatch) {
      date = new Date(
        Number(dateMatch[3]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[1])
      );
      dateLabel = dateMatch[0];
    }

    items.push({
      source: "INSS",
      sourceLabel: "INSS",
      title: stripTags(titleMatch[2]),
      url: titleMatch[1],
      date: date ? date.toISOString() : null,
      dateLabel: dateLabel || "",
    });
  }

  return items;
}

function parseStjFeed(xml) {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/gi) || [];
  const items = [];

  for (const entry of entries.slice(0, 8)) {
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch =
      entry.match(/<link[^>]*href="([^"]+)"/i) ||
      entry.match(/<link>([^<]+)<\/link>/i);
    const dateMatch =
      entry.match(/<updated>([^<]+)<\/updated>/i) ||
      entry.match(/<published>([^<]+)<\/published>/i);

    if (!titleMatch || !linkMatch) continue;

    const rawDate = dateMatch ? dateMatch[1] : null;
    const date = rawDate ? new Date(rawDate) : null;
    const dateLabel =
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("pt-BR")
        : "";

    items.push({
      source: "STJ",
      sourceLabel: "STJ",
      title: stripTags(titleMatch[1]).replace(/\.$/, ""),
      url: decodeEntities(linkMatch[1]),
      date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      dateLabel: dateLabel,
    });
  }

  return items;
}

function byDateDesc(a, b) {
  const da = a.date ? Date.parse(a.date) : 0;
  const db = b.date ? Date.parse(b.date) : 0;
  return db - da;
}

function mergeNews(inssItems, stjItems) {
  const pickInss = inssItems.slice().sort(byDateDesc).slice(0, 4);
  const pickStj = stjItems.slice(0, 2);
  return pickInss.concat(pickStj).sort(byDateDesc).slice(0, 6);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=3600"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const results = await Promise.allSettled([
      fetchText(INSS_URL).then(parseInss),
      fetchText(STJ_FEED).then(parseStjFeed),
    ]);

    const inssItems =
      results[0].status === "fulfilled" ? results[0].value : [];
    const stjItems =
      results[1].status === "fulfilled" ? results[1].value : [];

    if (!inssItems.length && !stjItems.length) {
      throw new Error("Nenhuma fonte respondeu");
    }

    const items = mergeNews(inssItems, stjItems);

    res.status(200).json({
      updatedAt: new Date().toISOString(),
      items: items,
      sources: {
        inss: INSS_URL,
        stj: "https://ww2.stj.jus.br/jurisprudencia/externo/informativo/",
      },
      errors: [
        results[0].status === "rejected" ? String(results[0].reason) : null,
        results[1].status === "rejected" ? String(results[1].reason) : null,
      ].filter(Boolean),
    });
  } catch (err) {
    res.status(502).json({
      updatedAt: new Date().toISOString(),
      items: [],
      error: err && err.message ? err.message : "Erro ao carregar notícias",
    });
  }
};
