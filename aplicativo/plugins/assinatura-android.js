/**
 * Assinatura do Android (versão de lojas). A chave de envio NUNCA fica no
 * repositório: o build lê o arquivo e as senhas de variáveis de ambiente
 * (segredos do GitHub). Sem elas, gera APK/AAB sem assinatura, para assinar à parte.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const BLOCO = `
    signingConfigs {
        release {
            if (System.getenv("IECB_UPLOAD_STORE_FILE")) {
                storeFile file(System.getenv("IECB_UPLOAD_STORE_FILE"))
                storePassword System.getenv("IECB_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("IECB_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("IECB_UPLOAD_KEY_PASSWORD")
            }
        }`;

module.exports = function assinaturaAndroid(config) {
  return withAppBuildGradle(config, (c) => {
    let g = c.modResults.contents;
    if (g.includes("IECB_UPLOAD_STORE_FILE")) return c;
    g = g.replace(/signingConfigs\s*\{/, BLOCO);
    // no tipo release, usa a chave da igreja quando existir; senão, sai sem assinatura
    g = g.replace(/(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/, `$1signingConfig System.getenv("IECB_UPLOAD_STORE_FILE") ? signingConfigs.release : null`);
    c.modResults.contents = g;
    return c;
  });
};
