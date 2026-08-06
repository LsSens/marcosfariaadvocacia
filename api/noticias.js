const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const INSS_URL = "https://www.gov.br/inss/pt-br/assuntos/noticias";
const STJ_FEED =
  "https://processo.stj.jus.br/jurisprudencia/externo/InformativoFeed";
const STJ_HOME =
  "https://ww2.stj.jus.br/jurisprudencia/externo/informativo/";

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

    const summaryMatch = article.match(
      /<span class="description">([\s\S]*?)<\/span>/i
    );
    const categoryMatch = article.match(
      /<span class="subtitle">([\s\S]*?)<\/span>/i
    );
    const imageMatch = article.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
    const altMatch = article.match(/<img[^>]+alt="([^"]*)"/i);
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

    const summary = summaryMatch
      ? stripTags(summaryMatch[1])
      : "Notícia oficial publicada pelo Instituto Nacional do Seguro Social.";

    const title = stripTags(titleMatch[2]);
    const listingImage = imageMatch ? decodeEntities(imageMatch[1]) : null;
    let image = listingImage;
    let imageLarge = listingImage;
    let imageThumb = listingImage;

    // Plone: /@@images/image/large ≈ 768px; listing thumb costuma ser 128px
    if (listingImage && listingImage.indexOf("/@@images/") !== -1) {
      const objectUrl = listingImage.split("/@@images/")[0];
      imageThumb = objectUrl + "/@@images/image/preview";
      imageLarge = objectUrl + "/@@images/image/large";
      image = imageLarge;
    }

    items.push({
      source: "INSS",
      sourceLabel: "INSS",
      sourceName: "Instituto Nacional do Seguro Social (INSS)",
      category: categoryMatch ? stripTags(categoryMatch[1]) : "Notícia",
      title: title,
      summary: summary,
      image: image,
      imageThumb: imageThumb,
      imageLarge: imageLarge,
      imageFallback: listingImage,
      imageAlt: altMatch ? stripTags(altMatch[1]) || title : title,
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

  for (const entry of entries.slice(0, 12)) {
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch =
      entry.match(/<link[^>]*href="([^"]+)"/i) ||
      entry.match(/<link>([^<]+)<\/link>/i);
    const dateMatch =
      entry.match(/<updated>([^<]+)<\/updated>/i) ||
      entry.match(/<published>([^<]+)<\/published>/i);
    const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);

    if (!titleMatch || !linkMatch) continue;

    const title = stripTags(titleMatch[1]).replace(/\.$/, "");
    const rawDate = dateMatch ? dateMatch[1] : null;
    const date = rawDate ? new Date(rawDate) : null;
    const dateLabel =
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("pt-BR")
        : "";

    let summary = summaryMatch ? stripTags(summaryMatch[1]) : "";
    if (!summary) {
      summary =
        "Edição do Informativo de Jurisprudência do Superior Tribunal de Justiça, com os principais entendimentos publicados nesta data. Consulte a íntegra na fonte oficial.";
    }

    items.push({
      source: "STJ",
      sourceLabel: "STJ",
      sourceName: "Superior Tribunal de Justiça (STJ)",
      category: "Informativo",
      title: title,
      summary: summary,
      image: null,
      imageThumb: null,
      imageLarge: null,
      imageFallback: null,
      imageAlt: title,
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

function mergeNews(inssItems, stjItems, full) {
  if (full) {
    const pickInss = inssItems.slice().sort(byDateDesc).slice(0, 10);
    const pickStj = stjItems.slice(0, 6);
    return pickInss.concat(pickStj).sort(byDateDesc);
  }

  const pickInss = inssItems.slice().sort(byDateDesc).slice(0, 8);
  const pickStj = stjItems.slice(0, 2);
  return pickInss.concat(pickStj).sort(byDateDesc);
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

  const full =
    req.query &&
    (req.query.full === "1" ||
      req.query.full === "true" ||
      req.query.full === "yes");

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

    const items = mergeNews(inssItems, stjItems, full);

    res.status(200).json({
      updatedAt: new Date().toISOString(),
      full: Boolean(full),
      items: items,
      sources: {
        inss: INSS_URL,
        stj: STJ_HOME,
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
