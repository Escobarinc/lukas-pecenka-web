<?php
/* Jádro administrace: data, bezpečné čištění HTML, obrázky a vytváření hotových stránek.
   Používá admin (index.php) i příkazová řádka (publikuj.php). */
declare(strict_types=1);
date_default_timezone_set('Europe/Prague');

const WEB = __DIR__ . '/..';
const DATA = WEB . '/_soukrome/data';
const ZALOHY = WEB . '/_soukrome/zalohy';
const DOMENA = 'https://lukaspecenka.cz/';
const NAZEV_WEBU = 'Lukáš Pečenka – sanační průzkumy a diagnostika vlhkosti';
const SEKCE_REFERENCI = ['aktualni' => 'Vybrané a aktuální projekty', 'domy' => 'Rodinné domy, vily a sklepy', 'pamatky' => 'Památky a historické objekty', 'verejne' => 'Veřejné a technické stavby'];

function e(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function holy(string $html): string { return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? ''); }
function slug(string $t): string {
    $t = strtr(mb_strtolower($t), ['á'=>'a','č'=>'c','ď'=>'d','é'=>'e','ě'=>'e','í'=>'i','ň'=>'n','ó'=>'o','ř'=>'r','š'=>'s','ť'=>'t','ú'=>'u','ů'=>'u','ý'=>'y','ž'=>'z','ä'=>'a','ö'=>'o','ü'=>'u']);
    $t = trim(preg_replace('/[^a-z0-9]+/', '-', $t) ?? '', '-');
    $slova = explode('-', $t); $out = '';
    foreach ($slova as $s) { if (strlen($out . '-' . $s) > 60) break; $out .= ($out ? '-' : '') . $s; }
    return $out ?: 'clanek';
}
function datumCz(string $iso): string { $d = DateTime::createFromFormat('Y-m-d', $iso); return $d ? $d->format('j. n. Y') : $iso; }

/* ---------- data ---------- */
function nacti(string $co): array {
    $f = DATA . "/$co.json";
    if (!is_file($f)) return [$co => []];
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : [$co => []];
}
function uloz(string $co, array $data, string $kdo = 'admin'): void {
    if (!is_dir(DATA)) mkdir(DATA, 0700, true);
    if (!is_dir(ZALOHY)) mkdir(ZALOHY, 0700, true);
    $f = DATA . "/$co.json";
    if (is_file($f)) copy($f, ZALOHY . "/$co-" . date('Ymd-His') . '.json');      // historie verzí
    $zal = glob(ZALOHY . "/$co-*.json") ?: []; sort($zal);
    while (count($zal) > 60) @unlink(array_shift($zal));
    $tmp = $f . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    rename($tmp, $f);
    @file_put_contents(DATA . '/log.txt', date('c') . " $kdo uložil $co\n", FILE_APPEND | LOCK_EX);
}

