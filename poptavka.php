<?php
/* Příjem poptávky z formuláře na lukaspecenka.cz (WEDOS, PHP 8.1+).
   - kontrola údajů na serveru, ochrana proti spamu (skryté pole, časová kontrola, limit na IP)
   - fotky jako přílohy (kontrola typu i velikosti), e-mail na PRIJEMCE
   - nic se neukládá do databáze; jen dočasný počítač pokusů v _soukrome/limit (bez IP v čitelné podobě) */
declare(strict_types=1);
date_default_timezone_set('Europe/Prague');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const PRIJEMCE = 'info@lukaspecenka.cz';
const ODESILATEL = 'info@lukaspecenka.cz';         // schránka na stejné doméně (WEDOS to vyžaduje) – zakládá Pečenka
const MAX_FOTEK = 8;
const MAX_FOTKA = 8 * 1024 * 1024;                  // 8 MB na soubor
const MAX_CELKEM = 20 * 1024 * 1024;                // 20 MB celkem
const LIMIT_ZA_HODINU = 5;
const POVOLENE = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/heic' => 'heic', 'image/heif' => 'heif', 'application/pdf' => 'pdf'];

function konec(int $kod, array $data): never { http_response_code($kod); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function pole(string $k, int $max): string {
    $v = trim((string)($_POST[$k] ?? ''));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function jedenRadek(string $v): string { return trim(preg_replace('/[\r\n]+/', ' ', $v) ?? ''); }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') konec(405, ['ok' => false, 'chyba' => 'Pouze POST.']);

// požadavek musí přijít z tohoto webu
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')) ?? '');
if ($origin !== '' && strtolower((string)parse_url($origin, PHP_URL_HOST)) !== $host) konec(403, ['ok' => false, 'chyba' => 'Neplatný původ požadavku.']);

// spam: skryté pole musí zůstat prázdné, formulář nesmí být odeslán dřív než za 3 s po načtení
if (pole('web', 200) !== '') konec(200, ['ok' => true]);   // robotovi tváříme úspěch
$t = (int)($_POST['t'] ?? 0);
if ($t > 0 && (time() - intdiv($t, 1000)) < 3) konec(400, ['ok' => false, 'chyba' => 'Formulář byl odeslán příliš rychle, zkuste to prosím znovu.']);

// limit pokusů na IP (uloženo jen jako hash)
$adr = __DIR__ . '/_soukrome/limit';
if (!is_dir($adr)) @mkdir($adr, 0700, true);
$soubor = $adr . '/' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H') . 'lp');
$pocet = is_file($soubor) ? (int)file_get_contents($soubor) : 0;
if ($pocet >= LIMIT_ZA_HODINU) konec(429, ['ok' => false, 'chyba' => 'Odeslali jste příliš mnoho zpráv. Zkuste to prosím později nebo zavolejte.']);
@file_put_contents($soubor, (string)($pocet + 1), LOCK_EX);
foreach (glob($adr . '/*') ?: [] as $f) if (filemtime($f) < time() - 7200) @unlink($f);

// údaje
$jmeno = jedenRadek(pole('name', 120));
$telefon = jedenRadek(pole('phone', 40));
$email = jedenRadek(pole('email', 160));
$lokalita = jedenRadek(pole('location', 160));
$rok = jedenRadek(pole('year', 20));
$zdivo = jedenRadek(pole('construction', 160));
$kde = jedenRadek(pole('where', 200));
$zprava = pole('message', 5000);
$zdroj = jedenRadek(pole('zdroj', 400));

$chyby = [];
if (mb_strlen($jmeno) < 2) $chyby[] = 'name';
if (!preg_match('/^[+0-9 ()\/-]{9,20}$/', $telefon)) $chyby[] = 'phone';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $chyby[] = 'email';
if ($chyby) konec(422, ['ok' => false, 'chyba' => 'Zkontrolujte prosím zvýrazněné údaje.', 'pole' => $chyby]);

// přílohy
$prilohy = []; $celkem = 0;
if (!empty($_FILES['fotky']['name']) && is_array($_FILES['fotky']['name'])) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    foreach ($_FILES['fotky']['name'] as $i => $nazev) {
        if (($_FILES['fotky']['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
        if ($_FILES['fotky']['error'][$i] !== UPLOAD_ERR_OK) konec(422, ['ok' => false, 'chyba' => 'Fotku se nepodařilo nahrát (možná je příliš velká).']);
        if (count($prilohy) >= MAX_FOTEK) konec(422, ['ok' => false, 'chyba' => 'Přiložte nejvýše ' . MAX_FOTEK . ' fotografií.']);
        $tmp = $_FILES['fotky']['tmp_name'][$i];
        if (!is_uploaded_file($tmp)) continue;
        $vel = filesize($tmp); $celkem += $vel;
        if ($vel > MAX_FOTKA || $celkem > MAX_CELKEM) konec(422, ['ok' => false, 'chyba' => 'Fotografie jsou příliš velké (max. 8 MB jedna, 20 MB celkem).']);
        $typ = $finfo->file($tmp) ?: '';
        if (!isset(POVOLENE[$typ])) konec(422, ['ok' => false, 'chyba' => 'Povolené jsou jen fotografie (JPG, PNG, WebP, HEIC) a PDF.']);
        $prilohy[] = ['nazev' => 'foto-' . (count($prilohy) + 1) . '.' . POVOLENE[$typ], 'typ' => $typ, 'data' => file_get_contents($tmp)];
    }
}

// e-mail
$text = "Nová poptávka z webu lukaspecenka.cz\n\n"
    . "Jméno: $jmeno\nTelefon: $telefon\nE-mail: $email\nLokalita: " . ($lokalita ?: 'neuvedena') . "\n"
    . ($rok !== '' || $zdivo !== '' || $kde !== '' ? "Rok výstavby: " . ($rok ?: '–') . "\nTyp zdiva: " . ($zdivo ?: '–') . "\nKde se problém projevuje: " . ($kde ?: '–') . "\n" : '')
    . "\nPopis problému:\n" . ($zprava ?: 'neuveden') . "\n\n"
    . 'Přiloženo fotografií: ' . count($prilohy) . "\nOdesláno: " . date('j. n. Y H:i') . "\n"
    . 'Zdroj návštěvy: ' . ($zdroj !== '' ? $zdroj : 'přímý vstup / neznámý') . "\n";
$hranice = 'lp_' . bin2hex(random_bytes(12));
$hlavicky = 'From: =?UTF-8?B?' . base64_encode('Web lukaspecenka.cz') . '?= <' . ODESILATEL . ">\r\n"
    . 'Reply-To: ' . $email . "\r\nMIME-Version: 1.0\r\n"
    . "Content-Type: multipart/mixed; boundary=\"$hranice\"\r\n";
$telo = "--$hranice\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text));
foreach ($prilohy as $p) {
    $telo .= "--$hranice\r\nContent-Type: {$p['typ']}; name=\"{$p['nazev']}\"\r\nContent-Transfer-Encoding: base64\r\n"
        . "Content-Disposition: attachment; filename=\"{$p['nazev']}\"\r\n\r\n" . chunk_split(base64_encode($p['data']));
}
$telo .= "--$hranice--\r\n";
$predmet = '=?UTF-8?B?' . base64_encode('Poptávka průzkumu – ' . $jmeno) . '?=';

if (getenv('LP_TEST') === '1') {   // lokální test: e-mail se uloží do souboru místo odeslání
    file_put_contents(__DIR__ . '/_soukrome/test-posledni-email.eml', "To: " . PRIJEMCE . "\r\nSubject: $predmet\r\n$hlavicky\r\n$telo");
    $odeslano = true;
} else {
    $odeslano = mail(PRIJEMCE, $predmet, $telo, $hlavicky, '-f' . ODESILATEL);
}
if (!$odeslano) konec(500, ['ok' => false, 'chyba' => 'Zprávu se nepodařilo odeslat. Zavolejte prosím na +420 602 529 179.']);
konec(200, ['ok' => true]);
