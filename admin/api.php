<?php
/* Správa přímo na webu (lišta po přihlášení přes ikonu v patičce).
   GET  ?stav                      → {prihlasen, csrf}
   POST akce=texty (JSON)          → uloží upravené texty jedné stránky (záloha předchozí verze v _soukrome/zalohy/stranky)
   Bezpečnost: stejné přihlášení (session) jako /admin/, CSRF v hlavičce, kontrola Origin, jen povolené stránky, čištění HTML. */
declare(strict_types=1);
require __DIR__ . '/jadro.php';

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('lp_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => dirname($_SERVER['SCRIPT_NAME']) . '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

const NECINNOST_API = 1800;
function odpoved(array $data, int $kod = 200): never { http_response_code($kod); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
$prihlasen = !empty($_SESSION['prihlasen']) && (time() - ($_SESSION['aktivita'] ?? 0)) < NECINNOST_API;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    if (!$prihlasen) odpoved(['prihlasen' => false]);
    $_SESSION['aktivita'] = time();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    odpoved(['prihlasen' => true, 'csrf' => $_SESSION['csrf']]);
}

/* ---------- POST ---------- */
if (!$prihlasen) odpoved(['chyba' => 'Nejste přihlášen(a). Klikněte znovu na ikonu v patičce.'], 401);
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$hostBezPortu = fn(string $h) => strtolower(preg_replace('/:\d+$/', '', $h));
if ($origin === '' || $hostBezPortu((string)parse_url($origin, PHP_URL_HOST)) !== $hostBezPortu((string)($_SERVER['HTTP_HOST'] ?? ''))) odpoved(['chyba' => 'Neplatný původ požadavku.'], 403);
if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) odpoved(['chyba' => 'Platnost přihlášení vypršela. Obnovte stránku.'], 400);
$_SESSION['aktivita'] = time();

$vstup = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($vstup) || ($vstup['akce'] ?? '') !== 'texty') odpoved(['chyba' => 'Neznámá akce.'], 400);

$stranka = basename((string)($vstup['stranka'] ?? ''));
/* Generované stránky (články, rozcestník) se upravují přes formulář článku – jinak by je příští zveřejnění přepsalo. */
if (!preg_match('/^[a-z0-9-]+\.html$/', $stranka) || str_starts_with($stranka, 'rada-') || in_array($stranka, ['pomoc-a-rady.html', '404.html'], true) || !is_file(WEB . '/' . $stranka)) {
    odpoved(['chyba' => 'Tuto stránku nelze upravovat tímto způsobem.'], 400);
}
$zmeny = $vstup['zmeny'] ?? [];
if (!is_array($zmeny) || !$zmeny || count($zmeny) > 300) odpoved(['chyba' => 'Žádné změny k uložení.'], 400);

function cistyText(string $html): string {
    $html = strip_tags($html, '<br><b><strong><i><em>');
    $html = preg_replace('~<(br|b|strong|i|em)\b[^>]*>~i', '<$1>', $html);
    $html = preg_replace('~</(b|strong|i|em)\s*>~i', '</$1>', $html);
    return trim(str_replace(["\r", "\n"], ' ', $html));
}

$soubor = WEB . '/' . $stranka;
$obsah = (string)file_get_contents($soubor);
$puvodniObsah = $obsah;
$hotovo = 0; $nenalezeno = [];
foreach ($zmeny as $z) {
    $tag = strtolower((string)($z['tag'] ?? ''));
    $stare = (string)($z['puvodni'] ?? '');
    $nove = cistyText((string)($z['nova'] ?? ''));
    if (!preg_match('/^(h1|h2|h3|h4|p|li|span|strong|small|div|figcaption|b|dd|dt|td|th|blockquote)$/', $tag) || $stare === '' || $nove === '') { $nenalezeno[] = mb_substr(strip_tags($stare), 0, 60); continue; }
    // původní obsah prvku musí být v souboru přesně jednou: >…</tag>
    $hledej = '>' . $stare . '</' . $tag . '>';
    $pocet = substr_count($obsah, $hledej);
    if ($pocet !== 1) { $nenalezeno[] = mb_substr(strip_tags($stare), 0, 60); continue; }
    $obsah = str_replace($hledej, '>' . $nove . '</' . $tag . '>', $obsah);
    $hotovo++;
}
if ($hotovo === 0) odpoved(['chyba' => 'Změny se nepodařilo spárovat se stránkou – nic se neuložilo.', 'nenalezeno' => $nenalezeno], 409);

$adr = ZALOHY . '/stranky';
if (!is_dir($adr)) mkdir($adr, 0700, true);
file_put_contents($adr . '/' . basename($stranka, '.html') . '-' . date('Ymd-His') . '.html', $puvodniObsah);
file_put_contents($soubor, $obsah, LOCK_EX);
odpoved(['ok' => true, 'ulozeno' => $hotovo, 'nenalezeno' => $nenalezeno]);