/* ---------- čištění HTML z editoru (jen povolené značky) ---------- */
function vycisti(string $html): string {
    $povolene = ['p' => [], 'h2' => [], 'h3' => [], 'ul' => [], 'ol' => [], 'li' => [], 'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'br' => [],
        'a' => ['href'], 'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'th' => [], 'td' => [], 'blockquote' => []];
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><div id="koren">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
    libxml_clear_errors();
    $koren = $doc->getElementById('koren');
    if (!$koren) return '';
    $projdi = function (DOMNode $n) use (&$projdi, $povolene, $doc): void {
        foreach (iterator_to_array($n->childNodes) as $d) {
            if ($d instanceof DOMElement) {
                $tag = strtolower($d->tagName);
                if ($tag === 'div' || $tag === 'span' || $tag === 'font' || $tag === 'section') {   // obal rozbalit, obsah nechat
                    $projdi($d);
                    while ($d->firstChild) $n->insertBefore($d->firstChild, $d);
                    $n->removeChild($d); continue;
                }
                if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'img', 'svg', 'math', 'link', 'meta'], true) || !isset($povolene[$tag])) {
                    if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'link', 'meta', 'form', 'input', 'img'], true)) { $n->removeChild($d); continue; }
                    $projdi($d); while ($d->firstChild) $n->insertBefore($d->firstChild, $d); $n->removeChild($d); continue;
                }
                foreach (iterator_to_array($d->attributes) as $a) {
                    $jmeno = strtolower($a->name);
                    if (!in_array($jmeno, $povolene[$tag], true)) { $d->removeAttribute($a->name); continue; }
                    if ($jmeno === 'href') {
                        $h = trim($a->value);
                        if (!preg_match('~^(https?://|mailto:|tel:|/|#|[a-z0-9-]+\.html)~i', $h)) $d->removeAttribute('href');
                    }
                }
                if ($tag === 'a' && preg_match('~^https?://~i', $d->getAttribute('href')) && !str_contains($d->getAttribute('href'), 'lukaspecenka.cz')) {
                    $d->setAttribute('target', '_blank'); $d->setAttribute('rel', 'noopener');
                }
                if ($tag === 'b') { $s = $doc->createElement('strong'); while ($d->firstChild) $s->appendChild($d->firstChild); $n->replaceChild($s, $d); $projdi($s); continue; }
                if ($tag === 'i') { $s = $doc->createElement('em'); while ($d->firstChild) $s->appendChild($d->firstChild); $n->replaceChild($s, $d); $projdi($s); continue; }
                $projdi($d);
            } elseif ($d instanceof DOMComment) {
                $n->removeChild($d);
            }
        }
    };
    $projdi($koren);
    $out = '';
    foreach ($koren->childNodes as $d) {
        if ($d instanceof DOMText) { $t = trim($d->textContent); if ($t !== '') $out .= '<p>' . e($t) . '</p>'; continue; }
        $out .= $doc->saveHTML($d);
    }
    $out = preg_replace('~<p>\s*(<br\s*/?>)?\s*</p>~', '', $out) ?? '';
    $out = preg_replace('~<table>~', '<div class="rada-table"><table>', $out) ?? '';
    $out = preg_replace('~</table>~', '</table></div>', $out) ?? '';
    return trim(preg_replace('~>\s*<(h2|h3|p|ul|ol|div)~', ">\n<$1", $out) ?? '');
}

/* ---------- obrázky: max 1600 px, JPEG + WebP ---------- */
function zpracujFoto(string $tmp, string $cilBezPripony): ?string {
    $info = @getimagesize($tmp);
    if (!$info) return null;
    $zdroj = match ($info[2]) { IMAGETYPE_JPEG => @imagecreatefromjpeg($tmp), IMAGETYPE_PNG => @imagecreatefrompng($tmp), IMAGETYPE_WEBP => @imagecreatefromwebp($tmp), default => false };
    if (!$zdroj) return null;
    if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {     // otočení podle fotoaparátu
        $o = @exif_read_data($tmp)['Orientation'] ?? 1;
        if ($o == 3) $zdroj = imagerotate($zdroj, 180, 0); elseif ($o == 6) $zdroj = imagerotate($zdroj, -90, 0); elseif ($o == 8) $zdroj = imagerotate($zdroj, 90, 0);
    }
    $w = imagesx($zdroj); $h = imagesy($zdroj); $k = min(1, 1600 / max($w, $h));
    $nw = (int)round($w * $k); $nh = (int)round($h * $k);
    $cil = imagecreatetruecolor($nw, $nh);
    imagefill($cil, 0, 0, imagecolorallocate($cil, 255, 255, 255));
    imagecopyresampled($cil, $zdroj, 0, 0, 0, 0, $nw, $nh, $w, $h);
    if (!is_dir(dirname($cilBezPripony))) mkdir(dirname($cilBezPripony), 0755, true);
    imageinterlace($cil, true);
    imagejpeg($cil, $cilBezPripony . '.jpg', 80);
    if (max($nw, $nh) > 1000) {                 // menší verze pro mobily (srcset)
        $k2 = 800 / max($nw, $nh); $mw = (int)round($nw * $k2); $mh = (int)round($nh * $k2);
        $male = imagecreatetruecolor($mw, $mh); imagecopyresampled($male, $cil, 0, 0, 0, 0, $mw, $mh, $nw, $nh);
        imageinterlace($male, true); imagejpeg($male, $cilBezPripony . '-800.jpg', 78);
        if (function_exists('imagewebp')) { imagewebp($male, $cilBezPripony . '-800.webp', 76); if (filesize($cilBezPripony . '-800.webp') > 0.9 * filesize($cilBezPripony . '-800.jpg')) @unlink($cilBezPripony . '-800.webp'); }
    }
    if (function_exists('imagewebp')) {
        imagewebp($cil, $cilBezPripony . '.webp', 78);
        if (filesize($cilBezPripony . '.webp') > 0.9 * filesize($cilBezPripony . '.jpg')) @unlink($cilBezPripony . '.webp');
    }
    return $cilBezPripony . '.jpg';
}
function smazFoto(string $relCesta): void {
    $p = realpath(WEB . '/' . $relCesta);
    $assets = realpath(WEB . '/assets');
    if ($p && $assets && str_starts_with($p, $assets . DIRECTORY_SEPARATOR) && is_file($p)) {
        @unlink($p); @unlink(preg_replace('/\.(jpe?g|png)$/i', '.webp', $p)); @unlink(preg_replace('/\.(jpe?g|png)$/i', '-800.jpg', $p)); @unlink(preg_replace('/\.(jpe?g|png)$/i', '-800.webp', $p));
    }
}


