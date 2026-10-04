<?php
/* Nastavení přístupu do administrace (jen z příkazové řádky):
   php admin/nastav-heslo.php 'nove-heslo'          … heslo + nové dvoufázové ověření
   Heslo se uloží jen jako otisk; vypíše se tajný klíč pro aplikaci Google/Microsoft Authenticator. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$heslo = $argv[1] ?? '';
if (mb_strlen($heslo) < 12) { fwrite(STDERR, "Heslo musí mít aspoň 12 znaků.\n"); exit(1); }
$abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $tajemstvi = '';
for ($i = 0; $i < 32; $i++) $tajemstvi .= $abc[random_int(0, 31)];
$hash = password_hash($heslo, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
$adr = __DIR__ . '/../_soukrome';
if (!is_dir($adr)) mkdir($adr, 0700, true);
file_put_contents($adr . '/nastaveni.php', "<?php\nreturn " . var_export(['heslo_hash' => $hash, 'totp' => $tajemstvi, 'nastaveno' => date('c')], true) . ";\n");
chmod($adr . '/nastaveni.php', 0600);
echo "Heslo nastaveno.\n\nDvoufázové ověření – do aplikace Authenticator přidejte účet ručně:\n  Klíč: " . implode(' ', str_split($tajemstvi, 4)) . "\n"
   . "  nebo odkazem: otpauth://totp/lukaspecenka.cz:admin?secret=$tajemstvi&issuer=lukaspecenka.cz\n";
