# Atualizações automáticas (auto-update)

O CHControl usa o **updater do Tauri**. O menu **Ajuda → Verificar atualizações**
verifica se há uma versão nova publicada, **baixa e instala sem precisar
desinstalar**, e reinicia o app.

## Como funciona

- A cada clique em "Verificar atualizações", o app consulta:
  `https://github.com/rondatrack4/CHControl---Controle-de-Acesso/releases/latest/download/latest.json`
- Se a versão do `latest.json` for maior que a instalada, ele baixa o instalador
  assinado e o executa em modo silencioso (`passive`), depois reinicia.
- A assinatura é verificada com a **chave pública** embutida em
  `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`).

## Chave de assinatura

- Chave **privada**: `src-tauri/.tauri-updater.key` (NÃO versionar — já está no `.gitignore`).
- Chave **pública**: já configurada no `tauri.conf.json`.
- Se perder a privada, os updates deixam de funcionar (só reinstalando com uma nova chave).

> Faça um backup seguro do arquivo `src-tauri/.tauri-updater.key`.

## Publicar uma nova versão

1. Suba a versão em `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `package.json`
   (ex.: `0.1.0` → `0.1.1`).
2. Compile assinando com a chave privada (PowerShell):

   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY_PATH = "$PWD\src-tauri\.tauri-updater.key"
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""   # a chave foi gerada sem senha
   npm run tauri:build
   ```

3. O build gera, além do instalador, os artefatos de update:
   - `CHControl_<versão>_x64-setup.exe` + `CHControl_<versão>_x64-setup.exe.sig`
   - `latest.json`
   (em `src-tauri/target/release/bundle/`).
4. Crie um **Release** no GitHub (tag = versão) e faça upload de **todos** esses
   arquivos, incluindo o `latest.json` e o `.sig`.
5. Pronto: os clientes existentes atualizam sozinhos pelo menu, sem reinstalar.
