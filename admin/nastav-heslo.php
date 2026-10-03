<?php
/* Nastavení hesla do administrace (jen z příkazové řádky / SSH na serveru):
   php admin/nastav-heslo.php 'nove-heslo'
   Heslo se uloží jen jako bezpečný otisk (Argon2id / bcrypt) do _soukrome/nastaveni.php. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$heslo = $argv[1] ?? '';
if (mb_strlen($heslo) < 12) { fwrite(STDERR, "Heslo musí mít aspoň 12 znaků.\n"); exit(1); }
$hash = password_hash($heslo, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
$adr = __DIR__ . '/../_soukrome';
if (!is_dir($adr)) mkdir($adr, 0700, true);
file_put_contents($adr . '/nastaveni.php', "<?php\nreturn " . var_export(['heslo_hash' => $hash, 'nastaveno' => date('c')], true) . ";\n");
chmod($adr . '/nastaveni.php', 0600);
echo "Heslo nastaveno.\n";