/* srcset pro obrázek, pokud existuje menší verze */
function srcset(string $src): string {
    if (!preg_match('~^(assets/[^"?]+)\.(jpe?g)$~', $src, $m) || !is_file(WEB . '/' . $m[1] . '-800.jpg')) return '';
    return ' srcset="' . e($m[1]) . '-800.jpg 800w, ' . e($src) . ' 1600w" sizes="(max-width: 700px) 100vw, 50vw"';
}
/* ---------- šablona hlavičky stránky (stejná jako na ostatních stránkách) ---------- */
function hlavaStranky(string $titulek, string $popis, string $seoBlok): string {
    $radky = explode("\n", (string)file_get_contents(WEB . '/diagnostika.html'));
    $h = $radky[1];
    $h = preg_replace('~<!--SEO-->.*?<!--/SEO-->~s', '', $h) ?? $h;
    $h = preg_replace('~<title>.*?</title>~s', '<title>' . e($titulek) . '</title>', $h, 1) ?? $h;
    $h = preg_replace('~<meta name="description" content="[^"]*">~', '<meta name="description" content="' . e($popis) . '">', $h, 1) ?? $h;
    return str_replace('</head>', '<!--SEO-->' . $seoBlok . '<!--/SEO--></head>', $h);
}
function skripty(): string {
    preg_match_all('~<script src="(subpage|script|cookies)\.js\?v=\d+"></script>~', (string)file_get_contents(WEB . '/diagnostika.html'), $m);
    return implode('', $m[0]);
}
function seoBlok(string $url, string $titulek, string $popis, string $obr, string $typ, array $graf): string {
    $j = json_encode(['@context' => 'https://schema.org', '@graph' => $graf], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return '<link rel="canonical" href="' . e($url) . '"><meta property="og:type" content="' . $typ . '"><meta property="og:locale" content="cs_CZ">'
        . '<meta property="og:site_name" content="' . e(NAZEV_WEBU) . '"><meta property="og:title" content="' . e($titulek) . '"><meta property="og:description" content="' . e($popis) . '">'
        . '<meta property="og:url" content="' . e($url) . '"><meta property="og:image" content="' . e($obr) . '"><meta name="twitter:card" content="summary_large_image">'
        . '<script type="application/ld+json">' . str_replace('</', '<\/', (string)$j) . '</script>';
}

/* ---------- články ---------- */
const SLUZBY = [
    'Diagnostika' => [['Diagnostika vlhkosti staveb', 'diagnostika.html'], ['Sanační průzkum', 'sanacni-pruzkum.html'], ['Ukázka průzkumu', 'ukazka-pruzkumu.html']],
    'Průzkum' => [['Sanační průzkum', 'sanacni-pruzkum.html'], ['Ukázka průzkumu', 'ukazka-pruzkumu.html'], ['Reference průzkumů', 'reference.html']],
    'Plísně' => [['Diagnostika vlhkosti', 'diagnostika.html'], ['Otázky a odpovědi', 'otazky-a-odpovedi.html'], ['Sanační průzkum', 'sanacni-pruzkum.html']],
    'Větrání' => [['Odkud se bere vlhkost', 'otazky-a-odpovedi.html#vlhkost'], ['Diagnostika vlhkosti', 'diagnostika.html'], ['Sanační průzkum', 'sanacni-pruzkum.html']],
    '_' => [['Sanační technologie', 'sanacni-technologie.html'], ['Sanační průzkum', 'sanacni-pruzkum.html'], ['Reference realizací', 'reference.html']],
];
function minutCteni(array $c): int { return max(1, (int)round(count(preg_split('/\s+/u', holy($c['telo']), -1, PREG_SPLIT_NO_EMPTY)) / 200)); }
function perex(array $c): string { $h = holy($c['uvod']); return mb_strlen($h) < 230 ? $h : rtrim(mb_substr(mb_substr($h, 0, 220), 0, (int)mb_strrpos(mb_substr($h, 0, 220), ' '))) . '…'; }
function fotoClanku(array $c): string { return $c['foto'] ?: 'assets/bannery/pomoc-a-rady-1.jpg'; }

function vykresliClanek(array $c, array $vsechny): string {
    $kat = $c['kategorie'];
    $min = minutCteni($c);
    $url = DOMENA . 'rada-' . $c['slug'] . '.html';
    $tit = $c['seo_titulek'] ?: $c['nazev'];
    $pop = $c['seo_popis'] ?: perex($c);
    $obr = DOMENA . fotoClanku($c);
    $osoba = DOMENA . 'o-mne.html#osoba'; $firma = DOMENA . '#firma';
    $graf = [
        ['@type' => 'BreadcrumbList', 'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Úvod', 'item' => DOMENA],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Pomoc a rady', 'item' => DOMENA . 'pomoc-a-rady.html'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $c['nazev'], 'item' => $url]]],
        ['@type' => 'Article', 'headline' => $c['nazev'], 'datePublished' => $c['vydano'], 'dateModified' => $c['upraveno'],
            'wordCount' => count(preg_split('/\s+/u', holy($c['telo']), -1, PREG_SPLIT_NO_EMPTY)), 'articleSection' => 'Pomoc a rady',
            'description' => $pop, 'image' => $obr, 'inLanguage' => 'cs', 'author' => ['@id' => $osoba], 'publisher' => ['@id' => $firma], 'mainEntityOfPage' => $url],
    ];
    $qa = [];
    if (preg_match_all('~<h[23]>(.*?)</h[23]>(.*?)(?=<h[23]|$)~s', $c['telo'], $m, PREG_SET_ORDER)) {
        foreach ($m as $x) { $q = holy($x[1]); $a = holy($x[2]); if (str_ends_with($q, '?') && mb_strlen($a) > 40) $qa[] = ['@type' => 'Question', 'name' => $q, 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $a]]; }
    }
    if (count($qa) >= 2) $graf[] = ['@type' => 'FAQPage', 'mainEntity' => $qa];

    $viditelne = array_values(array_filter($vsechny, fn($d) => empty($d['skryty'])));
    $i = array_search($c['slug'], array_column($viditelne, 'slug'), true);
    $stejne = array_values(array_filter($viditelne, fn($d) => $d['slug'] !== $c['slug'] && $d['kategorie'] === $kat));
    $ostatni = [];
    $n = count($viditelne);
    for ($j = 1; $j < $n; $j++) { $d = $viditelne[(($i === false ? 0 : $i) + $j) % $n]; if ($d['slug'] !== $c['slug'] && !in_array($d, $stejne, true)) $ostatni[] = $d; }
    $dalsi = array_slice(array_merge($stejne, $ostatni), 0, 3);
    $karty = implode('', array_map(fn($d) => '<a class="rada-mini" href="rada-' . e($d['slug']) . '.html"><span>' . e($d['kategorie']) . '</span><strong>' . e($d['nazev']) . '</strong></a>', $dalsi));
    $odkazy = implode('', array_map(fn($s) => '<li><a href="' . $s[1] . '">' . e($s[0]) . ' →</a></li>', SLUZBY[$kat] ?? SLUZBY['_']));
    $foto = fotoClanku($c);
    $telo = preg_replace('~^~m', '      ', $c['telo']);

    return "<!doctype html>\n" . hlavaStranky($tit, $pop, seoBlok($url, $tit, $pop, $obr, 'article', $graf)) . "\n"
        . '<body class="subpage rada-page" data-current="rady"><!--GENEROVANO-ADMINEM--><div id="site-shell" class="site-shell"><main>' . "\n"
        . '  <section class="page-hero page-hero--banner"><div class="container page-hero-grid"><div class="page-hero-copy"><nav class="rada-breadcrumb" aria-label="Drobečková navigace"><a href="pomoc-a-rady.html">Pomoc a rady</a> <span>›</span> ' . e($kat) . '</nav>'
        . '<div class="page-kicker">POMOC A RADY · ' . e(mb_strtoupper($kat)) . ' · ' . $min . ' MIN ČTENÍ</div><h1>' . e($c['nazev']) . '</h1><p class="page-lead">' . $c['uvod'] . '</p></div>'
        . '<figure class="page-banner" data-banner="rada-' . e($c['slug']) . '"><img fetchpriority="high"' . srcset($foto) . ' src="' . e($foto) . '" alt="' . e($c['nazev']) . '" onerror="this.remove()"><figcaption>Úvodní fotka: ' . e($c['nazev']) . '</figcaption></figure></div></section>' . "\n"
        . '  <section class="page-section"><div class="container rada-layout"><article class="rada-text">' . "\n" . $telo . "\n"
        . '      <footer class="rada-autor"><img loading="lazy" decoding="async" src="assets/bannery/o-mne.jpg" alt="Mgr. Lukáš Pečenka, DiS." width="72" height="72"><div><strong>Mgr. Lukáš Pečenka, DiS.</strong><span>Specialista na sanační průzkumy a diagnostiku vlhkosti staveb, přes 20 let praxe, řádný člen WTA CZ.</span><small>Aktualizováno <time datetime="' . e($c['upraveno']) . '">' . datumCz($c['upraveno']) . '</time> · <a href="o-mne.html">Více o autorovi</a></small></div></footer>' . "\n"
        . '    </article>' . "\n"
        . '    <aside class="rada-aside"><div class="rada-cta"><strong>Potřebujete znát příčinu vlhkosti u vás?</strong><p>Průzkum odhalí, odkud voda přichází, a navrhne řešení, které vydrží.</p><a class="btn btn-primary" href="kontakt.html#poptavka">Objednat průzkum <span>→</span></a><a class="rada-cta-link" href="ukazka-pruzkumu.html">Jak vypadá průzkum →</a></div><nav class="rada-sluzby" aria-label="Související služby"><strong>Související služby</strong><ul>' . $odkazy . '</ul></nav></aside>' . "\n"
        . '  </div></section>' . "\n"
        . '  <section class="page-section alt"><div class="container"><div class="section-heading"><h2>Související články</h2><p><a href="pomoc-a-rady.html">Všechny rady a články →</a></p></div><div class="rada-mini-grid">' . $karty . '</div></div></section>' . "\n"
        . '</main></div>' . skripty() . "</body></html>\n";
}

