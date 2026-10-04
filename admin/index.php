<?php
/* Administrace webu lukaspecenka.cz – články (Pomoc a rady) a reference.
   Bezpečnost: heslo jen jako otisk, omezení pokusů, session jen přes HTTPS, ochrana CSRF, čištění HTML, přepracování fotek. */
declare(strict_types=1);
require __DIR__ . '/jadro.php';

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('lp_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => dirname($_SERVER['SCRIPT_NAME']) . '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

const NECINNOST = 1800;          // odhlášení po 30 min nečinnosti
const POKUSU = 5;                 // max. chybných přihlášení za 15 min z jedné adresy

$nastaveni = is_file(WEB . '/_soukrome/nastaveni.php') ? require WEB . '/_soukrome/nastaveni.php' : null;

function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32)); return $_SESSION['csrf']; }
function overCsrf(): void { if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Platnost formuláře vypršela. Vraťte se zpět a zkuste to znovu.'); } }
function presmeruj(string $kam, string $zprava = ''): never { if ($zprava) $_SESSION['zprava'] = $zprava; header('Location: ?' . $kam); exit; }
function prihlasen(): bool { return !empty($_SESSION['prihlasen']) && (time() - ($_SESSION['aktivita'] ?? 0)) < NECINNOST; }
function soubPokusu(): string { $d = WEB . '/_soukrome/limit'; if (!is_dir($d)) mkdir($d, 0700, true); return $d . '/login-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'lp-admin'); }

$akce = $_GET['a'] ?? 'clanky';

/* ---------- přihlášení / odhlášení ---------- */
if ($akce === 'odhlasit') { $_SESSION = []; session_destroy(); header('Location: ./'); exit; }
if (!prihlasen()) {
    $chyba = '';
    if (!$nastaveni) $chyba = 'Administrace zatím nemá nastavené heslo (viz PROJEKT/SPUSTENI.md).';
    elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        overCsrf();
        $f = soubPokusu();
        $p = is_file($f) ? json_decode((string)file_get_contents($f), true) : ['n' => 0, 't' => time()];
        if (time() - $p['t'] > 900) $p = ['n' => 0, 't' => time()];
        if ($p['n'] >= POKUSU) $chyba = 'Příliš mnoho pokusů. Zkuste to znovu za 15 minut.';
        elseif (password_verify((string)($_POST['heslo'] ?? ''), $nastaveni['heslo_hash']) && (empty($nastaveni['totp']) || totpOver($nastaveni['totp'], (string)($_POST['kod'] ?? '')))) {
            @unlink($f);
            session_regenerate_id(true);
            $_SESSION['prihlasen'] = true; $_SESSION['aktivita'] = time();
            header('Location: ./'); exit;
        } else {
            $p['n']++; file_put_contents($f, json_encode($p)); usleep(800000);
            $chyba = empty($nastaveni['totp']) ? 'Nesprávné heslo.' : 'Nesprávné heslo nebo kód.';
        }
    }
    stranka('Přihlášení', '<form method="post" class="prihlaseni"><h1>Správa webu</h1><p>Lukáš Pečenka – sanační průzkumy</p>'
        . ($chyba ? '<p class="chyba">' . e($chyba) . '</p>' : '')
        . '<input type="hidden" name="csrf" value="' . csrf() . '"><label>Heslo<input type="password" name="heslo" autocomplete="current-password" required autofocus></label>'
        . (!empty($nastaveni['totp']) ? '<label>Kód z aplikace (6 číslic)<input name="kod" inputmode="numeric" pattern="[0-9 ]{6,7}" autocomplete="one-time-code" required></label>' : '')
        . '<button class="btn">Přihlásit se</button></form>', false);
    exit;
}
$_SESSION['aktivita'] = time();

/* ---------- akce (POST) ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    overCsrf();
    $co = $_POST['akce'] ?? '';
    $data = nacti('clanky'); $clanky = $data['clanky'] ?? [];
    $ref = nacti('reference')['reference'] ?? [];
    $najdi = fn(array $seznam, string $klic, string $hodnota) => array_search($hodnota, array_column($seznam, $klic), true);

    if ($co === 'clanek-ulozit' || $co === 'clanek-nahled') {
        $slugPuv = (string)($_POST['slug'] ?? '');
        $i = $slugPuv !== '' ? $najdi($clanky, 'slug', $slugPuv) : false;
        $nazev = trim((string)($_POST['nazev'] ?? ''));
        if (mb_strlen($nazev) < 5) presmeruj('a=clanek&slug=' . urlencode($slugPuv), 'Vyplňte název článku (aspoň 5 znaků).');
        $c = $i !== false ? $clanky[$i] : ['slug' => '', 'vydano' => date('Y-m-d'), 'skryty' => false, 'foto' => ''];
        if ($c['slug'] === '') {           // nová adresa – jednou při vzniku, pak se nemění (kvůli Googlu)
            $s = slug($nazev); $z = $s; $n = 2;
            while ($najdi($clanky, 'slug', $z) !== false || is_file(WEB . "/rada-$z.html")) $z = $s . '-' . $n++;
            $c['slug'] = $z;
        }
        $kat = trim((string)($_POST['kategorie_nova'] ?? '')) ?: trim((string)($_POST['kategorie'] ?? 'Rady'));
        $c['nazev'] = $nazev;
        $c['kategorie'] = mb_substr($kat, 0, 30);
        $c['uvod'] = e(trim((string)($_POST['uvod'] ?? '')));
        $c['telo'] = vycisti((string)($_POST['telo'] ?? ''));
        $c['seo_titulek'] = mb_substr(trim((string)($_POST['seo_titulek'] ?? '')), 0, 70);
        $c['seo_popis'] = mb_substr(trim((string)($_POST['seo_popis'] ?? '')), 0, 180);
        $c['upraveno'] = date('Y-m-d');
        if ($co === 'clanek-nahled') {
            $vsechny = $clanky; if ($i !== false) $vsechny[$i] = $c; else $vsechny[] = $c;
            echo str_replace('<head>', '<head><base href="../"><meta name="robots" content="noindex">', vykresliClanek($c, $vsechny));
            echo '<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#111820;color:#fff;text-align:center;padding:8px;font:14px sans-serif">NÁHLED – článek zatím není uložený</div>';
            exit;
        }
        if (!empty($_FILES['foto']['tmp_name']) && is_uploaded_file($_FILES['foto']['tmp_name'])) {
            if ($_FILES['foto']['size'] > 15 * 1024 * 1024) presmeruj('a=clanek&slug=' . urlencode($c['slug']), 'Fotka je příliš velká (max. 15 MB).');
            $cesta = zpracujFoto($_FILES['foto']['tmp_name'], WEB . '/assets/bannery/rada-' . $c['slug']);
            if (!$cesta) presmeruj('a=clanek&slug=' . urlencode($c['slug']), 'Fotku se nepodařilo zpracovat. Použijte JPG, PNG nebo WebP.');
            $c['foto'] = 'assets/bannery/rada-' . $c['slug'] . '.jpg';
        }
        if ($c['telo'] === '') presmeruj('a=clanek&slug=' . urlencode($c['slug']), 'Článek nemá žádný text.');
        if ($i !== false) $clanky[$i] = $c; else array_unshift($clanky, $c);
        uloz('clanky', ['clanky' => $clanky]); publikujClanky();
        presmeruj('a=clanky', 'Článek „' . $nazev . '“ je uložený a zveřejněný.');
    }
    if (in_array($co, ['clanek-skryt', 'clanek-smazat', 'clanek-nahoru', 'clanek-dolu'], true)) {
        $i = $najdi($clanky, 'slug', (string)($_POST['slug'] ?? ''));
        if ($i === false) presmeruj('a=clanky', 'Článek nenalezen.');
        if ($co === 'clanek-skryt') $clanky[$i]['skryty'] = empty($clanky[$i]['skryty']);
        if ($co === 'clanek-smazat') { array_splice($clanky, $i, 1); }
        if ($co === 'clanek-nahoru' && $i > 0) [$clanky[$i - 1], $clanky[$i]] = [$clanky[$i], $clanky[$i - 1]];
        if ($co === 'clanek-dolu' && $i < count($clanky) - 1) [$clanky[$i + 1], $clanky[$i]] = [$clanky[$i], $clanky[$i + 1]];
        uloz('clanky', ['clanky' => $clanky]); publikujClanky();
        presmeruj('a=clanky', $co === 'clanek-smazat' ? 'Článek smazán (lze obnovit v Zálohách).' : 'Uloženo.');
    }
    if ($co === 'ref-ulozit') {
        $idPuv = (string)($_POST['id'] ?? '');
        $i = $idPuv !== '' ? $najdi($ref, 'id', $idPuv) : false;
        $nazev = trim((string)($_POST['nazev'] ?? ''));
        if (mb_strlen($nazev) < 3) presmeruj('a=reference-upravit&id=' . urlencode($idPuv), 'Vyplňte název reference.');
        $r = $i !== false ? $ref[$i] : ['id' => '', 'fotky' => [], 'skryty' => false];
        if ($r['id'] === '') { $s = slug($nazev); $z = $s; $n = 2; while ($najdi($ref, 'id', $z) !== false) $z = $s . '-' . $n++; $r['id'] = $z; }
        $r['nazev'] = mb_substr($nazev, 0, 120);
        $r['sekce'] = array_key_exists($_POST['sekce'] ?? '', SEKCE_REFERENCI) ? $_POST['sekce'] : 'aktualni';
        $r['popis'] = mb_substr(trim((string)($_POST['popis'] ?? '')), 0, 600);
        // pořadí a mazání stávajících fotek
        $poradi = array_values(array_filter((array)($_POST['fotky'] ?? []), fn($f) => in_array($f, $r['fotky'], true)));
        foreach (array_diff($r['fotky'], $poradi) as $smaz) if (str_starts_with($smaz, 'assets/reference-albums/')) smazFoto($smaz);
        $r['fotky'] = $poradi;
        // nové fotky
        if (!empty($_FILES['nove']['tmp_name']) && is_array($_FILES['nove']['tmp_name'])) {
            $cil = WEB . '/assets/reference-albums/' . $r['id'];
            foreach ($_FILES['nove']['tmp_name'] as $k => $tmp) {
                if (!$tmp || !is_uploaded_file($tmp) || $_FILES['nove']['size'][$k] > 15 * 1024 * 1024) continue;
                $jmeno = 'foto-' . date('YmdHis') . '-' . $k . '-' . bin2hex(random_bytes(3));
                if (zpracujFoto($tmp, $cil . '/' . $jmeno)) $r['fotky'][] = 'assets/reference-albums/' . $r['id'] . '/' . $jmeno . '.jpg';
            }
        }
        if ($i !== false) $ref[$i] = $r; else array_unshift($ref, $r);
        uloz('reference', ['reference' => $ref]); publikujReference();
        presmeruj('a=reference', 'Reference „' . $nazev . '“ je uložená a zveřejněná.');
    }
    if (in_array($co, ['ref-skryt', 'ref-smazat', 'ref-nahoru', 'ref-dolu'], true)) {
        $i = $najdi($ref, 'id', (string)($_POST['id'] ?? ''));
        if ($i === false) presmeruj('a=reference', 'Reference nenalezena.');
        $sek = $ref[$i]['sekce'];
        $vSekci = array_keys(array_filter($ref, fn($r) => $r['sekce'] === $sek));
        $pos = array_search($i, $vSekci, true);
        if ($co === 'ref-skryt') $ref[$i]['skryty'] = empty($ref[$i]['skryty']);
        if ($co === 'ref-smazat') array_splice($ref, $i, 1);     // fotky zůstávají na disku kvůli možnosti obnovy
        if ($co === 'ref-nahoru' && $pos > 0) { $j = $vSekci[$pos - 1]; [$ref[$j], $ref[$i]] = [$ref[$i], $ref[$j]]; }
        if ($co === 'ref-dolu' && $pos < count($vSekci) - 1) { $j = $vSekci[$pos + 1]; [$ref[$j], $ref[$i]] = [$ref[$i], $ref[$j]]; }
        uloz('reference', ['reference' => $ref]); publikujReference();
        presmeruj('a=reference', $co === 'ref-smazat' ? 'Reference smazána (lze obnovit v Zálohách).' : 'Uloženo.');
    }
    if ($co === 'obnovit') {
        $soubor = basename((string)($_POST['soubor'] ?? ''));
        if (!preg_match('/^(clanky|reference)-\d{8}-\d{6}\.json$/', $soubor) || !is_file(ZALOHY . '/' . $soubor)) presmeruj('a=zalohy', 'Záloha nenalezena.');
        $druh = explode('-', $soubor)[0];
        $obsah = json_decode((string)file_get_contents(ZALOHY . '/' . $soubor), true);
        if (!is_array($obsah)) presmeruj('a=zalohy', 'Záloha je poškozená.');
        uloz($druh, $obsah);
        $druh === 'clanky' ? publikujClanky() : publikujReference();
        presmeruj('a=zalohy', 'Obnovena verze ze ' . preg_replace('/^.*-(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d).*$/', '$3. $2. $1 $4:$5', $soubor) . '.');
    }
    presmeruj('a=clanky');
}

/* ---------- stránky ---------- */
function stranka(string $titulek, string $obsah, bool $menu = true): void {
    $zprava = $_SESSION['zprava'] ?? ''; unset($_SESSION['zprava']);
    $a = $_GET['a'] ?? 'clanky';
    echo '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">'
        . '<title>' . e($titulek) . ' – správa webu</title><link rel="stylesheet" href="admin.css?v=1"></head><body>'
        . ($menu ? '<header class="lista"><strong>Správa webu</strong><nav>'
            . '<a href="?a=clanky"' . (str_starts_with($a, 'clan') ? ' class="on"' : '') . '>Články</a>'
            . '<a href="?a=reference"' . (str_starts_with($a, 'ref') ? ' class="on"' : '') . '>Reference</a>'
            . '<a href="?a=zalohy"' . ($a === 'zalohy' ? ' class="on"' : '') . '>Zálohy</a></nav>'
            . '<span><a href="../" target="_blank" rel="noopener">Zobrazit web ↗</a><a href="?a=odhlasit">Odhlásit</a></span></header>' : '')
        . '<main>' . ($zprava ? '<p class="zprava">' . e($zprava) . '</p>' : '') . $obsah . '</main><script src="admin.js?v=1"></script></body></html>';
}
$tlacitko = fn(string $akce, array $skryte, string $text, string $trida = '', string $potvrzeni = '') =>
    '<form method="post" class="inline"' . ($potvrzeni ? ' data-potvrdit="' . e($potvrzeni) . '"' : '') . '><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="akce" value="' . $akce . '">'
    . implode('', array_map(fn($k, $v) => '<input type="hidden" name="' . e($k) . '" value="' . e($v) . '">', array_keys($skryte), $skryte))
    . '<button class="' . $trida . '">' . $text . '</button></form>';

$clanky = nacti('clanky')['clanky'] ?? [];
$ref = nacti('reference')['reference'] ?? [];

if ($akce === 'clanky') {
    $radky = '';
    foreach ($clanky as $c) {
        $radky .= '<tr' . (!empty($c['skryty']) ? ' class="skryto"' : '') . '><td><strong>' . e($c['nazev']) . '</strong><small>rada-' . e($c['slug']) . '.html</small></td><td>' . e($c['kategorie']) . '</td><td>' . datumCz($c['upraveno']) . '</td>'
            . '<td>' . (!empty($c['skryty']) ? 'skrytý' : '<a href="../rada-' . e($c['slug']) . '.html" target="_blank" rel="noopener">zveřejněn ↗</a>') . '</td><td class="akce">'
            . '<a class="btn maly" href="?a=clanek&slug=' . urlencode($c['slug']) . '">Upravit</a>'
            . $tlacitko('clanek-nahoru', ['slug' => $c['slug']], '↑', 'maly sedy') . $tlacitko('clanek-dolu', ['slug' => $c['slug']], '↓', 'maly sedy')
            . $tlacitko('clanek-skryt', ['slug' => $c['slug']], !empty($c['skryty']) ? 'Zobrazit' : 'Skrýt', 'maly sedy')
            . $tlacitko('clanek-smazat', ['slug' => $c['slug']], 'Smazat', 'maly cerveny', 'Opravdu smazat článek „' . $c['nazev'] . '“? (Půjde obnovit v Zálohách.)') . '</td></tr>';
    }
    stranka('Články', '<div class="hlava"><h1>Články – Pomoc a rady</h1><a class="btn" href="?a=clanek">+ Nový článek</a></div>'
        . '<p class="napoveda">První článek v seznamu je na stránce Pomoc a rady velký, další dva vedle něj. Pořadí změníte šipkami.</p>'
        . '<table><thead><tr><th>Název</th><th>Téma</th><th>Upraveno</th><th>Stav</th><th></th></tr></thead><tbody>' . $radky . '</tbody></table>');
    exit;
}

if ($akce === 'clanek') {
    $slug = (string)($_GET['slug'] ?? '');
    $i = $slug !== '' ? array_search($slug, array_column($clanky, 'slug'), true) : false;
    $c = $i !== false ? $clanky[$i] : ['slug' => '', 'nazev' => '', 'kategorie' => 'Rady', 'uvod' => '', 'telo' => '', 'seo_titulek' => '', 'seo_popis' => '', 'foto' => ''];
    $kategorie = array_values(array_unique(array_merge(array_column($clanky, 'kategorie'), ['Diagnostika', 'Plísně', 'Větrání', 'Průzkum', 'Technologie', 'Sklepy', 'Hydroizolace', 'Injektáže', 'Omítky', 'Vlhkost zdiva', 'Soli ve zdivu'])));
    $volby = implode('', array_map(fn($k) => '<option' . ($k === $c['kategorie'] ? ' selected' : '') . '>' . e($k) . '</option>', $kategorie));
    stranka($c['nazev'] ?: 'Nový článek', '<div class="hlava"><h1>' . ($c['slug'] ? 'Upravit článek' : 'Nový článek') . '</h1><a href="?a=clanky">← Zpět na seznam</a></div>'
        . '<form method="post" enctype="multipart/form-data" class="formular" id="clanek-form"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="slug" value="' . e($c['slug']) . '">'
        . '<label>Název článku *<input name="nazev" value="' . e($c['nazev']) . '" required maxlength="140"></label>'
        . '<div class="dva"><label>Téma<select name="kategorie">' . $volby . '</select></label><label>…nebo nové téma<input name="kategorie_nova" maxlength="30" placeholder="např. Podlahy"></label></div>'
        . '<label>Úvodní odstavec (zobrazí se nahoře vedle fotky)<textarea name="uvod" rows="4" maxlength="700">' . e(holy($c['uvod'])) . '</textarea></label>'
        . '<div class="pole"><span>Text článku *</span><div class="editor-lista" role="toolbar" aria-label="Formátování">'
        . '<button type="button" data-cmd="formatBlock" data-val="h2" title="Nadpis">Nadpis</button><button type="button" data-cmd="formatBlock" data-val="h3" title="Podnadpis">Podnadpis</button>'
        . '<button type="button" data-cmd="formatBlock" data-val="p" title="Běžný text">Text</button><button type="button" data-cmd="bold" title="Tučně"><b>B</b></button><button type="button" data-cmd="italic" title="Kurzíva"><i>I</i></button>'
        . '<button type="button" data-cmd="insertUnorderedList" title="Odrážky">• Odrážky</button><button type="button" data-cmd="insertOrderedList" title="Číslování">1. Číslování</button>'
        . '<button type="button" data-cmd="createLink" title="Odkaz">Odkaz</button><button type="button" data-cmd="removeFormat" title="Zrušit formát">Zrušit formát</button></div>'
        . '<div class="editor" contenteditable="true" data-pro="telo">' . $c['telo'] . '</div><textarea name="telo" hidden>' . e($c['telo']) . '</textarea></div>'
        . '<div class="pole"><span>Úvodní fotka</span>' . ($c['foto'] ? '<img class="nahled-foto" src="../' . e($c['foto']) . '?t=' . time() . '" alt="">' : '') . '<input type="file" name="foto" accept="image/jpeg,image/png,image/webp"><small>JPG/PNG, ideálně na šířku. Web ji sám zmenší a zrychlí.</small></div>'
        . '<fieldset><legend>Pro Google (nepovinné – když nevyplníte, použije se název a úvod)</legend>'
        . '<label>Titulek ve vyhledávání <small data-pocitadlo="60"></small><input name="seo_titulek" value="' . e($c['seo_titulek']) . '" maxlength="70"></label>'
        . '<label>Popis ve vyhledávání <small data-pocitadlo="160"></small><textarea name="seo_popis" rows="2" maxlength="180">' . e($c['seo_popis']) . '</textarea></label></fieldset>'
        . '<div class="tlacitka"><button class="btn" name="akce" value="clanek-ulozit">Uložit a zveřejnit</button><button class="btn sedy" name="akce" value="clanek-nahled" formtarget="_blank">Náhled</button>'
        . ($c['slug'] ? '<span class="adresa">Adresa: lukaspecenka.cz/rada-' . e($c['slug']) . '.html</span>' : '') . '</div></form>');
    exit;
}

if ($akce === 'reference') {
    $out = '<div class="hlava"><h1>Reference</h1><a class="btn" href="?a=reference-upravit">+ Nová reference</a></div><p class="napoveda">Úvodní fotka karty je vždy první fotka alba. Pořadí v sekci měníte šipkami.</p>';
    foreach (SEKCE_REFERENCI as $kod => $nazev) {
        $out .= '<h2>' . e($nazev) . '</h2><div class="karty">';
        foreach ($ref as $r) {
            if ($r['sekce'] !== $kod) continue;
            $out .= '<div class="karta' . (!empty($r['skryty']) ? ' skryto' : '') . '">' . ($r['fotky'] ? '<img src="../' . e($r['fotky'][0]) . '" alt="" loading="lazy">' : '<div class="bez-foto">bez fotky</div>')
                . '<div><strong>' . e($r['nazev']) . '</strong><small>' . count($r['fotky']) . ' fotek' . (!empty($r['skryty']) ? ' · skrytá' : '') . '</small></div><div class="akce">'
                . '<a class="btn maly" href="?a=reference-upravit&id=' . urlencode($r['id']) . '">Upravit</a>'
                . $tlacitko('ref-nahoru', ['id' => $r['id']], '↑', 'maly sedy') . $tlacitko('ref-dolu', ['id' => $r['id']], '↓', 'maly sedy')
                . $tlacitko('ref-skryt', ['id' => $r['id']], !empty($r['skryty']) ? 'Zobrazit' : 'Skrýt', 'maly sedy')
                . $tlacitko('ref-smazat', ['id' => $r['id']], 'Smazat', 'maly cerveny', 'Opravdu smazat referenci „' . $r['nazev'] . '“?') . '</div></div>';
        }
        $out .= '</div>';
    }
    stranka('Reference', $out); exit;
}

if ($akce === 'reference-upravit') {
    $id = (string)($_GET['id'] ?? '');
    $i = $id !== '' ? array_search($id, array_column($ref, 'id'), true) : false;
    $r = $i !== false ? $ref[$i] : ['id' => '', 'nazev' => '', 'sekce' => 'aktualni', 'popis' => '', 'fotky' => []];
    $sekce = implode('', array_map(fn($k, $v) => '<option value="' . $k . '"' . ($k === $r['sekce'] ? ' selected' : '') . '>' . e($v) . '</option>', array_keys(SEKCE_REFERENCI), SEKCE_REFERENCI));
    $fotky = implode('', array_map(fn($f) => '<li draggable="true"><img src="../' . e($f) . '" alt=""><input type="hidden" name="fotky[]" value="' . e($f) . '"><button type="button" class="odebrat" title="Odebrat fotku">×</button><span class="posun"><button type="button" data-posun="-1">←</button><button type="button" data-posun="1">→</button></span></li>', $r['fotky']));
    stranka($r['nazev'] ?: 'Nová reference', '<div class="hlava"><h1>' . ($r['id'] ? 'Upravit referenci' : 'Nová reference') . '</h1><a href="?a=reference">← Zpět</a></div>'
        . '<form method="post" enctype="multipart/form-data" class="formular"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="akce" value="ref-ulozit"><input type="hidden" name="id" value="' . e($r['id']) . '">'
        . '<label>Název *<input name="nazev" value="' . e($r['nazev']) . '" required maxlength="120"></label>'
        . '<label>Sekce na stránce Reference<select name="sekce">' . $sekce . '</select></label>'
        . '<label>Krátký popis (nepovinné)<textarea name="popis" rows="3" maxlength="600">' . e($r['popis']) . '</textarea></label>'
        . '<div class="pole"><span>Fotky (první = úvodní fotka karty, pořadí šipkami nebo přetažením)</span><ul class="fotky">' . $fotky . '</ul>'
        . '<input type="file" name="nove[]" multiple accept="image/jpeg,image/png,image/webp"><small>Můžete vybrat víc fotek najednou. Web je sám zmenší.</small></div>'
        . '<div class="tlacitka"><button class="btn">Uložit a zveřejnit</button></div></form>');
    exit;
}

if ($akce === 'zalohy') {
    $sez = glob(ZALOHY . '/*.json') ?: []; rsort($sez);
    $radky = '';
    foreach (array_slice($sez, 0, 40) as $f) {
        $b = basename($f);
        preg_match('/^(clanky|reference)-(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)/', $b, $m);
        if (!$m) continue;
        $radky .= '<tr><td>' . ($m[1] === 'clanky' ? 'Články' : 'Reference') . '</td><td>' . (int)$m[4] . '. ' . (int)$m[3] . '. ' . $m[2] . ' ' . $m[5] . ':' . $m[6] . '</td><td>'
            . $tlacitko('obnovit', ['soubor' => $b], 'Obnovit tuto verzi', 'maly sedy', 'Vrátit ' . ($m[1] === 'clanky' ? 'články' : 'reference') . ' do stavu před touto změnou?') . '</td></tr>';
    }
    stranka('Zálohy', '<div class="hlava"><h1>Zálohy a historie změn</h1></div><p class="napoveda">Před každou změnou se uloží předchozí stav. Pokud se něco pokazí, vraťte se k němu tlačítkem Obnovit.</p>'
        . ($radky ? '<table><thead><tr><th>Co</th><th>Stav před změnou z</th><th></th></tr></thead><tbody>' . $radky . '</tbody></table>' : '<p>Zatím žádné zálohy – vzniknou s první změnou.</p>'));
    exit;
}
presmeruj('a=clanky');
