<?php
/* Nastavení přístupu do administrace (jen z příkazové řádky):
   php admin/nastav-heslo.php 'nove-heslo'          … jen heslo (rozhodnutí Milana 4. 10. 2026: bez dvoufázového ověření)
   php admin/nastav-heslo.php 'nove-heslo' --2fa    … heslo + dvoufázové ověření (aplikace Authenticator), kdyby se někdy zapínalo
   Heslo se uloží jen jako otisk. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$heslo = $argv[1] ?? '';
$dvaf = in_array('--2fa', $argv, true);
$chyby = [];
if (mb_strlen($heslo) < 8) $chyby[] = 'aspoň 8 znaků';
if (!preg_match('/\p{Lu}/u', $heslo)) $chyby[] = 'velké písmeno';
if (!preg_match('/[0-9]/', $heslo)) $chyby[] = 'číslo';
if (!preg_match('/[^\p{L}0-9]/u', $heslo)) $chyby[] = 'speciální znak (např. ! ? . - _ @ #)';
if ($chyby) { fwrite(STDERR, "Heslo musí obsahovat: " . implode(', ', $chyby) . ".\n"); exit(1); }
$tajemstvi = '';
if ($dvaf) { $abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; for ($i = 0; $i < 32; $i++) $tajemstvi .= $abc[random_int(0, 31)]; }
$hash = password_hash($heslo, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
$adr = __DIR__ . '/../_soukrome';
if (!is_dir($adr)) mkdir($adr, 0700, true);
$data = ['heslo_hash' => $hash, 'nastaveno' => date('c')];
if ($dvaf) $data['totp'] = $tajemstvi;
file_put_contents($adr . '/nastaveni.php', "<?php\nreturn " . var_export($data, true) . ";\n");
chmod($adr . '/nastaveni.php', 0600);
echo "Heslo nastaveno.\n";
if ($dvaf) echo "\nDvoufázové ověření – do aplikace Authenticator přidejte účet ručně:\n  Klíč: " . implode(' ', str_split($tajemstvi, 4)) . "\n"
   . "  nebo odkazem: otpauth://totp/lukaspecenka.cz:admin?secret=$tajemstvi&issuer=lukaspecenka.cz\n";