function vykresliRozcestnik(array $clanky): string {
    $vid = array_values(array_filter($clanky, fn($c) => empty($c['skryty'])));
    $foto = fn(string $src, string $popis, bool $lazy = true) => '<div class="mg-photo "><img ' . ($lazy ? 'loading="lazy" decoding="async" ' : 'fetchpriority="high" ') . ltrim(srcset($src)) . ' src="' . e($src) . '" alt="' . e($popis) . '" onerror="this.remove()"><span>Fotka: ' . e($popis) . '</span></div>';
    $karta = function (array $c, string $typ) use ($foto) {
        $perex = in_array($typ, ['velka', 'bok'], true) ? '<p>' . e(perex($c)) . '</p>' : '';
        return '<a class="mg-card mg-' . $typ . '" href="rada-' . e($c['slug']) . '.html" data-kat="' . e($c['kategorie']) . '">' . $foto(fotoClanku($c), $c['nazev'])
            . '<div class="mg-body"><span class="mg-meta">' . e($c['kategorie']) . ' · ' . minutCteni($c) . ' min</span><h3>' . e($c['nazev']) . '</h3>' . $perex . '<span class="mg-more">Číst článek <i>→</i></span></div></a>';
    };
    $velka = $vid[0] ?? null; $boky = array_slice($vid, 1, 2); $zbytek = array_slice($vid, 3);
    $mozaika = ($velka ? '<div class="mg-top">' . $karta($velka, 'velka') . '<div class="mg-side">' . implode('', array_map(fn($c) => $karta($c, 'bok'), $boky)) . '</div></div>' : '')
        . '<div class="mg-grid">' . implode('', array_map(fn($c) => $karta($c, 'mala'), $zbytek)) . '</div>';
    $pocet = count($vid);
    $tit = 'Rady o vlhkosti zdiva, plísních a sanaci sklepů';
    $pop = 'Praktické články z praxe: jak poznat příčinu vlhkosti, co dělat s plísní, jak správně větrat a jaké metody odvlhčení zdiva a hydroizolace existují.';
    $graf = [['@type' => 'BreadcrumbList', 'itemListElement' => [['@type' => 'ListItem', 'position' => 1, 'name' => 'Úvod', 'item' => DOMENA], ['@type' => 'ListItem', 'position' => 2, 'name' => 'Pomoc a rady', 'item' => DOMENA . 'pomoc-a-rady.html']]],
        ['@type' => 'CollectionPage', 'name' => 'Pomoc a rady', 'url' => DOMENA . 'pomoc-a-rady.html', 'hasPart' => array_map(fn($c) => ['@type' => 'Article', 'headline' => $c['nazev'], 'url' => DOMENA . 'rada-' . $c['slug'] . '.html'], $vid)]];
    $h = fn(string $src, string $popis, string $cls, bool $lazy = true) => '<div class="mx-ph ' . $cls . '">' . $foto($src, $popis, $lazy) . '</div>';
    return "<!doctype html>\n" . hlavaStranky($tit, $pop, seoBlok(DOMENA . 'pomoc-a-rady.html', $tit, $pop, DOMENA . 'assets/bannery/pomoc-a-rady-1.jpg', 'website', $graf)) . "\n"
        . '<body class="subpage mg-page" data-current="rady"><!--GENEROVANO-ADMINEM--><div id="site-shell" class="site-shell"><main>' . "\n"
        . '  <section class="mx-hero">' . "\n    "
        . $h('assets/bannery/pomoc-a-rady-3.jpg', 'detail poškozené omítky', 'mx-strip', false) . "\n    "
        . $h('assets/bannery/rada-problem-se-zasolenim-ve-stenach-jak-vznika.jpg', 'cihlová zeď se solemi', 'mx-right') . "\n    "
        . $h('assets/bannery/pomoc-a-rady-2.jpg', 'měření vlhkosti zdiva', 'mx-top') . "\n    "
        . $h('assets/bannery/rada-sanacni-omitky-a-jejich-aplikace.jpg', 'omítka na zdi', 'mx-corner') . "\n    "
        . $h('assets/bannery/pomoc-a-rady-1.jpg', 'vlhká cihlová zeď se solnými výkvěty', 'mx-bottom') . "\n    "
        . $h('assets/bannery/rada-jak-ucinne-bojovat-s-domovni-vlhkosti-a.jpg', 'vlhkost a plíseň na omítce', 'mx-tilt') . "\n"
        . '    <a class="mx-card" href="reference.html"><span>Skutečné příklady z praxe, které vám poradí.</span><i>→</i></a>' . "\n"
        . '    <div class="container mx-copy"><div class="page-kicker">POMOC A RADY</div><h1>Rady a články<br>o vlhkosti staveb</h1><p class="page-lead">Jak poznat, odkud se bere vlhkost, co dělat s plísní, jak správně větrat a jaké sanační technologie existují. Sepsáno z praxe, srozumitelně.</p><div class="page-hero-actions"><a class="btn btn-primary" href="kontakt.html#poptavka">Objednat průzkum <span>→</span></a><a class="btn btn-outline" href="otazky-a-odpovedi.html">Otázky a odpovědi</a></div></div>' . "\n"
        . '  </section>' . "\n"
        . '  <section class="page-section mg-list"><div class="container"><div class="mg-head"><h2>Všechny články</h2><p><b id="mg-count">' . $pocet . '</b> článků z praxe</p></div>' . $mozaika . '<p class="mg-empty" hidden>V tomto tématu zatím není žádný článek.</p></div></section>' . "\n"
        . '  <section class="mg-cta"><div class="container"><div><h2>Nejste si jistí, odkud se bere vlhkost?</h2><p>Nejdříve zjistíme příčinu. Teprve potom má smysl řešit sanaci.</p></div><div class="mg-cta-btns"><a class="btn btn-primary" href="kontakt.html#poptavka">Objednat průzkum <span>→</span></a><a class="btn btn-outline" href="otazky-a-odpovedi.html">Otázky a odpovědi</a></div></div></section>' . "\n"
        . '</main></div>' . skripty() . "</body></html>\n";
}

/* ---------- reference ---------- */
function vykresliReference(array $ref): array {
    $alba = [];
    $sekceHtml = [];
    foreach (SEKCE_REFERENCI as $kod => $nazev) $sekceHtml[$kod] = '';
    foreach ($ref as $r) {
        if (!empty($r['skryty']) || !isset($sekceHtml[$r['sekce']])) continue;
        $alba[$r['id']] = ['title' => $r['nazev'], 'images' => array_values($r['fotky'])];
        $sekceHtml[$r['sekce']] .= '<article class="reference-card" data-album="' . e($r['id']) . '"><h3>' . e($r['nazev']) . '</h3>' . ($r['popis'] !== '' ? '<p class="reference-card-description">' . e($r['popis']) . '</p>' : '') . '</article>';
    }
    return [$sekceHtml, $alba];
}
function publikujReference(): array {
    $ref = nacti('reference')['reference'] ?? [];
    [$sekce, $alba] = vykresliReference($ref);
    $f = WEB . '/reference.html';
    $s = (string)file_get_contents($f);
    foreach ($sekce as $kod => $html) {
        $s = preg_replace('~(<!--REF:' . $kod . '-->).*?(<!--/REF:' . $kod . '-->)~s', '$1' . str_replace(['\\', '$'], ['\\\\', '\$'], $html) . '$2', $s, 1, $pocet) ?? $s;
        if (!$pocet) throw new RuntimeException("V reference.html chybí značka REF:$kod");
    }
    file_put_contents($f, $s, LOCK_EX);
    $j = json_encode($alba, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    file_put_contents(WEB . '/reference-albums.json', $j, LOCK_EX);
    file_put_contents(WEB . '/reference-albums.js', "/* Vygenerováno administrací z _soukrome/data/reference.json */\nwindow.REFERENCE_ALBUMS=" . json_encode($alba, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n", LOCK_EX);
    return ['referenci' => count($alba)];
}

/* ---------- zveřejnění ---------- */
function publikujClanky(): array {
    $clanky = nacti('clanky')['clanky'] ?? [];
    $vid = array_filter($clanky, fn($c) => empty($c['skryty']));
    foreach ($clanky as $c) {
        $f = WEB . '/rada-' . $c['slug'] . '.html';
        if (!empty($c['skryty'])) { if (is_file($f)) @unlink($f); continue; }
        file_put_contents($f, vykresliClanek($c, $clanky), LOCK_EX);
    }
    // smazat stránky článků, které už v datech nejsou
    $platne = array_map(fn($c) => 'rada-' . $c['slug'] . '.html', $vid);
    foreach (glob(WEB . '/rada-*.html') ?: [] as $f) if (!in_array(basename($f), $platne, true)) @unlink($f);
    file_put_contents(WEB . '/pomoc-a-rady.html', vykresliRozcestnik($clanky), LOCK_EX);
    mapaWebu($vid);
    return ['clanku' => count($vid)];
}
function mapaWebu(array $clanky): void {
    $vynechat = ['admin.html', 'sluzby.html', 'jak-to-probiha.html', '404.html'];
    $url = [];
    foreach (glob(WEB . '/*.html') ?: [] as $f) {
        $b = basename($f);
        if (in_array($b, $vynechat, true) || str_starts_with($b, 'navrhy')) continue;
        $pri = $b === 'index.html' ? '1.0' : (str_starts_with($b, 'rada-') || $b === 'cookies.html' || str_starts_with($b, 'zasady') ? '0.6' : '0.8');
        $url[] = '  <url><loc>' . ($b === 'index.html' ? DOMENA : DOMENA . $b) . '</loc><lastmod>' . date('Y-m-d', filemtime($f)) . '</lastmod><priority>' . $pri . '</priority></url>';
    }
    sort($url);
    file_put_contents(WEB . '/sitemap.xml', "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" . implode("\n", $url) . "\n</urlset>\n", LOCK_EX);
    $llms = WEB . '/llms.txt';
    if (is_file($llms)) {
        $s = (string)file_get_contents($llms);
        $zac = strpos($s, '## Odborné články');
        if ($zac !== false) {
            $s = substr($s, 0, $zac) . "## Odborné články (Pomoc a rady)\n" . implode("\n", array_map(fn($c) => '- [' . ($c['seo_titulek'] ?: $c['nazev']) . '](' . DOMENA . 'rada-' . $c['slug'] . '.html): ' . ($c['seo_popis'] ?: perex($c)), $clanky)) . "\n";
            file_put_contents($llms, $s, LOCK_EX);
        }
    }
}

/* ---------- dvoufázové ověření (TOTP, RFC 6238 – Google Authenticator, Microsoft Authenticator…) ---------- */
function base32Dekoduj(string $b32): string {
    $abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $b32 = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $b32) ?? '');
    $bity = ''; foreach (str_split($b32) as $z) $bity .= str_pad(decbin((int)strpos($abc, $z)), 5, '0', STR_PAD_LEFT);
    $out = ''; foreach (str_split($bity, 8) as $b) if (strlen($b) === 8) $out .= chr(bindec($b));
    return $out;
}
function totpKod(string $tajemstvi, int $krok): string {
    $h = hash_hmac('sha1', pack('N*', 0) . pack('N*', $krok), base32Dekoduj($tajemstvi), true);
    $o = ord($h[19]) & 0xf;
    $c = ((ord($h[$o]) & 0x7f) << 24) | (ord($h[$o + 1]) << 16) | (ord($h[$o + 2]) << 8) | ord($h[$o + 3]);
    return str_pad((string)($c % 1000000), 6, '0', STR_PAD_LEFT);
}
function totpOver(string $tajemstvi, string $kod): bool {
    $kod = preg_replace('/\D/', '', $kod) ?? '';
    if (strlen($kod) !== 6) return false;
    $t = intdiv(time(), 30);
    foreach ([-1, 0, 1] as $d) if (hash_equals(totpKod($tajemstvi, $t + $d), $kod)) return true;
    return false;
}
